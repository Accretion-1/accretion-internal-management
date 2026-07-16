"""
ocr_engine.py

Thin wrapper around PaddleOCR-VL's document-parsing pipeline. Loads the
model once (it's slow to initialize) and reuses it across every slip in
a batch/service run.

Forked from ocr-service/files 3/ocr_engine.py -- the only intentional
difference is the backend: this copy talks to a locally-running
llama-server (quantized GGUF weights) instead of running fp32 weights
in-process, per the benchmarked ~20x speedup on real slip photos (see
ocr-service2/report_native.json vs report_llama_cpp_server.json and
compare_reports.py's output). Configurable via env vars so the same code
can fall back to the in-process "native" backend without edits.
"""

import glob
import logging
import os
import tempfile
import time

log = logging.getLogger(__name__)

_pipeline = None  # lazy singleton -- model load is expensive, do it once

BACKEND = os.environ.get("OCR_BACKEND", "llama-cpp-server")
SERVER_URL = os.environ.get("OCR_SERVER_URL", "http://127.0.0.1:8081/v1")
_threads_env = os.environ.get("OCR_CPU_THREADS")
CPU_THREADS = int(_threads_env) if _threads_env else None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        start = time.perf_counter()
        from paddleocr import PaddleOCRVL

        kwargs = {"pipeline_version": "v1.6"}
        if BACKEND == "llama-cpp-server":
            kwargs["vl_rec_backend"] = "llama-cpp-server"
            kwargs["vl_rec_server_url"] = SERVER_URL
        if CPU_THREADS:
            kwargs["cpu_threads"] = CPU_THREADS

        _pipeline = PaddleOCRVL(**kwargs)
        log.info("PaddleOCR-VL model loaded in %.2fs (backend=%s, one-time cost, first request only)",
                  time.perf_counter() - start, BACKEND)
    return _pipeline


def run_ocr(image_path: str) -> str:
    """Runs PaddleOCR-VL on an image and returns the recognized text as a
    single string, in reading order."""
    pipeline = _get_pipeline()

    predict_start = time.perf_counter()
    output = pipeline.predict(image_path)
    predict_elapsed = time.perf_counter() - predict_start

    with tempfile.TemporaryDirectory() as tmp_dir:
        for res in output:
            res.save_to_markdown(save_path=tmp_dir)
        md_files = glob.glob(os.path.join(tmp_dir, "*.md"))
        text = "\n".join(open(f, encoding="utf-8").read() for f in md_files)

    log.info("PaddleOCR-VL inference took %.2fs for %s (backend=%s)", predict_elapsed, image_path, BACKEND)
    return text
