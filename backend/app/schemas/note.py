from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float = 100
    y: float = 100


class Styling(BaseModel):
    backgroundColor: str = "#ffffff"
    fontSize: int = 16


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    position: Position = Field(default_factory=Position)
    styling: Styling = Field(default_factory=Styling)
    imageUrl: str = ""
    tags: list[str] = Field(default_factory=list)
    isPinned: bool = False


class NoteUpdate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    position: Position = Field(default_factory=Position)
    styling: Styling = Field(default_factory=Styling)
    imageUrl: str = ""
    tags: list[str] = Field(default_factory=list)
    isPinned: bool = False