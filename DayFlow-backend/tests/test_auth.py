from httpx import AsyncClient


async def test_signup_login_me(client: AsyncClient):
    res = await client.post(
        "/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "supersecret1"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["email"] == "alex@example.com"
    assert body["access_token"]

    # Duplicate email is rejected
    res = await client.post(
        "/auth/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "supersecret1"},
    )
    assert res.status_code == 409

    # Login works, wrong password doesn't
    res = await client.post("/auth/login", json={"email": "alex@example.com", "password": "supersecret1"})
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = await client.post("/auth/login", json={"email": "alex@example.com", "password": "wrongwrong1"})
    assert res.status_code == 401

    # Token authenticates /auth/me
    res = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["name"] == "Alex"


async def test_short_password_rejected(client: AsyncClient):
    res = await client.post(
        "/auth/signup", json={"name": "A", "email": "a@example.com", "password": "short"}
    )
    assert res.status_code == 422


async def test_forgot_password_is_uniform(client: AsyncClient):
    res = await client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 200


async def test_me_requires_auth(client: AsyncClient):
    res = await client.get("/auth/me")
    assert res.status_code == 401
