from fastapi import FastAPI
from routes.ocr import router


app = FastAPI(
    title="PaddleOCR-VL API"
)


app.include_router(router)


@app.get("/")
def home():

    return {
        "status":"running",
        "engine":"PaddleOCR-VL-1.6"
    }