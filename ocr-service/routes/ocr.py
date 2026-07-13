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


    record = ocr_service.process_image(file_path)
    try:
        ocr_service.save_master_data()
    except Exception as error:
        print(f"Warning: failed to save master data: {error}")
    texts = [
        line.strip()
        for line in record.get("_raw_ocr_text", "").splitlines()
        if line.strip()
    ]


    return {
        "count": len(texts),
        "texts": texts,
        "record": record
    }
