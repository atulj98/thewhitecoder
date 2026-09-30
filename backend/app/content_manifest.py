"""The reviewed format shared by the static site and the database importer."""

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


class ManifestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


def check_unique_keys(entries: list["ItemManifest | TopicManifest | StepManifest"]) -> None:
    keys = [entry.stable_key for entry in entries]
    if len(keys) != len(set(keys)):
        raise ValueError("stable_key must be unique among siblings")


class ItemManifest(ManifestModel):
    stable_key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=240)
    kind: str = Field(default="resource", min_length=1, max_length=24, pattern=r"^[a-z_]+$")
    source_url: HttpUrl | None = None

    @field_validator("source_url")
    @classmethod
    def check_url_length(cls, value: HttpUrl | None) -> HttpUrl | None:
        if value is not None and len(str(value)) > 2048:
            raise ValueError("source_url exceeds the database limit of 2048 characters")
        return value


class TopicManifest(ManifestModel):
    stable_key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=180)
    items: list[ItemManifest] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_items(self) -> "TopicManifest":
        check_unique_keys(self.items)
        return self


class StepManifest(ManifestModel):
    stable_key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=180)
    topics: list[TopicManifest] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_topics(self) -> "StepManifest":
        check_unique_keys(self.topics)
        return self


class SheetManifest(ManifestModel):
    manifest_version: Literal[1]
    slug: Literal["dsa", "cn", "os", "dbms", "oops"]
    steps: list[StepManifest] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_steps(self) -> "SheetManifest":
        check_unique_keys(self.steps)
        return self


def load_manifest(path: Path) -> SheetManifest:
    with path.open(encoding="utf-8") as source:
        return SheetManifest.model_validate(json.load(source))
