from fastapi import APIRouter, UploadFile, File
from services.ocr_service import ocr_service
import shutil
import uuid
import os


router = APIRouter()


@router.post("/")
async def run_ocr(
    file: UploadFile = File(...)
):

    os.makedirs(
        "uploads",
        exist_ok=True
    )


    file_path = (
        f"uploads/{uuid.uuid4()}_{file.filename}"
    )


    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )


    texts = ocr_service.extract_text(
        file_path
    )


    return {
        "count": len(texts),
        "texts": texts
    }