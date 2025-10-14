from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UploadDocumentRequest(_message.Message):
    __slots__ = (
        "document_id",
        "document_name",
        "document_type",
        "document_content",
        "metadata",
        "source_api",
        "api_params",
    )
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    class ApiParamsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_NAME_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_CONTENT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    SOURCE_API_FIELD_NUMBER: _ClassVar[int]
    API_PARAMS_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    document_name: str
    document_type: str
    document_content: bytes
    metadata: _containers.ScalarMap[str, str]
    source_api: str
    api_params: _containers.ScalarMap[str, str]
    def __init__(
        self,
        document_id: _Optional[str] = ...,
        document_name: _Optional[str] = ...,
        document_type: _Optional[str] = ...,
        document_content: _Optional[bytes] = ...,
        metadata: _Optional[_Mapping[str, str]] = ...,
        source_api: _Optional[str] = ...,
        api_params: _Optional[_Mapping[str, str]] = ...,
    ) -> None: ...

class UploadDocumentResponse(_message.Message):
    __slots__ = ("document_id", "status", "message", "upload_session_id")
    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    UPLOAD_SESSION_ID_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    status: str
    message: str
    upload_session_id: str
    def __init__(
        self,
        document_id: _Optional[str] = ...,
        status: _Optional[str] = ...,
        message: _Optional[str] = ...,
        upload_session_id: _Optional[str] = ...,
    ) -> None: ...

class ParseDocumentRequest(_message.Message):
    __slots__ = ("document_id", "parse_type", "parse_options")
    class ParseOptionsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    PARSE_TYPE_FIELD_NUMBER: _ClassVar[int]
    PARSE_OPTIONS_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    parse_type: str
    parse_options: _containers.ScalarMap[str, str]
    def __init__(
        self,
        document_id: _Optional[str] = ...,
        parse_type: _Optional[str] = ...,
        parse_options: _Optional[_Mapping[str, str]] = ...,
    ) -> None: ...

class ParseDocumentResponse(_message.Message):
    __slots__ = (
        "document_id",
        "chunk_id",
        "content_type",
        "content",
        "progress",
        "is_final",
        "extracted_entities",
    )
    class ExtractedEntitiesEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    CHUNK_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    IS_FINAL_FIELD_NUMBER: _ClassVar[int]
    EXTRACTED_ENTITIES_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    chunk_id: str
    content_type: str
    content: str
    progress: float
    is_final: bool
    extracted_entities: _containers.ScalarMap[str, str]
    def __init__(
        self,
        document_id: _Optional[str] = ...,
        chunk_id: _Optional[str] = ...,
        content_type: _Optional[str] = ...,
        content: _Optional[str] = ...,
        progress: _Optional[float] = ...,
        is_final: bool = ...,
        extracted_entities: _Optional[_Mapping[str, str]] = ...,
    ) -> None: ...

class GenerateKnowledgeGraphRequest(_message.Message):
    __slots__ = ("document_ids", "graph_type", "graph_config", "merge_strategy")
    class GraphConfigEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    DOCUMENT_IDS_FIELD_NUMBER: _ClassVar[int]
    GRAPH_TYPE_FIELD_NUMBER: _ClassVar[int]
    GRAPH_CONFIG_FIELD_NUMBER: _ClassVar[int]
    MERGE_STRATEGY_FIELD_NUMBER: _ClassVar[int]
    document_ids: _containers.RepeatedScalarFieldContainer[str]
    graph_type: str
    graph_config: _containers.ScalarMap[str, str]
    merge_strategy: str
    def __init__(
        self,
        document_ids: _Optional[_Iterable[str]] = ...,
        graph_type: _Optional[str] = ...,
        graph_config: _Optional[_Mapping[str, str]] = ...,
        merge_strategy: _Optional[str] = ...,
    ) -> None: ...

class GraphNode(_message.Message):
    __slots__ = ("node_id", "node_type", "label", "properties", "source_documents")
    class PropertiesEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    NODE_ID_FIELD_NUMBER: _ClassVar[int]
    NODE_TYPE_FIELD_NUMBER: _ClassVar[int]
    LABEL_FIELD_NUMBER: _ClassVar[int]
    PROPERTIES_FIELD_NUMBER: _ClassVar[int]
    SOURCE_DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    node_id: str
    node_type: str
    label: str
    properties: _containers.ScalarMap[str, str]
    source_documents: _containers.RepeatedScalarFieldContainer[str]
    def __init__(
        self,
        node_id: _Optional[str] = ...,
        node_type: _Optional[str] = ...,
        label: _Optional[str] = ...,
        properties: _Optional[_Mapping[str, str]] = ...,
        source_documents: _Optional[_Iterable[str]] = ...,
    ) -> None: ...

class GraphEdge(_message.Message):
    __slots__ = (
        "edge_id",
        "source_node_id",
        "target_node_id",
        "relation_type",
        "confidence",
        "properties",
        "source_documents",
    )
    class PropertiesEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    EDGE_ID_FIELD_NUMBER: _ClassVar[int]
    SOURCE_NODE_ID_FIELD_NUMBER: _ClassVar[int]
    TARGET_NODE_ID_FIELD_NUMBER: _ClassVar[int]
    RELATION_TYPE_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_FIELD_NUMBER: _ClassVar[int]
    PROPERTIES_FIELD_NUMBER: _ClassVar[int]
    SOURCE_DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    edge_id: str
    source_node_id: str
    target_node_id: str
    relation_type: str
    confidence: float
    properties: _containers.ScalarMap[str, str]
    source_documents: _containers.RepeatedScalarFieldContainer[str]
    def __init__(
        self,
        edge_id: _Optional[str] = ...,
        source_node_id: _Optional[str] = ...,
        target_node_id: _Optional[str] = ...,
        relation_type: _Optional[str] = ...,
        confidence: _Optional[float] = ...,
        properties: _Optional[_Mapping[str, str]] = ...,
        source_documents: _Optional[_Iterable[str]] = ...,
    ) -> None: ...

