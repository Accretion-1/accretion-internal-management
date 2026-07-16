"""
app.py

Production entrypoint for this service -- structured identically to
ocr-service/app.py (same router mount, same GET "/" health payload shape,
same POST "/" OCR contract) so it's a drop-in replacement for
ocr-service from godown_slips_cron.js's point of view.

Run: uvicorn app:app --host 0.0.0.0 --port 8000

Not to be confused with api.py in this same directory, which is a
separate lightweight test-harness endpoint (port 8001 by convention) used
for manual backend comparisons -- see README.md.
"""

import logging

from fastapi import FastAPI
from routes.ocr import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Goods-Outward Slip OCR API (llama-cpp-server backend)"
)


app.include_router(router)


@app.get("/")
def home():

    return {
        "status": "running",
        "engine": "Slip OCR Pipeline (alignment + PaddleOCR-VL via llama-cpp-server + parsing)"
    }
