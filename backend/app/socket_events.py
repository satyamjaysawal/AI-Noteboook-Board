import socketio

from app.services.ai_service import AIService


def register_socket_events(sio: socketio.AsyncServer, ai_service: AIService) -> None:
    @sio.event
    async def connect(sid, _environ):
        print(f"Client connected: {sid}")

    @sio.event
    async def disconnect(sid):
        print(f"Client disconnected: {sid}")

    @sio.on("ai-process")
    async def handle_ai_process(sid, data):
        task = data.get("task", "generate")
        prompt = data.get("prompt", "")

        try:
            result = await ai_service.process(task, prompt)
            await sio.emit(
                "ai-response",
                {"success": True, "task": task, "prompt": prompt, "result": result},
                to=sid,
            )
        except Exception as exc:
            await sio.emit(
                "ai-response",
                {"success": False, "error": str(exc)},
                to=sid,
            )