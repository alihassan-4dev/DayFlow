from pydantic import BaseModel, Field

from app.schemas.task import TaskOut


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|ai)$")
    text: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatAction(BaseModel):
    """A task operation the assistant performed, for the UI's action chips."""

    icon: str
    label: str


class ChatResponse(BaseModel):
    reply: str
    action: ChatAction | None = None
    tasks_changed: bool = False
    tasks: list[TaskOut] = Field(default_factory=list)
