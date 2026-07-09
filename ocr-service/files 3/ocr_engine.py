"""
ocr_engine.py

Thin wrapper around PaddleOCR-VL's document-parsing pipeline. Loads the
model once (it's slow to initialize) and reuses it across every slip in
a batch/service run.

If your developer's install is classic PaddleOCR (PP-OCR / PaddleOCR's
`PaddleOCR` class, not `PaddleOCRVL`) rather than PaddleOCR-VL, swap the
body of `run_ocr()` below: PP-OCR returns per-word boxes + text instead
of one reading-order text blob, so you'd join the recognized words in
top-to-bottom, left-to-right order into a single string before passing it
to field_parser.parse_ocr_text() -- the rest of the pipeline doesn't care
which OCR engine produced the text, only that it gets a string.
"""

import glob
import os
import tempfile

_pipeline = None  # lazy singleton -- model load is expensive, do it once


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from paddleocr import PaddleOCRVL
        _pipeline = PaddleOCRVL(pipeline_version="v1.6")
    return _pipeline


def run_ocr(image_path: str) -> str:
    """Runs PaddleOCR-VL on an image and returns the recognized text as a
    single string, in reading order."""
    pipeline = _get_pipeline()
    output = pipeline.predict(image_path)

    with tempfile.TemporaryDirectory() as tmp_dir:
        for res in output:
            res.save_to_markdown(save_path=tmp_dir)
        md_files = glob.glob(os.path.join(tmp_dir, "*.md"))
        text = "\n".join(open(f, encoding="utf-8").read() for f in md_files)
    return text
