from httpx import AsyncClient


async def test_chat_without_groq_key_degrades_gracefully(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/ai/chat", json={"message": "What's left today?"}, headers=auth_headers
    )
    assert res.status_code == 200
    body = res.json()
    assert "GROQ_API_KEY" in body["reply"]
    assert body["tasks_changed"] is False


async def test_chat_requires_auth(client: AsyncClient):
    res = await client.post("/ai/chat", json={"message": "hi"})
    assert res.status_code == 401


async def test_chat_accepts_personality_and_voice_flags(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/ai/chat",
        json={"message": "hi", "personality": "coach", "voice": True},
        headers=auth_headers,
    )
    assert res.status_code == 200


async def test_voices_lists_curated_options(client: AsyncClient, auth_headers: dict):
    res = await client.get("/ai/voices", headers=auth_headers)
    assert res.status_code == 200
    ids = [v["id"] for v in res.json()]
    assert "ava" in ids and len(ids) >= 4


async def test_voice_turn_without_groq_key_is_503(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/ai/voice",
        files={"audio": ("clip.m4a", b"\x00\x01\x02", "audio/m4a")},
        data={"history": "[]", "personality": "friendly"},
        headers=auth_headers,
    )
    assert res.status_code == 503


async def test_voice_turn_rejects_bad_history(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/ai/voice",
        files={"audio": ("clip.m4a", b"\x00", "audio/m4a")},
        data={"history": "not json"},
        headers=auth_headers,
    )
    assert res.status_code == 422


async def test_voice_endpoints_require_auth(client: AsyncClient):
    assert (await client.get("/ai/voices")).status_code == 401
    assert (await client.post("/ai/speak", json={"text": "hi"})).status_code == 401


def test_clean_for_speech_strips_markup():
    from app.services.voice_service import clean_for_speech

    assert clean_for_speech("**Done** 💪 — see [it](x)") == "Done — see it"
