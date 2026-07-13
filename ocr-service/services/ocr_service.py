from pathlib import Path
import sys


FILES3_DIR = Path(__file__).resolve().parents[1] / "files 3"
if str(FILES3_DIR) not in sys.path:
    sys.path.insert(0, str(FILES3_DIR))

from pipeline import SlipPipeline  # noqa: E402


class OCRService:

    def __init__(self):
        print("Loading slip OCR pipeline...")

        self.pipeline = SlipPipeline(
            master_data_path=str(FILES3_DIR / "master_data.json")
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
