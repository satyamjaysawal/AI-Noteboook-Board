from app.routers.connections import router as connections_router
from app.routers.drawings import router as drawings_router
from app.routers.notes import router as notes_router
from app.routers.ai import router as ai_router

__all__ = ["notes_router", "connections_router", "drawings_router", "ai_router"]