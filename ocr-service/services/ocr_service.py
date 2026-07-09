from paddleocr import PaddleOCRVL


class OCRService:

    def __init__(self):
        print("Loading PaddleOCR-VL-1.6...")
        
        self.ocr = PaddleOCRVL()

        print("PaddleOCR-VL Ready")


    def extract_text(self, image_path):

        output = self.ocr.predict(image_path)

        texts = []

        for page in output:

            result = page.json

            parsing = result["res"]["parsing_res_list"]

            for block in parsing:

                if block["block_label"] == "text":

                    content = block.get(
                        "block_content",
                        ""
                    ).strip()

                    if content:
                        texts.append(content)


        return texts



ocr_service = OCRService()