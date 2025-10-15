import logging
from io import BytesIO

from django.db.models import QuerySet
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from base.mixins import GetSerializerClassMixin
from base.pagination import CustomCursorPagination
from documents.defs import SearchResourceType
from documents.document_export.defs import ExportFormatType
from documents.document_export.docx_generator import DocxGenerator
from documents.document_export.pdf_generator import PDFGenerator
from documents.logic.extract_publication_ids_from_string import (
    extract_publication_ids_from_string,
)
from documents.models import Document, DocumentStatus, MermaidDiagram, Section
from documents.permissions import CanAccessAllDocuments, IsDocumentOwner
from documents.serializers import (
    AIActionsSerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentExportSerializer,
    DocumentGeneratePlanSerializer,
    DocumentGenerateSerializer,
    DocumentListSerializer,
    DocumentUpdateSerializer,
    FeedbackSerializer,
    FindCitationsSerializer,
    FindReferencesSerializer,
    MermaidDiagramSerializer,
    MermaidDiagramUpdateSerializer,
    SectionApplyRefinementSerializer,
    SectionCreateSerializer,
    SectionUpdateSerializer,
    TransparencyRetrieveSerializer,
)
from documents.services import generate_plan, get_websearch_chunks
from documents.transparency.utils import create_document_generation_log
from documents.utils import (
    apply_refined,
    check_document_not_ready_for_modification,
    check_no_sections_edited,
    check_sections_with_in_progress_status,
    execute_ai_action,
    get_documents_sections,
)
from dwh.scientific_publication.publication_chunks import get_publication_chunks
from dwh.scientific_publication.publication_metadata_search import (
    get_publication_chunks_by_ids,
    get_publication_chunks_by_title,
)
from general.defs import ConfigKeyType, PublicationChunksFeature
from general.models import Config
from kernel.tasks import generate_document_task, generate_mermaid, polish_document_task

logger = logging.getLogger(__name__)


