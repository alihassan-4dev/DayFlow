from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.task import TaskOut

Personality = Literal["friendly", "focused", "coach"]
Speed = Literal["relaxed", "normal", "brisk"]


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|ai)$")
    text: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    personality: Personality = "friendly"
    # Spoken conversations want shorter, list-free answers.
    voice: bool = False


class ChatAction(BaseModel):
    """A task operation the assistant performed, for the UI's action chips."""

    icon: str
    label: str


class ChatResponse(BaseModel):
    reply: str
    action: ChatAction | None = None
    tasks_changed: bool = False
    tasks: list[TaskOut] = Field(default_factory=list)


class TranscriptResponse(BaseModel):
    text: str


class VoiceTurnResponse(ChatResponse):
    """One spoken exchange: what the user said, the reply, and optional audio."""

    transcript: str
    # Base64 MP3 of the reply, or null if Edge TTS was unavailable
    # (the app then speaks the reply with the device's own voice).
    audio_base64: str | None = None
    audio_mime: str = "audio/mpeg"


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str | None = None
    speed: Speed = "normal"


class VoiceOption(BaseModel):
    id: str
    name: str
    style: str
