"""
pipeline.py

Orchestrates the full flow: photo -> aligned image -> OCR text -> parsed
fields -> validated/corrected fields (with master-list auto-learning and
date cross-checking) -> one JSON record ready for DB insert.
"""

import logging
import re
import time
from datetime import datetime

from aligner import align_slip
from ocr_engine import run_ocr
from field_parser import parse_ocr_text
from master_data import MasterDataStore
from date_utils import validate_date_field, cross_check_dates, normalize_date

log = logging.getLogger(__name__)

KEY_OCR_LABELS = (
    "date",
    "godown name",
    "please load",
    "vehicle no",
    "supply to",
    "material load on",
    "loading slip",
)

QUALITY_FIELDS = (
    "slip_no",
    "date",
    "godown_name",
    "bags_qty",
    "material_type",
    "block_no",
    "week_no",
    "vehicle_no",
    "di_no",
    "supply_to",
    "material_load_on",
)

# ---------------------------------------------------------------------------
# Field-format validators, gating what's allowed to become a master-list
# candidate at all (keeps obviously-garbled OCR reads out of the master file)
# ---------------------------------------------------------------------------

VEHICLE_NO_RE = re.compile(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}$")
VEHICLE_NO_EMBEDDED_RE = re.compile(r"[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}")


def is_valid_vehicle_no(v: str) -> bool:
    return bool(VEHICLE_NO_RE.match(v.replace(" ", "").upper()))


def normalize_vehicle_no(raw_value: str) -> str:
    compact = re.sub(r"[^A-Z0-9]", "", (raw_value or "").upper())
    if not compact:
        return ""
    if VEHICLE_NO_RE.match(compact):
        return compact

    match = VEHICLE_NO_EMBEDDED_RE.search(compact)
    if match:
        return match.group(0)

    for end in range(len(compact), 0, -1):
        candidate = compact[:end]
        if VEHICLE_NO_RE.match(candidate):
            return candidate

    return compact


def is_nonempty_text(v: str) -> bool:
    text = v.strip()
    if len(text) < 2:
        return False
    if "<" in text or ">" in text:
        return False
    return True


def is_numeric(v: str) -> bool:
    return v.strip().isdigit()


def _score_ocr_candidate(raw_text: str, raw_fields: dict) -> int:
    nonempty_fields = sum(1 for name in QUALITY_FIELDS if (raw_fields.get(name) or "").strip())
    numeric_bonus = sum(
        1
        for name in ("slip_no", "bags_qty", "block_no", "week_no", "di_no")
        if (raw_fields.get(name) or "").strip()
    )
    label_hits = sum(1 for label in KEY_OCR_LABELS if label in raw_text.lower())
    return (nonempty_fields * 10) + (numeric_bonus * 2) + label_hits


def _needs_rotation_retry(raw_text: str, raw_fields: dict) -> bool:
    nonempty_fields = sum(1 for name in QUALITY_FIELDS if (raw_fields.get(name) or "").strip())
    label_hits = sum(1 for label in KEY_OCR_LABELS if label in raw_text.lower())
    return nonempty_fields < 4 or label_hits < 3


# Fields that get FUZZY master-list validation/correction/auto-learning.
MASTER_FIELD_CONFIG = {
    "godown_name":   {"seed": [], "validator": is_nonempty_text},
    "supply_to":     {"seed": [], "validator": is_nonempty_text},
    "material_type": {"seed": ["PPC", "WPC", "SUPER"], "validator": is_nonempty_text},
    "vehicle_no":    {"seed": [], "validator": is_valid_vehicle_no, "high_threshold": 80.0, "candidate_threshold": 80.0},
}

# Fields that just need "is this a number" validation, no master list.
NUMERIC_FIELDS = ["bags_qty", "block_no", "week_no", "di_no"]

DATE_FIELDS = ["date", "material_load_on"]

# Exact-match-only fields (no fuzzy correction) -- still need to be in
# field_configs so MasterDataStore loads/persists them across restarts,
# just kept out of MASTER_FIELD_CONFIG so they never enter the fuzzy loop.
#
# slip_no stays exact-match tracking, while vehicle_no is now fuzzy-matched
# through MASTER_FIELD_CONFIG after OCR normalization.
EXACT_MATCH_FIELD_CONFIG = {
    "slip_no":    {"high_threshold": 101},  # >100 = fuzzy match can never fire
}


