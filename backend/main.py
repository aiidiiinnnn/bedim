from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
from jose import jwt, JWTError
import json
import os
import shutil

# ----------------------------
# CONFIG
# ----------------------------
SECRET_KEY = "secret"
ALGORITHM = "HS256"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ----------------------------
# DATABASE
# ----------------------------
Base = declarative_base()

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    sender = Column(String)
    content = Column(String)
    type = Column(String)       # "text" یا "image"
    created_at = Column(DateTime, default=datetime.utcnow)

engine = create_engine("sqlite:///chat.db", connect_args={"check_same_thread": False})
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

# ----------------------------
# STATIC FILES (IMAGE UPLOADS)
# ----------------------------
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ----------------------------
# HELPERS
# ----------------------------
def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["username"]
    except:
        return None


# ----------------------------
# ACTIVE CONNECTIONS
# ----------------------------
active_connections = {}

# ----------------------------
# LOGIN (FAKE)
# ----------------------------
@app.post("/login")
def login(username: str, password: str):
    token = jwt.encode({"username": username}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}


# ----------------------------
# MESSAGE HISTORY
# ----------------------------
@app.get("/messages")
def get_history():
    db = SessionLocal()
    msgs = db.query(Message).order_by(Message.created_at).all()
    return [
        {
            "sender": m.sender,
            "content": m.content,
            "type": m.type,
            "created_at": m.created_at.isoformat()
        }
        for m in msgs
    ]


# ----------------------------
# WEBSOCKET CHAT (COMPLETE)
# ----------------------------
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, token: str = Query(...)):
    username = get_user_from_token(token)
    if not username:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    active_connections[username] = websocket
    print("CONNECTED:", username)

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            db = SessionLocal()

            # TEXT MESSAGE
            if data["type"] == "text":
                msg = Message(
                    sender=username,
                    content=data["content"],
                    type="text"
                )
                db.add(msg)
                db.commit()

                # broadcast
                payload = {
                    "sender": username,
                    "type": "text",
                    "content": data["content"]
                }
                for ws in active_connections.values():
                    await ws.send_json(payload)

            # IMAGE MESSAGE
            elif data["type"] == "image":
                img_data = data["content"]
                filename = f"{datetime.utcnow().timestamp()}_{username}.png"
                filepath = f"uploads/{filename}"

                # decode base64
                import base64
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(img_data.split(",")[1]))

                # save in database
                msg = Message(
                    sender=username,
                    content=f"/uploads/{filename}",
                    type="image"
                )
                db.add(msg)
                db.commit()

                # broadcast
                payload = {
                    "sender": username,
                    "type": "image",
                    "content": f"/uploads/{filename}"
                }

                for ws in active_connections.values():
                    await ws.send_json(payload)

    except WebSocketDisconnect:
        print("DISCONNECTED:", username)
    finally:
        active_connections.pop(username, None)