class GenerateKnowledgeGraphResponse(_message.Message):
    __slots__ = ("graph_id", "status", "message", "nodes", "edges", "statistics")
    class StatisticsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: int
        def __init__(self, key: _Optional[str] = ..., value: _Optional[int] = ...) -> None: ...

    GRAPH_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    NODES_FIELD_NUMBER: _ClassVar[int]
    EDGES_FIELD_NUMBER: _ClassVar[int]
    STATISTICS_FIELD_NUMBER: _ClassVar[int]
    graph_id: str
    status: str
    message: str
    nodes: _containers.RepeatedCompositeFieldContainer[GraphNode]
    edges: _containers.RepeatedCompositeFieldContainer[GraphEdge]
    statistics: _containers.ScalarMap[str, int]
    def __init__(
        self,
        graph_id: _Optional[str] = ...,
        status: _Optional[str] = ...,
        message: _Optional[str] = ...,
        nodes: _Optional[_Iterable[_Union[GraphNode, _Mapping]]] = ...,
        edges: _Optional[_Iterable[_Union[GraphEdge, _Mapping]]] = ...,
        statistics: _Optional[_Mapping[str, int]] = ...,
    ) -> None: ...

class QueryGraphRAGRequest(_message.Message):
    __slots__ = (
        "query_text",
        "graph_id",
        "max_results",
        "entity_types",
        "relation_types",
        "similarity_threshold",
        "include_reasoning",
        "query_options",
    )
    class QueryOptionsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    QUERY_TEXT_FIELD_NUMBER: _ClassVar[int]
    GRAPH_ID_FIELD_NUMBER: _ClassVar[int]
    MAX_RESULTS_FIELD_NUMBER: _ClassVar[int]
    ENTITY_TYPES_FIELD_NUMBER: _ClassVar[int]
    RELATION_TYPES_FIELD_NUMBER: _ClassVar[int]
    SIMILARITY_THRESHOLD_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_REASONING_FIELD_NUMBER: _ClassVar[int]
    QUERY_OPTIONS_FIELD_NUMBER: _ClassVar[int]
    query_text: str
    graph_id: str
    max_results: int
    entity_types: _containers.RepeatedScalarFieldContainer[str]
    relation_types: _containers.RepeatedScalarFieldContainer[str]
    similarity_threshold: float
    include_reasoning: bool
    query_options: _containers.ScalarMap[str, str]
    def __init__(
        self,
        query_text: _Optional[str] = ...,
        graph_id: _Optional[str] = ...,
        max_results: _Optional[int] = ...,
        entity_types: _Optional[_Iterable[str]] = ...,
        relation_types: _Optional[_Iterable[str]] = ...,
        similarity_threshold: _Optional[float] = ...,
        include_reasoning: bool = ...,
        query_options: _Optional[_Mapping[str, str]] = ...,
    ) -> None: ...

class RAGResultItem(_message.Message):
    __slots__ = (
        "result_id",
        "content",
        "relevance_score",
        "source_documents",
        "related_nodes",
        "related_edges",
        "reasoning",
    )
    RESULT_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    RELEVANCE_SCORE_FIELD_NUMBER: _ClassVar[int]
    SOURCE_DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    RELATED_NODES_FIELD_NUMBER: _ClassVar[int]
    RELATED_EDGES_FIELD_NUMBER: _ClassVar[int]
    REASONING_FIELD_NUMBER: _ClassVar[int]
    result_id: str
    content: str
    relevance_score: float
    source_documents: _containers.RepeatedScalarFieldContainer[str]
    related_nodes: _containers.RepeatedCompositeFieldContainer[GraphNode]
    related_edges: _containers.RepeatedCompositeFieldContainer[GraphEdge]
    reasoning: str
    def __init__(
        self,
        result_id: _Optional[str] = ...,
        content: _Optional[str] = ...,
        relevance_score: _Optional[float] = ...,
        source_documents: _Optional[_Iterable[str]] = ...,
        related_nodes: _Optional[_Iterable[_Union[GraphNode, _Mapping]]] = ...,
        related_edges: _Optional[_Iterable[_Union[GraphEdge, _Mapping]]] = ...,
        reasoning: _Optional[str] = ...,
    ) -> None: ...

class QueryGraphRAGResponse(_message.Message):
    __slots__ = ("query_id", "status", "message", "results", "generated_answer", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...

    QUERY_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    GENERATED_ANSWER_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    query_id: str
    status: str
    message: str
    results: _containers.RepeatedCompositeFieldContainer[RAGResultItem]
    generated_answer: str
    metadata: _containers.ScalarMap[str, str]
    def __init__(
        self,
        query_id: _Optional[str] = ...,
        status: _Optional[str] = ...,
        message: _Optional[str] = ...,
        results: _Optional[_Iterable[_Union[RAGResultItem, _Mapping]]] = ...,
        generated_answer: _Optional[str] = ...,
        metadata: _Optional[_Mapping[str, str]] = ...,
    ) -> None: ...
