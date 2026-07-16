"""
ocr_service.py

Mirrors ocr-service/services/ocr_service.py exactly, pointed at this
service's own ocr_pipeline/ directory (forked from ocr-service/files 3/,
see ocr_pipeline/ocr_engine.py for the one intentional difference: the
llama-cpp-server backend instead of in-process fp32 weights).
"""

from pathlib import Path
import sys


PIPELINE_DIR = Path(__file__).resolve().parents[1] / "ocr_pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from pipeline import SlipPipeline  # noqa: E402


class OCRService:

    def __init__(self):
        print("Loading slip OCR pipeline...")

        self.pipeline = SlipPipeline(
            master_data_path=str(PIPELINE_DIR / "master_data.json")
        )

        print("Slip OCR pipeline ready")

    @staticmethod
    def _text_lines(raw_text: str) -> list[str]:
        return [
            line.strip()
            for line in (raw_text or "").splitlines()
            if line.strip()
        ]

    def process_image(self, image_path: str) -> dict:
        return self.pipeline.process_image(image_path)

    def extract_text(self, image_path: str) -> list[str]:
        record = self.process_image(image_path)
        return self._text_lines(record.get("_raw_ocr_text", ""))

    def save_master_data(self):
        self.pipeline.save_master_data()


ocr_service = OCRService()
