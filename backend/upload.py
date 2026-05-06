import os
from fastapi import UploadFile

UPLOAD_DIR = "../uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

async def save_file(file: UploadFile):

    path = os.path.join(UPLOAD_DIR, file.filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    return "/uploads/" + file.filename
