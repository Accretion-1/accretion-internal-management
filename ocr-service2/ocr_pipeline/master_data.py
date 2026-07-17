"""
master_data.py

Persistent master-list validation + safe auto-learning for repeating
fields (godown names, transporters, vehicle numbers, ...).

WHY TWO-TIER (candidate -> confirmed) INSTEAD OF ADDING IMMEDIATELY
---------------------------------------------------------------------
Naively adding every new-looking value straight into the trusted list is
dangerous: a single bad OCR read becomes permanently "known good" data,
and future genuinely-correct reads that are similar to that garbage value
can get auto-corrected TOWARD it. So:

  - CONFIRMED values are used to correct new OCR reads (the trusted list).
  - CANDIDATE values are things seen that don't match anything confirmed.
    They are tracked but NOT used for correction yet.
  - A candidate is promoted to confirmed once it's been seen
    `promote_after` times (default 2) -- i.e. it showed up identically (or
    near-identically) on more than one separate slip, which a one-off OCR
    glitch is unlikely to do -- OR a human explicitly confirms it.

This means the master file genuinely gets smarter as you process more
slips, without a single misread ever being able to silently corrupt it.
"""

import json
import os
import shutil
import time
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Callable, Optional

try:
    from rapidfuzz import fuzz, process
    _HAS_RAPIDFUZZ = True
except ImportError:
    _HAS_RAPIDFUZZ = False


def _score(a: str, b: str) -> float:
    if _HAS_RAPIDFUZZ:
        return fuzz.ratio(a.lower(), b.lower())
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() * 100


def _best_match(raw: str, candidates: list):
    """Returns (matched_value, score) for the closest string in `candidates`,
    or (None, 0) if candidates is empty."""
    if not candidates:
        return None, 0
    if _HAS_RAPIDFUZZ:
        lower_map = {c.lower(): c for c in candidates}
        m = process.extractOne(raw.lower(), lower_map.keys(), scorer=fuzz.ratio)
        return (lower_map[m[0]], m[1]) if m else (None, 0)
    best = max(candidates, key=lambda c: _score(raw, c))
    return best, _score(raw, best)


HTML_ARTIFACT_RE = re.compile(r"</?(?:table|thead|tbody|tfoot|tr|td|th|div|span|p|br)\b|<[^>]+>", re.IGNORECASE)


def _is_valid_candidate_value(value: str) -> bool:
    text = (value or "").strip()
    if not text:
        return False
    if HTML_ARTIFACT_RE.search(text):
        return False
    return True


