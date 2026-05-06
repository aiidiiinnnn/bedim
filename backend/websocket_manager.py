from fastapi import WebSocket

class ConnectionManager:

    def __init__(self):
        self.connections = {}

    async def connect(self, user_id, websocket: WebSocket):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id):
        if user_id in self.connections:
            del self.connections[user_id]

    async def broadcast(self, message):
        for ws in self.connections.values():
            await ws.send_json(message)

    async def send_to_user(self, user_id, message):
        if user_id in self.connections:
            await self.connections[user_id].send_json(message)


manager = ConnectionManager()
