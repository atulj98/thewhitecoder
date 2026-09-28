from pydantic import BaseModel, ConfigDict


class SheetSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    description: str
    sort_order: int
    is_published: bool


class ItemRead(BaseModel):
    stable_key: str
    title: str
    kind: str
    source_url: str | None


class TopicRead(BaseModel):
    stable_key: str
    title: str
    items: list[ItemRead]


class StepRead(BaseModel):
    stable_key: str
    title: str
    topics: list[TopicRead]


class SheetRead(SheetSummary):
    revision_number: int | None
    steps: list[StepRead]
