#!/usr/bin/env python3
"""
api.py

Lightweight FastAPI wrapper around the same alignment + OCR + field-parsing
logic benchmark.py uses -- upload a single slip photo over HTTP and get
back the extracted text + parsed fields, same output shape as production's
ocr-service/routes/ocr.py, but with the backend selectable via env var so
you can hit either "native" or "llama-cpp-server" the same way (curl,
Postman, etc.) instead of only via the CLI batch script.

This is a TEST HARNESS, not a production deployment target -- it does not
touch ocr-service/, only read-imports its aligner.py/field_parser.py.

The uploaded image is never written to a persistent location -- it's held
in memory and briefly staged in a temp file only for the duration of the
alignment call, then discarded. Only the extracted OCR data is returned.

Run (native backend, current production default):
    export OCR_BACKEND=native
    uvicorn api:app --host 0.0.0.0 --port 8001

Run (llama-cpp-server backend -- run ./setup_llama_server.sh first):
    export OCR_BACKEND=llama-cpp-server
    export OCR_SERVER_URL=http://127.0.0.1:8081/v1
    export OCR_CPU_THREADS=1   # PaddleOCRVL's own in-process threads for
                                # the layout model; llama-server's own
                                # --threads flag handles the VL step
    uvicorn api:app --host 0.0.0.0 --port 8001

Then, from anywhere that can reach the VPS:
    curl -X POST http://<vps-ip>:8001/ocr -F "file=@/path/to/slip.jpg"
"""
import glob
import hashlib
import os
import sys
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, UploadFile, File

PROD_FILES3 = Path(__file__).resolve().parent.parent / "ocr-service" / "files 3"
if str(PROD_FILES3) not in sys.path:
    sys.path.insert(0, str(PROD_FILES3))

from aligner import align_slip           # noqa: E402  (production code, read-only)
from field_parser import parse_ocr_text  # noqa: E402  (production code, read-only)

BACKEND = os.environ.get("OCR_BACKEND", "native")
SERVER_URL = os.environ.get("OCR_SERVER_URL", "http://127.0.0.1:8081/v1")
_threads_env = os.environ.get("OCR_CPU_THREADS")
CPU_THREADS = int(_threads_env) if _threads_env else None

app = FastAPI(title=f"OCR benchmark API [{BACKEND}] (test harness, not production)")

_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from paddleocr import PaddleOCRVL

        kwargs = {"pipeline_version": "v1.6"}
        if BACKEND == "llama-cpp-server":
            kwargs["vl_rec_backend"] = "llama-cpp-server"
            kwargs["vl_rec_server_url"] = SERVER_URL
        if CPU_THREADS:
            kwargs["cpu_threads"] = CPU_THREADS
        _pipeline = PaddleOCRVL(**kwargs)
    return _pipeline


@app.get("/")
def home():
    return {"status": "running", "backend": BACKEND, "note": "test harness -- see ocr-service2/README.md"}


@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)):
    contents = await file.read()

    # Echoed back in every response so a result can be checked against what
    # was actually uploaded -- catches backend/session state bugs (e.g. a
    # stale connection returning a previous request's cached response)
    # instantly instead of requiring manual md5 forensics after the fact.
    image_sha256 = hashlib.sha256(contents).hexdigest()

    # align_slip() needs a path (it loads via PIL/cv2), so the upload is
    # written to a temp file only for the duration of that call, then
    # deleted -- the image is never persisted anywhere on disk.
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    t0 = time.perf_counter()
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp_upload:
        tmp_upload.write(contents)
        tmp_upload.flush()
        warped, align_status = align_slip(tmp_upload.name)
    align_s = time.perf_counter() - t0

    if warped is None:
        return {
            "status": "failed_alignment",
            "backend": BACKEND,
            "uploaded_filename": file.filename,
            "image_sha256": image_sha256,
            "alignment_status": align_status,
            "timing_seconds": {"alignment": round(align_s, 2)},
        }

    import cv2

    pipeline = _get_pipeline()
    t0 = time.perf_counter()
    with tempfile.TemporaryDirectory() as tmp:
        aligned_path = os.path.join(tmp, "aligned.jpg")
        cv2.imwrite(aligned_path, warped)
        output = pipeline.predict(aligned_path)
        with tempfile.TemporaryDirectory() as tmp2:
            for res in output:
                res.save_to_markdown(save_path=tmp2)
            md_files = glob.glob(os.path.join(tmp2, "*.md"))
            raw_text = "\n".join(open(f, encoding="utf-8").read() for f in md_files)
    ocr_s = time.perf_counter() - t0

    fields = parse_ocr_text(raw_text)
    texts = [line.strip() for line in raw_text.splitlines() if line.strip()]

    return {
        "status": "ok",
        "backend": BACKEND,
        "uploaded_filename": file.filename,
        "image_sha256": image_sha256,
        "alignment_status": align_status,
        "timing_seconds": {"alignment": round(align_s, 2), "ocr": round(ocr_s, 2)},
        "count": len(texts),
        "texts": texts,
        "fields": fields,
        "raw_text": raw_text,
    }
