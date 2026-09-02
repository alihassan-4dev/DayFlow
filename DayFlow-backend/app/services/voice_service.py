"""Voice for the DayFlow assistant — all on free tiers.

Speech-to-text  : Groq's hosted Whisper (`whisper-large-v3-turbo`).
Text-to-speech  : Microsoft Edge neural voices via `edge-tts` (no key needed).
                  If Edge is unreachable the app falls back to on-device TTS.
"""

import asyncio
import logging
import re

from app.core.config import get_settings

logger = logging.getLogger(__name__)

TRANSCRIBE_MODEL = "whisper-large-v3-turbo"
MAX_AUDIO_BYTES = 12 * 1024 * 1024
TTS_TIMEOUT_SECONDS = 12

# A small, curated set of Edge neural voices. `id` is what the app stores.
VOICES: list[dict[str, str]] = [
    {"id": "ava", "name": "Ava", "style": "Warm · US", "edge": "en-US-AvaNeural"},
    {"id": "andrew", "name": "Andrew", "style": "Calm · US", "edge": "en-US-AndrewNeural"},
    {"id": "emma", "name": "Emma", "style": "Bright · US", "edge": "en-US-EmmaNeural"},
    {"id": "brian", "name": "Brian", "style": "Friendly · US", "edge": "en-US-BrianNeural"},
    {"id": "sonia", "name": "Sonia", "style": "Crisp · UK", "edge": "en-GB-SoniaNeural"},
    {"id": "ryan", "name": "Ryan", "style": "Deep · UK", "edge": "en-GB-RyanNeural"},
    {"id": "natasha", "name": "Natasha", "style": "Easy · AU", "edge": "en-AU-NatashaNeural"},
    {"id": "neerja", "name": "Neerja", "style": "Soft · IN", "edge": "en-IN-NeerjaNeural"},
]
DEFAULT_VOICE = "ava"
_VOICE_BY_ID = {v["id"]: v["edge"] for v in VOICES}

# Speaking pace → Edge rate string.
RATES = {"relaxed": "-10%", "normal": "+0%", "brisk": "+18%"}


def resolve_voice(voice_id: str | None) -> str:
    return _VOICE_BY_ID.get(voice_id or "", _VOICE_BY_ID[DEFAULT_VOICE])


def resolve_rate(speed: str | None) -> str:
    return RATES.get(speed or "", RATES["normal"])


_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F900-\U0001F9FF\U0001F1E6-\U0001F1FF]"
)


def clean_for_speech(text: str) -> str:
    """Strip markdown/emoji so the voice doesn't read asterisks out loud."""
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    text = re.sub(r"[*_`#>]+", "", text)
    text = _EMOJI.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


async def transcribe(audio: bytes, filename: str, language: str | None = None) -> str:
    """Return the spoken text in `audio` (any common container: m4a/mp3/wav/webm)."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    if not audio:
        return ""

    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)
    kwargs: dict = {
        "file": (filename or "speech.m4a", audio),
        "model": TRANSCRIBE_MODEL,
        "response_format": "json",
        "temperature": 0.0,
        # A hint keeps Whisper from hallucinating on very short clips.
        "prompt": "DayFlow task planner. Tasks, reminders, times, days of the week.",
    }
    if language:
        kwargs["language"] = language
    result = await client.audio.transcriptions.create(**kwargs)
    return (getattr(result, "text", "") or "").strip()


async def synthesize(text: str, voice_id: str | None = None, speed: str | None = None) -> bytes:
    """MP3 bytes for `text`, or b"" when Edge TTS is unavailable."""
    spoken = clean_for_speech(text)
    if not spoken:
        return b""
    try:
        import edge_tts

        communicate = edge_tts.Communicate(
            spoken, resolve_voice(voice_id), rate=resolve_rate(speed)
        )
        chunks: list[bytes] = []

        async def _collect() -> None:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])

        await asyncio.wait_for(_collect(), timeout=TTS_TIMEOUT_SECONDS)
        return b"".join(chunks)
    except Exception:
        logger.warning(
            "edge-tts synthesis failed; client will fall back to device TTS", exc_info=True
        )
        return b""
