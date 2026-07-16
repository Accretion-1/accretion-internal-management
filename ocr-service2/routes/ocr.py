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

from fastapi import APIRouter, UploadFile, File
from services.ocr_service import ocr_service
import logging
import shutil
import time
import uuid
import os

log = logging.getLogger(__name__)

router = APIRouter()


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

    save_master_start = time.perf_counter()
    try:
        ocr_service.save_master_data()
    except Exception as error:
        log.warning("Failed to save master data: %s", error)
    save_master_elapsed = time.perf_counter() - save_master_start

    texts = [
        line.strip()
        for line in record.get("_raw_ocr_text", "").splitlines()
        if line.strip()
    ]

    total_elapsed = time.perf_counter() - request_start
    log.info(
        "POST / for %r done in %.2fs (upload_save=%.2fs, process_image=%s, master_data_save=%.2fs)",
        file.filename, total_elapsed, save_elapsed, record.get("_timing_ms"), save_master_elapsed,
    )

    return {
        "count": len(texts),
        "texts": texts,
        "record": record
    }