@dataclass
class MasterList:
    """Master data for a single field (e.g. all known godown names)."""
    name: str
    confirmed: set = field(default_factory=set)
    candidates: dict = field(default_factory=dict)  # value -> {"count", "first_seen", "last_seen"}
    high_threshold: float = 85.0     # confident enough to auto-correct
    candidate_threshold: float = 80.0  # confident enough to bump an existing candidate's count
    promote_after: int = 2           # times a candidate must recur before becoming trusted
    validator: Optional[Callable[[str], bool]] = None  # gate before tracking as a candidate

    def resolve(self, raw: str, mutate: bool = True) -> dict:
        """Look up/learn from a raw OCR value. Returns a result dict with
        keys: value, status, score. Mutates candidate/confirmed state --
        call MasterDataStore.save() after a batch of these to persist."""
        raw = (raw or "").strip()
        if not raw:
            return {"value": "", "status": "empty", "score": 0}

        matched, score = _best_match(raw, list(self.confirmed))
        if matched and score >= self.high_threshold:
            return {"value": matched, "status": "corrected" if matched != raw else "confirmed", "score": score}

        if not mutate:
            if self.validator is not None and not self.validator(raw):
                return {"value": raw, "status": "rejected_invalid_format", "score": 0}
            if not _is_valid_candidate_value(raw):
                return {"value": raw, "status": "rejected_invalid_format", "score": 0}
            return {"value": raw, "status": "new_candidate", "score": 0}

        cand_matched, cand_score = _best_match(raw, list(self.candidates.keys()))
        if cand_matched and cand_score >= self.candidate_threshold:
            entry = self.candidates[cand_matched]
            entry["count"] += 1
            entry["last_seen"] = time.time()
            if entry["count"] >= self.promote_after:
                self.confirmed.add(cand_matched)
                del self.candidates[cand_matched]
                return {"value": cand_matched, "status": "promoted_to_confirmed", "score": cand_score}
            return {"value": raw, "status": "candidate_incremented", "score": cand_score,
                     "candidate_count": entry["count"]}

        # Genuinely new value -- gate through the validator (if any) before tracking it at all,
        # so malformed reads never even become candidates.
        if self.validator is not None and not self.validator(raw):
            return {"value": raw, "status": "rejected_invalid_format", "score": 0}

        if not _is_valid_candidate_value(raw):
            return {"value": raw, "status": "rejected_invalid_format", "score": 0}

        self.candidates[raw] = {"count": 1, "first_seen": time.time(), "last_seen": time.time()}
        return {"value": raw, "status": "new_candidate", "score": 0}

    def confirm(self, value: str):
        """Human-confirm a value immediately, skipping the recurrence wait."""
        value = value.strip()
        self.candidates.pop(value, None)
        self.confirmed.add(value)

    def confirm_many(self, values: list[str]) -> int:
        added_count = 0
        for value in values:
            text = (value or "").strip()
            if not text:
                continue
            if self.validator is not None and not self.validator(text):
                continue
            if not _is_valid_candidate_value(text):
                continue
            if text not in self.confirmed:
                added_count += 1
            self.confirm(text)
        return added_count

    def to_dict(self, trusted_only: bool = False) -> dict:
        cleaned_candidates = {} if trusted_only else {
            value: meta
            for value, meta in self.candidates.items()
            if _is_valid_candidate_value(value)
        }
        return {"confirmed": sorted(self.confirmed), "candidates": cleaned_candidates}

    @classmethod
    def from_dict(cls, name: str, data: dict, **kwargs) -> "MasterList":
        ml = cls(name=name, **kwargs)
        ml.confirmed = set(data.get("confirmed", []))
        ml.candidates = {
            value: meta
            for value, meta in data.get("candidates", {}).items()
            if _is_valid_candidate_value(value)
        }
        return ml


class MasterDataStore:
    """Loads/saves all MasterLists as one JSON file, with atomic writes so a
    crash mid-save can't corrupt the file."""

    def __init__(self, path: str, field_configs: dict = None):
        """field_configs: {field_name: {"high_threshold":.., "validator": fn, ...}}"""
        self.path = path
        self.field_configs = field_configs or {}
        self.lists: dict[str, MasterList] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        else:
            raw = {}
        for name, cfg in self.field_configs.items():
            data = raw.get(name, {})
            self.lists[name] = MasterList.from_dict(name, data, **{
                k: v for k, v in cfg.items() if k != "seed"
            })
            if not data and cfg.get("seed"):
                self.lists[name].confirmed = set(cfg["seed"])

    def save(self, trusted_only: bool = False):
        tmp_path = self.path + ".tmp"
        payload = {name: ml.to_dict(trusted_only=trusted_only) for name, ml in self.lists.items()}
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        shutil.move(tmp_path, self.path)  # atomic on POSIX

    def get(self, field_name: str) -> MasterList:
        return self.lists[field_name]

    def resolve(self, field_name: str, raw: str, mutate: bool = True) -> dict:
        return self.lists[field_name].resolve(raw, mutate=mutate)

    def confirm(self, field_name: str, value: str):
        if field_name not in self.lists:
            raise KeyError(f"Unknown master-data field: {field_name}")
        self.lists[field_name].confirm(value)

    def confirm_many(self, field_name: str, values: list[str]) -> int:
        if field_name not in self.lists:
            raise KeyError(f"Unknown master-data field: {field_name}")
        return self.lists[field_name].confirm_many(values)

    def export(self, trusted_only: bool = False) -> dict:
        return {
            name: master_list.to_dict(trusted_only=trusted_only)
            for name, master_list in self.lists.items()
        }

    def replace_confirmed(self, payload: dict, clear_candidates: bool = True):
        for field_name, master_list in self.lists.items():
            field_payload = payload.get(field_name, {}) if isinstance(payload, dict) else {}
            confirmed_values = field_payload.get("confirmed", []) if isinstance(field_payload, dict) else []
            seed_values = self.field_configs.get(field_name, {}).get("seed", [])
            master_list.confirmed = set(seed_values)
            if clear_candidates:
                master_list.candidates = {}
            master_list.confirm_many(confirmed_values)
