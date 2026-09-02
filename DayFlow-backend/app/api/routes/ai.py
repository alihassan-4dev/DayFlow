import base64
import json
import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.api.deps import CurrentUser, DbDep
from app.schemas.ai import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    SpeakRequest,
    TranscriptResponse,
    VoiceOption,
    VoiceTurnResponse,
)
from app.services import ai_service, voice_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])

_PERSONALITIES = ("friendly", "focused", "coach")


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: CurrentUser, db: DbDep) -> ChatResponse:
    return await ai_service.chat(
        db, user, payload.message, payload.history,
        personality=payload.personality, voice=payload.voice,
    )


@router.get("/voices", response_model=list[VoiceOption])
async def voices(_: CurrentUser) -> list[VoiceOption]:
    return [VoiceOption(id=v["id"], name=v["name"], style=v["style"]) for v in voice_service.VOICES]


async def _read_audio(audio: UploadFile) -> bytes:
    data = await audio.read()
    if len(data) > voice_service.MAX_AUDIO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Audio clip is too large")
    return data


async def _transcribe_or_raise(data: bytes, filename: str | None, language: str | None) -> str:
    try:
        return await voice_service.transcribe(data, filename or "speech.m4a", language)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        logger.exception("transcription failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Couldn't hear that clearly") from exc


@router.post("/transcribe", response_model=TranscriptResponse)
async def transcribe(
    _: CurrentUser,
    audio: Annotated[UploadFile, File()],
    language: Annotated[str | None, Form()] = None,
) -> TranscriptResponse:
    data = await _read_audio(audio)
    return TranscriptResponse(text=await _transcribe_or_raise(data, audio.filename, language))


@router.post("/voice", response_model=VoiceTurnResponse)
async def voice_turn(
    user: CurrentUser,
    db: DbDep,
    audio: Annotated[UploadFile, File()],
    history: Annotated[str, Form()] = "[]",
    personality: Annotated[str, Form()] = "friendly",
    voice: Annotated[str | None, Form()] = None,
    speed: Annotated[str, Form()] = "normal",
    speak: Annotated[bool, Form()] = True,
    language: Annotated[str | None, Form()] = None,
) -> VoiceTurnResponse:
    """A full spoken turn in one round trip: transcribe → think → synthesize."""
    data = await _read_audio(audio)
    try:
        parsed_history = [ChatMessage(**m) for m in json.loads(history or "[]")][-20:]
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "history must be a JSON list"
        ) from exc
    if personality not in _PERSONALITIES:
        personality = "friendly"

    transcript = await _transcribe_or_raise(data, audio.filename, language)
    if not transcript:
        return VoiceTurnResponse(transcript="", reply="")

    chat_result = await ai_service.chat(
        db, user, transcript, parsed_history, personality=personality, voice=True
    )
    audio_b64: str | None = None
    if speak and chat_result.reply:
        mp3 = await voice_service.synthesize(chat_result.reply, voice, speed)
        if mp3:
            audio_b64 = base64.b64encode(mp3).decode("ascii")

    return VoiceTurnResponse(
        transcript=transcript, audio_base64=audio_b64, **chat_result.model_dump()
    )


@router.post("/speak")
async def speak(payload: SpeakRequest, _: CurrentUser) -> Response:
    """MP3 for `text`. 204 when Edge TTS is unavailable so the app can fall back."""
    mp3 = await voice_service.synthesize(payload.text, payload.voice, payload.speed)
    if not mp3:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return Response(content=mp3, media_type="audio/mpeg")
