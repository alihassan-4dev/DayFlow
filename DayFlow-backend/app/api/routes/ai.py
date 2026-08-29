from fastapi import APIRouter

from app.api.deps import CurrentUser, DbDep
from app.schemas.ai import ChatRequest, ChatResponse
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: CurrentUser, db: DbDep) -> ChatResponse:
    return await ai_service.chat(db, user, payload.message, payload.history)
