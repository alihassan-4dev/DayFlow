from datetime import date, timedelta

from httpx import AsyncClient

TODAY = date.today().isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()


async def test_task_crud_flow(client: AsyncClient, auth_headers: dict):
    # Create
    res = await client.post(
        "/tasks",
        json={"title": "Morning run", "due_date": TODAY, "time": "07:00", "priority": "medium"},
        headers=auth_headers,
    )
    assert res.status_code == 201, res.text
    task = res.json()
    assert task["title"] == "Morning run"
    assert task["completed"] is False

    # List
    res = await client.get("/tasks", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Update (complete + reschedule)
    res = await client.patch(
        f"/tasks/{task['id']}",
        json={"completed": True, "due_date": TOMORROW, "time": "18:30"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["completed"] is True
    assert updated["time"] == "18:30"

    # Delete
    res = await client.delete(f"/tasks/{task['id']}", headers=auth_headers)
    assert res.status_code == 204
    res = await client.get("/tasks", headers=auth_headers)
    assert res.json() == []


async def test_invalid_time_rejected(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/tasks",
        json={"title": "Bad time", "due_date": TODAY, "time": "25:99"},
        headers=auth_headers,
    )
    assert res.status_code == 422


async def test_task_input_is_normalized(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/tasks",
        json={"title": "  Plan tomorrow  ", "due_date": TODAY, "time": "7:5"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["title"] == "Plan tomorrow"
    assert res.json()["time"] == "07:05"

    res = await client.post(
        "/tasks", json={"title": "   ", "due_date": TODAY}, headers=auth_headers
    )
    assert res.status_code == 422


async def test_tasks_are_isolated_per_user(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/tasks", json={"title": "Mine", "due_date": TODAY}, headers=auth_headers
    )
    task_id = res.json()["id"]

    other = await client.post(
        "/auth/signup",
        json={"name": "Other", "email": "other@example.com", "password": "password123"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    res = await client.get("/tasks", headers=other_headers)
    assert res.json() == []
    res = await client.delete(f"/tasks/{task_id}", headers=other_headers)
    assert res.status_code == 404


async def test_tasks_require_auth(client: AsyncClient):
    res = await client.get("/tasks")
    assert res.status_code == 401
