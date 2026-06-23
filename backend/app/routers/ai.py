from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/ai", tags=["ai"])
ai_service = AIService()

class AIRequest(BaseModel):
    task: str = "generate"
    prompt: str

@router.post("/process")
async def process_ai(payload: AIRequest):
    if not ai_service.is_configured:
        raise HTTPException(status_code=503, detail="AI Service is not configured (missing API key)")
    try:
        result = await ai_service.process(payload.task, payload.prompt)
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