class DocumentViewSet(
    GetSerializerClassMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Document.objects.all()
    serializer_class = None
    serializer_action_classes = {
        "list": DocumentListSerializer,
        "retrieve": DocumentDetailSerializer,
        "create": DocumentCreateSerializer,
        "partial_update": DocumentUpdateSerializer,
        "export": DocumentExportSerializer,
        "find_references": FindReferencesSerializer,
        "find_citations": FindCitationsSerializer,
        "ai_actions": AIActionsSerializer,
        "feedback": FeedbackSerializer,
        "generate_mermaid_diagram": MermaidDiagramUpdateSerializer,
    }
    pagination_class = CustomCursorPagination
    permission_classes = [CanAccessAllDocuments | IsDocumentOwner]

    def get_queryset(self) -> QuerySet:
        if self.action == "list":
            return self.queryset.filter(created_by=self.request.user)
        return self.queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        docs_to_serialize = page if page is not None else queryset
        doc_ids = [doc.id for doc in docs_to_serialize]

        sections_by_doc = get_documents_sections(doc_ids)
        request.sections_by_doc = sections_by_doc

        serializer = self.get_serializer(docs_to_serialize, many=True)

        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)

    @action(methods=["post"], detail=True)
    def generate(self, request, pk=None):
        document: Document = self.get_object()

        serializer = DocumentGenerateSerializer(
            data={"settings": document.settings},
            context={"request": request, "document": document},
        )
        serializer.is_valid(raise_exception=True)

        init_generation_log = create_document_generation_log(document)

        document.prepare_generation(
            generation_log=init_generation_log,
            custom_publication_settings={
                ConfigKeyType.PUB_CHUNKS_ABSTRACT_SEARCH: Config.get(
                    ConfigKeyType.PUB_CHUNKS_ABSTRACT_SEARCH, {}
                ),
                ConfigKeyType.PUB_CHUNKS_FULLTEXT_SEARCH: Config.get(
                    ConfigKeyType.PUB_CHUNKS_FULLTEXT_SEARCH, {}
                ),
            },
        )
        generate_document_task.delay(document.id)
        return Response({"document_id": document.id}, status=status.HTTP_201_CREATED)

    @action(methods=["post"], detail=True)
    def generate_plan(self, request, pk=None):
        document: Document = self.get_object()

        serializer = DocumentGeneratePlanSerializer(
            data={"settings": document.settings},
            context={"request": request, "document": document},
        )
        serializer.is_valid(raise_exception=True)

        plan = generate_plan(document)

        document.refresh_from_db()
        doc_settings = document.settings or {}
        doc_settings["plan"] = plan
        document.update_fields({"settings": doc_settings})

        return Response({"plan": plan})

    @action(methods=["get"], detail=True)
    def metadata(self, request, pk=None):
        document: Document = self.get_object()
        sections = document.sections.all().values("result")

        if not sections:
            err_msg = f"LLM Report ID={pk} doesn't have any completed sections"
            return Response({"errors": [{"sections": err_msg}]}, status=status.HTTP_404_NOT_FOUND)

        pmid_list = []
        for section in sections:
            try:
                section_pmid_list = [
                    chunk["pubmed_id"] for chunk in section["result"]["metadata"]["chunks"].values()
                ]
                pmid_list.extend(section_pmid_list)
            except (KeyError, TypeError):
                pass

        pmid_list = list(set(pmid_list))
        return Response(pmid_list)

    @action(methods=["post"], detail=False)
    def export(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data["document_id"]
        format = serializer.validated_data["format"]

        document = get_object_or_404(Document, pk=document_id)
        self.check_object_permissions(request, document)

        # TODO: add DocumentStatus.POLISHED
        if document.status not in [DocumentStatus.COMPLETED]:
            return Response(
                {"detail": "Document is not ready for export."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buffer = BytesIO()
        if format == ExportFormatType.PDF:
            pdf_generator = PDFGenerator(output_file=buffer, document=document)
            pdf_generator.generate_pdf()
        elif format == ExportFormatType.DOCX:
            docx_generator = DocxGenerator(output_file=buffer, document=document)
            docx_generator.generate_docx()
        else:
            return Response({"detail": "Invalid format."}, status=status.HTTP_400_BAD_REQUEST)
        buffer.seek(0)
        filename = f"{document.title[:200]}.{format}"
        return FileResponse(buffer, as_attachment=True, filename=filename)

    @action(methods=["post"], detail=True)
    def find_references(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data["query"]
        search_resource_type = serializer.validated_data["search_resource_type"]
        document: Document = self.get_object()

        if search_resource_type == SearchResourceType.WEBSEARCH:
            results = get_websearch_chunks(query)
            return Response(results)

        params = {
            "query": query,
            "resources": [search_resource_type],
            "use_separate_settings_for_resources": True,
            "feature": PublicationChunksFeature.FIND_REFERENCES,
            **document.publication_settings_to_params(),
        }
        abstract_chunks, fulltext_chunks = get_publication_chunks(**params)
        chunks = {
            SearchResourceType.PUBMED: abstract_chunks,
            SearchResourceType.PMC: fulltext_chunks,
        }.get(search_resource_type, [])
        return Response(chunks)

    @action(methods=["post"], detail=True)
    def find_citations(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data["query"]
        search_resource_type = serializer.validated_data["search_resource_type"]
        document: Document = self.get_object()

        if search_resource_type == SearchResourceType.WEBSEARCH:
            results = get_websearch_chunks(query)
            return Response(results)

        if search_resource_type == SearchResourceType.PUBMED:
            (
                cleared_text,
                doi_nums,
                pmc_ids,
                pubmed_ids,
            ) = extract_publication_ids_from_string(query)

            if not cleared_text and (doi_nums or pmc_ids or pubmed_ids):
                result_by_ids = get_publication_chunks_by_ids(
                    pubmed_ids=pubmed_ids,
                    doi_nums=doi_nums,
                    pmc_ids=pmc_ids,
                )
                return Response(result_by_ids)

        result_by_title = (
            get_publication_chunks_by_title(query)
            if search_resource_type == SearchResourceType.PUBMED
            else []
        )

        params = {
            "query": query,
            "resources": [search_resource_type],
            "fuzzy_search_limit": 100000,
            "use_separate_settings_for_resources": True,
            "feature": PublicationChunksFeature.ADD_CITATIONS,
            **document.publication_settings_to_params(),
        }
        abstract_chunks, fulltext_chunks = get_publication_chunks(**params)
        if search_resource_type == SearchResourceType.PUBMED:
            result_others = abstract_chunks
        elif search_resource_type == SearchResourceType.PMC:
            result_others = fulltext_chunks
        else:
            result_others = []

        return Response(result_by_title + result_others)

    @action(methods=["post"], detail=False)
    def ai_actions(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data["document_id"]
        action_type = serializer.validated_data["action_type"]
        text = serializer.validated_data["text"]
        text_context = serializer.validated_data["text_context"]
        metadata = serializer.validated_data["metadata"]
        custom_prompt = serializer.validated_data.get("custom_prompt")

        document = get_object_or_404(Document, pk=document_id)
        self.check_object_permissions(request, document)

        result = execute_ai_action(
            request.user,
            document,
            action_type,
            text,
            text_context,
            metadata,
            custom_prompt,
        )
        return Response({"result": result})

    @action(methods=["post"], detail=True)
    def polish(self, request, pk=None):
        document: Document = self.get_object()
        sections = document.sections.all()

        for error in [
            check_document_not_ready_for_modification(document),
            check_no_sections_edited(sections),
            check_sections_with_in_progress_status(sections),
        ]:
            if error:
                return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        document.prepare_polish()
        task = polish_document_task.delay(document.id)
        return Response({"task_id": task.id}, status=status.HTTP_201_CREATED)

    @action(methods=["post"], detail=False)
    def feedback(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response()

    @action(methods=["post"], detail=True)
    def generate_mermaid_diagram(self, request, pk=None):
        document: Document = self.get_object()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        diagram_type = serializer.validated_data["diagram_type"]

        existing_diagram = MermaidDiagram.objects.filter(
            document_ref_id=document.id,
            user=request.user,
            diagram_type=diagram_type,
        ).first()

        if existing_diagram:
            if existing_diagram != document.mermaid_diagram:
                document.update_fields({"mermaid_diagram": existing_diagram})
            return Response(
                status=status.HTTP_200_OK,
                data=MermaidDiagramSerializer(existing_diagram).data,
            )

        mermaid_diagram = generate_mermaid(document=document, diagram_type=diagram_type)

        return Response(
            status=status.HTTP_201_CREATED,
            data=MermaidDiagramSerializer(mermaid_diagram).data,
        )

    @action(methods=["post"], detail=True)
    def unlink_mermaid_diagram(self, request, pk=None):
        document: Document = self.get_object()
        if document.mermaid_diagram:
            document.update_fields({"mermaid_diagram": None})
        return Response(status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.sections.all().delete()
        return super().perform_destroy(instance)


class SectionViewSet(
    GetSerializerClassMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Section.objects.all()
    serializer_class = None
    serializer_action_classes = {
        "create": SectionCreateSerializer,
        "partial_update": SectionUpdateSerializer,
        "apply_refinement": SectionApplyRefinementSerializer,
    }
    permission_classes = [CanAccessAllDocuments | IsDocumentOwner]

    def get_queryset(self) -> QuerySet:
        if self.action == "list":
            return self.queryset.filter(created_by=self.request.user)
        return self.queryset

    @action(methods=["post"], detail=True)
    def apply_refinement(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        section: Section = self.get_object()

        apply_refined(
            section,
            serializer.validated_data["action"] == SectionApplyRefinementSerializer.ACTION_APPLY_REFINED,
        )

        return Response()

    def perform_destroy(self, instance: Section):
        document = instance.document
        instance.cascade_delete()
        document.refresh_bibliographies()


class TransparencyViewSet(
    GetSerializerClassMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Document.objects.all()
    serializer_class = None
    serializer_action_classes = {
        "retrieve": TransparencyRetrieveSerializer,
    }
    permission_classes = [CanAccessAllDocuments | IsDocumentOwner]

    def get_queryset(self) -> QuerySet:
        if self.action == "list":
            return self.queryset.filter(created_by=self.request.user)
        return self.queryset
