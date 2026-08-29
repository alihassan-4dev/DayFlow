from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbDep
from app.db.models import Task
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def _get_owned_task(db, user_id: int, task_id: int) -> Task:
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


@router.get("", response_model=list[TaskOut])
async def list_tasks(user: CurrentUser, db: DbDep) -> list[TaskOut]:
    rows = await db.scalars(
        select(Task)
        .where(Task.user_id == user.id)
        .order_by(Task.due_date, Task.time)
    )
    return [TaskOut.model_validate(t) for t in rows]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, user: CurrentUser, db: DbDep) -> TaskOut:
    task = Task(user_id=user.id, **payload.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, payload: TaskUpdate, user: CurrentUser, db: DbDep) -> TaskOut:
    task = await _get_owned_task(db, user.id, task_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, user: CurrentUser, db: DbDep) -> None:
    task = await _get_owned_task(db, user.id, task_id)
    await db.delete(task)
    await db.commit()
