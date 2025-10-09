import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Literal

from langchain.schema import Document
from langchain_core.documents import BaseDocumentTransformer
from pydantic import BaseModel, Field


class DocumentChunkTagger(BaseDocumentTransformer, BaseModel):
    """Adds metadata to a collection of chunks. By default, collects chunks that have the same
    title and assigns them unique `chunk_id`. Adds `created_at`
    key which equal to the current datetime. Can also add `extra_tags` if provided
    """

    created_at: str | Literal["current"] | None = Field(
        default=None,
        description="Datetime the document created. By default current time in ISO format",
    )
    add_chunk_id: bool = Field(default=True, description="Adds `chunk_id`. `chunk_id` is a uuid4 string")
    tags_map: dict[str, str] | None = Field(
        default=None,
        description="Map of tags to add to the document. Keys are new tags, values are old tags",
    )
    extra_tags: dict[str, Any] = Field(default=None, description="Extra metadata to add")

    def transform_documents(self, documents: Sequence[Document], **kwargs: Any) -> Sequence[Document]:
        new_docs = []
        metadata = {}
        created_at = self.created_at if self.created_at != "current" else datetime.now().isoformat()
        if created_at:
            metadata["created_at"] = created_at
        if self.extra_tags:
            metadata.update(self.extra_tags)
        for doc in documents:
            new_doc = doc.copy(deep=True)
            if self.add_chunk_id:
                metadata.update({"chunk_id": str(uuid.uuid4())})
            if self.tags_map:
                new_tags = {k: doc.metadata.get(v) for k, v in self.tags_map.items() if v in doc.metadata}
                metadata.update(new_tags)  # type: ignore
            new_doc.metadata.update(metadata)
            new_docs.append(new_doc)
        return new_docs
