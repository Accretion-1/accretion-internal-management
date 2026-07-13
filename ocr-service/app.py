from fastapi import FastAPI
from routes.ocr import router


app = FastAPI(
    title="Goods-Outward Slip OCR API"
)


app.include_router(router)


@app.get("/")
def home():

    return {
        "status":"running",
        "engine":"Slip OCR Pipeline (alignment + PaddleOCR-VL + parsing)"
    }