class SlipPipeline:
    def __init__(self, master_data_path: str = "master_data.json"):
        # NOTE: pass a COPY of the merged config, not a shared reference --
        # MasterDataStore stores this dict as-is, and mutating a module-level
        # constant in place would leak state across every SlipPipeline
        # instance in the process.
        merged_config = dict(MASTER_FIELD_CONFIG, **EXACT_MATCH_FIELD_CONFIG)
        self.store = MasterDataStore(master_data_path, field_configs=merged_config)  # never fuzzy-match

    def process_image(self, image_path: str) -> dict:
        record = {"_source_photo": image_path, "_flagged_fields": [], "_notes": []}
        timing_ms = {}
        stage_start = time.perf_counter()

        def _mark(stage_name):
            nonlocal stage_start
            now = time.perf_counter()
            timing_ms[stage_name] = round((now - stage_start) * 1000, 1)
            stage_start = now

        warped, align_status = align_slip(image_path)
        record["_alignment_status"] = align_status
        _mark("alignment")
        if warped is None:
            record["_status"] = "failed_alignment"
            record["_flagged_fields"] = ["*ALL* -- alignment failed, manual entry needed"]
            record["_timing_ms"] = timing_ms
            return record

        import cv2
        import tempfile, os
        with tempfile.TemporaryDirectory() as tmp:
            aligned_path = os.path.join(tmp, "aligned.jpg")
            cv2.imwrite(aligned_path, warped)
            raw_text = run_ocr(aligned_path)
            raw_fields = parse_ocr_text(raw_text)
            best_candidate = {
                "rotation": 0,
                "raw_text": raw_text,
                "raw_fields": raw_fields,
                "score": _score_ocr_candidate(raw_text, raw_fields),
            }

            if _needs_rotation_retry(raw_text, raw_fields):
                rotation_attempts = (
                    ("clockwise_90", cv2.ROTATE_90_CLOCKWISE),
                    ("counterclockwise_90", cv2.ROTATE_90_COUNTERCLOCKWISE),
                    ("180", cv2.ROTATE_180),
                )
                for rotation_name, rotation_code in rotation_attempts:
                    rotated = cv2.rotate(warped, rotation_code)
                    rotated_path = os.path.join(tmp, f"aligned_{rotation_name}.jpg")
                    cv2.imwrite(rotated_path, rotated)
                    rotated_text = run_ocr(rotated_path)
                    rotated_fields = parse_ocr_text(rotated_text)
                    rotated_score = _score_ocr_candidate(rotated_text, rotated_fields)
                    if rotated_score > best_candidate["score"]:
                        best_candidate = {
                            "rotation": rotation_name,
                            "raw_text": rotated_text,
                            "raw_fields": rotated_fields,
                            "score": rotated_score,
                        }
                    if rotated_score >= 45:
                        break

            raw_text = best_candidate["raw_text"]
            raw_fields = best_candidate["raw_fields"]
            record["_ocr_rotation"] = best_candidate["rotation"]
            record["_ocr_quality_score"] = best_candidate["score"]
        _mark("ocr_inference")
        record["_raw_ocr_text"] = raw_text
        record["_raw_fields"] = raw_fields
        _mark("field_parsing")

        final_fields = {}

        # -- master-list fields (fuzzy-corrected against trusted master data only) --
        for name, cfg in MASTER_FIELD_CONFIG.items():
            result = self.store.resolve(name, raw_fields.get(name, ""), mutate=False)
            final_fields[name] = result["value"]
            if result["status"] in ("new_candidate", "rejected_invalid_format", "empty",
                                     "candidate_incremented"):
                record["_flagged_fields"].append(name)
            if result["status"] == "new_candidate":
                record["_notes"].append(
                    f"'{result['value']}' is not in trusted master data for {name} -- manual review needed"
                )
            record[f"_{name}_status"] = result["status"]

        # -- vehicle_no: normalized first, then matched against trusted master
        # data with the configured threshold --
        raw_vehicle = normalize_vehicle_no(raw_fields.get("vehicle_no", ""))
        vehicle_result = self.store.resolve("vehicle_no", raw_vehicle, mutate=False)
        final_fields["vehicle_no"] = vehicle_result["value"]
        if vehicle_result["status"] in ("new_candidate", "rejected_invalid_format", "empty", "candidate_incremented"):
            record["_flagged_fields"].append("vehicle_no")
        if vehicle_result["status"] == "new_candidate":
            record["_notes"].append(
                f"'{vehicle_result['value']}' is not in trusted master data for vehicle_no -- manual review needed"
            )
        if not raw_vehicle:
            final_fields["vehicle_no"] = ""
        record["_vehicle_no_status"] = vehicle_result["status"]

        # -- slip_no: exact-match duplicate detection --
        raw_slip_no = raw_fields.get("slip_no", "").strip()
        slip_list = self.store.get("slip_no")
        if not raw_slip_no:
            final_fields["slip_no"] = ""
            record["_flagged_fields"].append("slip_no")
            record["_slip_no_status"] = "empty"
        elif raw_slip_no in slip_list.confirmed:
            final_fields["slip_no"] = raw_slip_no
            record["_flagged_fields"].append("slip_no")
            record["_slip_no_status"] = "possible_duplicate_slip"
            record["_notes"].append(f"slip_no '{raw_slip_no}' was already processed before -- "
                                     f"check this isn't the same slip uploaded twice")
        else:
            final_fields["slip_no"] = raw_slip_no
            record["_slip_no_status"] = "new_slip_no"

        # -- numeric fields --
        for name in NUMERIC_FIELDS:
            raw = raw_fields.get(name, "").strip()
            final_fields[name] = raw
            if not raw:
                record["_flagged_fields"].append(name)
                record[f"_{name}_status"] = "empty"
            elif not is_numeric(raw):
                record["_flagged_fields"].append(name)
                record[f"_{name}_status"] = "invalid_format"
            else:
                record[f"_{name}_status"] = "valid"

        # -- date fields --
        for name in DATE_FIELDS:
            raw = raw_fields.get(name, "")
            result = validate_date_field(raw)
            final_fields[name] = result["value"]
            record[f"_{name}_status"] = result["status"]
            if result["status"] != "valid_date":
                record["_flagged_fields"].append(name)

        ok, detail = cross_check_dates(raw_fields.get("date", ""), raw_fields.get("material_load_on", ""))
        record["_date_cross_check"] = detail
        if not ok:
            for name in DATE_FIELDS:
                if name not in record["_flagged_fields"]:
                    record["_flagged_fields"].append(name)
            record["_notes"].append(f"date and material_load_on disagree: {detail}")
        _mark("validation")

        record.update(final_fields)
        record["_status"] = "needs_review" if record["_flagged_fields"] else "ok"
        record["_timing_ms"] = timing_ms
        total_ms = sum(timing_ms.values())
        log.info("process_image(%s) took %.0fms total -- breakdown: %s",
                  image_path, total_ms, timing_ms)
        return record

    def replace_master_data(self, payload: dict, trusted_only: bool = True):
        self.store.replace_confirmed(payload, clear_candidates=trusted_only)
        self.store.save(trusted_only=trusted_only)
