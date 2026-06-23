from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.database import Base, engine
from app.models.drawing import Drawing  # Ensure Drawing model is imported for SQLAlchemy table creation
from app.routers import connections_router, notes_router, drawings_router, ai_router
from app.services.ai_service import AIService
from app.socket_events import register_socket_events

settings = get_settings()
ai_service = AIService()

limiter = Limiter(key_func=get_remote_address, default_limits=["100/15minutes"])
allowed_origins = [origin.strip() for origin in settings.client_url.split(",") if origin.strip()]

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=allowed_origins or "*",
)
register_socket_events(sio, ai_service)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("Database tables synced")
    yield


app = FastAPI(
    title="NoteFlow API",
    description="AI NoteBook Board backend",
    version="2.0.0",
    lifespan=lifespan,
)
app.state.sio = sio
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to NoteFlow API! Your server is up and running."}


@app.get("/health")
def health():
    return {"status": "ok", "database": "postgresql"}


app.include_router(notes_router)
app.include_router(connections_router)
app.include_router(drawings_router)
app.include_router(ai_router)


@app.exception_handler(404)
async def not_found_handler(_request: Request, _exc):
    return JSONResponse(status_code=404, content={"message": "Route not found"})


@app.exception_handler(Exception)
async def server_error_handler(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "Server error", "error": str(exc)},
    )


socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
app = socket_app