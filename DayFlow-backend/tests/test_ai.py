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
