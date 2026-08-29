"""The DayFlow assistant: Groq (via LangChain) with tool-calling into the
user's tasks, plus mem0 recall for personal context.

Flow per chat turn:
  1. Load the user's tasks and any relevant memories.
  2. Ask the model; it may call task tools (create/update/complete/delete).
  3. Apply tool calls to the database, feed results back, let it answer.
"""

import asyncio
import logging
from datetime import date, timedelta

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Priority, Task, User
from app.schemas.ai import ChatAction, ChatMessage, ChatResponse
from app.schemas.task import TaskOut
from app.services import memory

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 4


# --- Tool schemas (executed manually against the DB below) -------------------

@tool
def create_task(title: str, due_date: str, time: str = "09:00",
                priority: str = "medium", reminder: bool = True, note: str = "") -> str:
    """Create a new task. due_date is YYYY-MM-DD, time is HH:MM 24h,
    priority is one of high/medium/low."""
    return ""


@tool
def update_task(task_id: int, title: str = "", due_date: str = "", time: str = "",
                priority: str = "", note: str = "") -> str:
    """Update fields of an existing task. Pass only the fields to change;
    leave the rest as empty strings. due_date is YYYY-MM-DD, time is HH:MM."""
    return ""


@tool
def complete_task(task_id: int, completed: bool = True) -> str:
    """Mark a task done (or not done with completed=false)."""
    return ""


@tool
def delete_task(task_id: int) -> str:
    """Delete a task permanently."""
    return ""


TOOLS = [create_task, update_task, complete_task, delete_task]

ACTION_META = {
    "create_task": ("check-circle", "Task created"),
    "update_task": ("clock", "Task updated"),
    "complete_task": ("check-circle", "Task completed"),
    "delete_task": ("trash-2", "Task deleted"),
}


class _ToolRunner:
    """Applies the model's tool calls to the current user's tasks."""

    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.changed = False
        self.last_action: ChatAction | None = None

    async def run(self, name: str, args: dict) -> str:
        try:
            handler = getattr(self, f"_{name}", None)
            if handler is None:
                return f"Unknown tool: {name}"
            result = await handler(**args)
        except Exception as exc:  # keep the conversation alive on bad args
            logger.warning("tool %s failed: %s", name, exc)
            return f"Error: {exc}"

        icon, label = ACTION_META[name]
        self.last_action = ChatAction(icon=icon, label=label)
        self.changed = True
        return result

    async def _owned(self, task_id: int) -> Task:
        task = await self.db.get(Task, task_id)
        if task is None or task.user_id != self.user.id:
            raise ValueError(f"No task with id {task_id}")
        return task

    async def _create_task(self, title: str, due_date: str, time: str = "09:00",
                           priority: str = "medium", reminder: bool = True, note: str = "") -> str:
        task = Task(
            user_id=self.user.id,
            title=title.strip(),
            note=note.strip() or None,
            due_date=date.fromisoformat(due_date),
            time=time,
            priority=Priority(priority),
            reminder=reminder,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return f"Created task {task.id}: {task.title} on {task.due_date} at {task.time}"

    async def _update_task(self, task_id: int, title: str = "", due_date: str = "",
                           time: str = "", priority: str = "", note: str = "") -> str:
        task = await self._owned(task_id)
        if title:
            task.title = title.strip()
        if due_date:
            task.due_date = date.fromisoformat(due_date)
        if time:
            task.time = time
        if priority:
            task.priority = Priority(priority)
        if note:
            task.note = note.strip()
        await self.db.commit()
        return f"Updated task {task.id}: now on {task.due_date} at {task.time}"

    async def _complete_task(self, task_id: int, completed: bool = True) -> str:
        task = await self._owned(task_id)
        task.completed = completed
        await self.db.commit()
        return f"Task {task.id} marked {'done' if completed else 'not done'}"

    async def _delete_task(self, task_id: int) -> str:
        task = await self._owned(task_id)
        title = task.title
        await self.db.delete(task)
        await self.db.commit()
        return f"Deleted task: {title}"


def _task_snapshot(tasks: list[Task]) -> str:
    if not tasks:
        return "The user has no tasks yet."
    lines = []
    for t in tasks:
        status = "done" if t.completed else "open"
        lines.append(
            f"- id={t.id} [{status}] {t.title} — {t.due_date} {t.time}, priority {t.priority.value}"
            + (f", note: {t.note}" if t.note else "")
        )
    return "\n".join(lines)


def _system_prompt(user: User, tasks: list[Task], memories: list[str]) -> str:
    today = date.today()
    parts = [
        "You are DayFlow, a calm and capable daily planning assistant inside a mobile app.",
        f"The user's name is {user.name or 'there'}.",
        f"Today is {today.isoformat()} ({today.strftime('%A')}); "
        f"tomorrow is {(today + timedelta(days=1)).isoformat()}.",
        "Keep replies short, warm, and concrete — one to three sentences. No markdown.",
        "Use the tools to create, update, complete, or delete tasks when the user asks.",
        "When scheduling, resolve relative dates yourself (e.g. 'tomorrow', 'Friday').",
        "Current tasks:",
        _task_snapshot(tasks),
    ]
    if memories:
        parts.append("Things you remember about this user:\n" + "\n".join(f"- {m}" for m in memories))
    return "\n\n".join(parts)


def _to_lc_history(history: list[ChatMessage]) -> list[BaseMessage]:
    return [
        HumanMessage(m.text) if m.role == "user" else AIMessage(m.text)
        for m in history
    ]


async def chat(db: AsyncSession, user: User, message: str,
               history: list[ChatMessage]) -> ChatResponse:
    settings = get_settings()

    tasks = list(await db.scalars(
        select(Task).where(Task.user_id == user.id).order_by(Task.due_date, Task.time)
    ))

    if not settings.groq_api_key:
        return ChatResponse(
            reply=(
                "The assistant isn't fully set up yet — add a GROQ_API_KEY to the "
                "backend .env to bring me to life. Your tasks still work as usual."
            ),
            tasks=[TaskOut.model_validate(t) for t in tasks],
        )

    from langchain_groq import ChatGroq

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.4,
        max_tokens=400,
    ).bind_tools(TOOLS)

    memories = await asyncio.to_thread(memory.recall, user.id, message)
    messages: list[BaseMessage] = [
        SystemMessage(_system_prompt(user, tasks, memories)),
        *_to_lc_history(history),
        HumanMessage(message),
    ]

    runner = _ToolRunner(db, user)
    reply_text = "Sorry — I couldn't finish that. Mind trying again?"

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            response = await llm.ainvoke(messages)
            messages.append(response)
            if not response.tool_calls:
                reply_text = str(response.content).strip() or reply_text
                break
            for call in response.tool_calls:
                result = await runner.run(call["name"], call["args"])
                messages.append(ToolMessage(content=result, tool_call_id=call["id"]))
        else:
            reply_text = "Done — though that took more steps than expected."
    except Exception:
        logger.exception("Groq chat failed")
        return ChatResponse(
            reply="I hit a snag talking to the model. Give it another try in a moment.",
            tasks=[TaskOut.model_validate(t) for t in tasks],
        )

    await asyncio.to_thread(memory.remember, user.id, message, reply_text)

    fresh = list(await db.scalars(
        select(Task).where(Task.user_id == user.id).order_by(Task.due_date, Task.time)
    ))
    return ChatResponse(
        reply=reply_text,
        action=runner.last_action,
        tasks_changed=runner.changed,
        tasks=[TaskOut.model_validate(t) for t in fresh],
    )
