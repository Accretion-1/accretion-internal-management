"""
routes/ocr.py

Mirrors ocr-service/routes/ocr.py exactly -- same route path ("/"), same
request shape (multipart field "file"), same response shape
({count, texts, record}), same upload-persistence and save_master_data()
behavior. This is what makes this service a drop-in replacement for
ocr-service from godown_slips_cron.js's point of view -- it reads
response.data.record._raw_fields / response.data.record._raw_ocr_text,
and neither of those paths change here.

The only actual difference from ocr-service is which OCR backend runs
underneath (see ocr_pipeline/ocr_engine.py) -- everything in this file is
intentionally identical to production, not reimplemented.
"""

from typing import Optional

from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from services.ocr_service import ocr_service
import logging
import os
import shutil
import time
import uuid

log = logging.getLogger(__name__)

router = APIRouter()

SYNC_FIELD_ALLOWLIST = {"godown_name", "supply_to", "material_type", "vehicle_no", "slip_no"}
OCR_MASTER_DATA_SYNC_TOKEN = "ultratech_master_sync_2026_very_secret_abc123"


def _require_sync_token_if_configured(token: Optional[str]):
    expected_token = OCR_MASTER_DATA_SYNC_TOKEN.strip()
    if expected_token and token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid master-data sync token")


def _filter_master_data_payload(payload: dict) -> dict:
    filtered_payload = {}
    for field_name, field_payload in (payload or {}).items():
        if field_name not in SYNC_FIELD_ALLOWLIST:
            continue
        confirmed_values = []
        if isinstance(field_payload, dict):
            confirmed_values = field_payload.get("confirmed", [])
        elif isinstance(field_payload, list):
            confirmed_values = field_payload
        else:
            confirmed_values = []

        normalized_values = [
            str(value).strip()
            for value in confirmed_values
            if str(value or "").strip()
        ]
        filtered_payload[field_name] = {
            "confirmed": normalized_values,
            "candidates": {},
        }
    return filtered_payload


@router.post("/")
async def run_ocr(
    file: UploadFile = File(...)
):

    request_start = time.perf_counter()

    os.makedirs(
        "uploads",
        exist_ok=True
    )


    file_path = (
        f"uploads/{uuid.uuid4()}_{file.filename}"
    )


    save_start = time.perf_counter()
    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )
    save_elapsed = time.perf_counter() - save_start

    record = ocr_service.process_image(file_path)

    texts = [
        line.strip()
        for line in record.get("_raw_ocr_text", "").splitlines()
        if line.strip()
    ]

    total_elapsed = time.perf_counter() - request_start
    log.info(
        "POST / for %r done in %.2fs (upload_save=%.2fs, process_image=%s, master_data_mode=trusted-read-only)",
        file.filename, total_elapsed, save_elapsed, record.get("_timing_ms"),
    )

    return {
        "count": len(texts),
        "texts": texts,
        "record": record
    }

@router.post("/master-data/upload")
async def upload_master_data(
    payload: dict,
    x_ocr_sync_token: Optional[str] = Header(default=None),
):
    _require_sync_token_if_configured(x_ocr_sync_token)

    filtered_payload = _filter_master_data_payload(payload.get("master_data") or {})
    ocr_service.replace_master_data(filtered_payload, trusted_only=True)

    log.info(
        "Uploaded trusted master-data document with fields: %s",
        sorted(filtered_payload.keys()),
    )

    return {
        "success": True,
        "updated_fields": sorted(filtered_payload.keys()),
        "message": "Master data uploaded successfully",
    }
