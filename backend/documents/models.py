import logging
from itertools import chain
from typing import Any, Dict, List, Optional, Tuple

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction

from base.models import BaseModel
from bibliography.models import (
    Bibliography,
    BibliographyType,
    CustomBibliographyChunkEmbeddings,
    CustomBibliographyFile,
    WebBibliography,
)
from dwh.metadata.postprocessing import get_bib_id_chunk_id_list
from dwh.models import BibliographyPubMed
from kernel.defs import DEFAULT_DISPLAY_NAME_ON_PLAN_OVERVIEW
from kernel.models import Template
from kernel.utils import (
    build_section_dependency_map,
    build_section_influences,
    filter_section_dependencies,
    get_display_name_on_plan_overview,
    get_related_sections,
    merge_dependency_maps,
)
from users.defs import PublicationDateEnum, get_default_publication_settings

DEFAULT_ESTIMATED_DOCUMENT_GENERATION_MINUTES = 10

logger = logging.getLogger(__name__)


class DocumentStage(models.TextChoices):
    DRAFT = "draft"
    CONTENT_GENERATING = "content_generating"
    CONTENT_GENERATED = "content_generated"
    POLISHING = "polishing"
    POLISHED = "polished"


class DocumentStatus(models.TextChoices):
    INITIALIZED = "initialized"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class SectionStatus(models.TextChoices):
    INITIALIZED = "initialized"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(BaseModel):
    template = models.ForeignKey(
        Template, verbose_name="Template", null=True, blank=True, on_delete=models.SET_NULL
    )
    settings = models.JSONField("Settings")
    title = models.CharField("Title", max_length=512)
    stage = models.CharField(
        "Stage", max_length=50, choices=DocumentStage.choices, default=DocumentStage.DRAFT
    )
    status = models.CharField(
        "Status", max_length=50, choices=DocumentStatus.choices, default=DocumentStatus.INITIALIZED
    )
    created_by = models.ForeignKey(User, verbose_name="Created By", on_delete=models.CASCADE)
    template_json = models.JSONField("Template JSON")
    publication_settings = models.JSONField("Publication Settings", default=get_default_publication_settings)
    mermaid_svg_diagram = models.TextField("mermaid_svg_diagram", null=True, blank=True)
    mermaid_code = models.TextField("mermaid_code", null=True, blank=True)
    mermaid_diagram = models.ForeignKey(
        "MermaidDiagram",
        verbose_name="MermaidDiagram",
        null=True,
        blank=True,
        on_delete=models.DO_NOTHING,
    )
    bibliographies = models.JSONField("Bibliographies", null=True, blank=True)
    generation_log = models.JSONField(verbose_name="Generation Log", blank=True, null=True)

    def __str__(self) -> str:
        return self.title

    @property
    def template_name(self) -> str:
        return self.template_json.get("name", "")

    @property
    def template_type(self) -> str:
        return self.template_json.get("type", "")

    @property
    def system_message(self) -> str:
        return self.template_json.get("system_message", "")

    @property
    def estimated_document_generation_minutes(self) -> int:
        return self.template_json.get(
            "estimated_document_generation_minutes", DEFAULT_ESTIMATED_DOCUMENT_GENERATION_MINUTES
        )

    @property
    def shared_memory(self) -> Dict[str, List[str]]:
        return self.template_json.get("shared_memory", {})

    @property
    def sections_map(self) -> Dict[str, Dict[str, Any]]:
        sections = self.template_json["sections"]
        mapping = {}

        def recursive_collect(section: Dict[str, Any]) -> None:
            sub_sections = section.get("sub_sections", [])
            mapping[section["slug"]] = section
            for sub_section in sub_sections:
                recursive_collect(sub_section)

        for section in sections:
            recursive_collect(section)

        return mapping

    @property
    def sections_dependency_map(self) -> Dict[str, List[str]]:
        section_jsons = self.template_json["sections"]
        return build_section_dependency_map(section_jsons)

    @property
    def sub_sections_map(self) -> Dict[str, List[str]]:
        sections = self.template_json["sections"]

        mapping: Dict[str, List[str]] = {}

        def recursive_collect(section: Dict[str, Any]) -> None:
            if section["slug"] not in mapping:
                mapping[section["slug"]] = []

            for sub_section in section.get("sub_sections", []):
                mapping[section["slug"]].append(sub_section["slug"])
                recursive_collect(sub_section)

        for section in sections:
            recursive_collect(section)

        return mapping

    @property
    def sections_generation_order(self) -> List[str]:
        dependency_map = self.get_section_dependencies(include_deleted=True)
        order = []
        visited = set()
        for section in dependency_map:
            if section not in visited:
                self._dfs(section, dependency_map, visited, order)
        return order

    @property
    def like(self) -> Optional[bool]:
        feedback = Feedback.objects.filter(document_id=self.id, section_id=None).first()
        return feedback.like if feedback else None

    @property
    def bib_id_pmid_map(self) -> Dict[str, int]:
        if self.bibliographies is None:
            return {}
        pubmed_content_type = ContentType.objects.get_for_model(BibliographyPubMed)
        bibliography_objs = Bibliography.objects.filter(
            id__in=self.bibliographies.keys(), content_type=pubmed_content_type
        )
        # TODO - add other types of bibliographies!!!!!!!
        pubmed_ids = [b.object_id for b in bibliography_objs]
        pubmed_objs = BibliographyPubMed.objects.filter(id__in=pubmed_ids)
        pubmed_id_map = {pubmed.id: pubmed.pubmed_id for pubmed in pubmed_objs}
        bib_id_pubmed_id_map = {
            str(bibliography.id): pubmed_id_map[bibliography.object_id] for bibliography in bibliography_objs
        }
        return bib_id_pubmed_id_map

    @property
    def display_name_on_plan_overview(self) -> str:
        return get_display_name_on_plan_overview(self.template_json["sections"])

    def get_section_dependencies(self, include_deleted: bool = False) -> Dict[str, List[str]]:
        intermediate_dependency_map = merge_dependency_maps(self.sections_dependency_map, self.shared_memory)
        section_dependencies = merge_dependency_maps(intermediate_dependency_map, self.sub_sections_map)

        if not include_deleted:
            deleted_sections = list(
                Section.all_objects.filter(document=self)
                .exclude(deleted_at=None)
                .values_list("slug", flat=True)
            )
            section_dependencies = filter_section_dependencies(section_dependencies, deleted_sections)
        return section_dependencies

    def get_all_sub_sections(self, target_section: str) -> List[str]:
        sections = self.template_json["sections"]
        result = []

        def find_all_sub_sections(section: Dict[str, Any]) -> List[str]:
            sub_section_list = []
            for sub_section in section.get("sub_sections", []):
                sub_section_list.append(sub_section["slug"])
                sub_section_list.extend(find_all_sub_sections(sub_section))
            return sub_section_list

        def recursive_search(section: Dict[str, Any]) -> None:
            if section["slug"] == target_section:
                result.extend(find_all_sub_sections(section))
            for sub_section in section.get("sub_sections", []):
                recursive_search(sub_section)

        for section in sections:
            recursive_search(section)

        return result

    def create_sections(self, plan: Optional[str] = None):
        section_jsons = self.template_json["sections"]
        self._create_sections(section_jsons, plan=plan)

    def prepare_generation(
        self,
        generation_log: Optional[Dict[str, Any]] = None,
        custom_publication_settings: Optional[Dict[str, str]] = None,
    ):
        publication_settings = self.created_by.profile.publication_settings

        if custom_publication_settings:
            publication_settings.update(custom_publication_settings)

        self.update_fields(
            {
                "status": DocumentStatus.IN_PROGRESS,
                "stage": DocumentStage.CONTENT_GENERATING,
                "publication_settings": publication_settings,
                "generation_log": generation_log,
            }
        )

        sections_custom_data = self.settings.get("custom_data", {})
        custom_sub_sections_map = self.settings.get("custom_subsections", {})
        for section in self.sections.all().exclude(slug=None):
            attrs = {"status": SectionStatus.IN_PROGRESS}

            if section.display_on_plan_overview:
                attrs["plan"] = self.settings.get("plan", "")

            if section.slug in sections_custom_data:
                attrs["custom_data"] = sections_custom_data[section.slug]

            section.update_fields(attrs)

            if custom_sub_sections := custom_sub_sections_map.get(section.slug):
                for custom_sub_section in custom_sub_sections:
                    Section.objects.create(
                        parent=section,
                        document=self,
                        title=custom_sub_section["title"],
                        status=SectionStatus.COMPLETED,
                        result={"data": custom_sub_section["content"]},
                    )

    def prepare_polish(self):
        self.update_fields({"status": DocumentStatus.IN_PROGRESS, "stage": DocumentStage.POLISHING})
        for section in self.polish_ordered_sections():
            if not section.prompt:
                continue

            section.update_fields({"status": SectionStatus.IN_PROGRESS})

    def get_sections(self):
        sections = self.sections.filter(parent=None, is_title=False)
        display_sections_order = [section["slug"] for section in self.template_json["sections"]]
        return sorted(sections, key=lambda section: display_sections_order.index(section.slug))

    def get_sections_ordered_by_generation_plan(self):
        sections = self.sections.filter(parent=None, is_title=False)
        return sorted(sections, key=lambda section: self.sections_generation_order.index(section.slug))

    def generation_ordered_sections(self):
        sections = self.sections.all().exclude(slug=None)
        return sorted(sections, key=lambda section: self.sections_generation_order.index(section.slug))

    def polish_ordered_sections(self):
        section_dependencies = self.get_section_dependencies()
        edit_section_slugs = list(
            self.sections.filter(is_edited=True).exclude(slug=None).values_list("slug", flat=True)
        )
        all_related_sections = list(
            set(
                chain(
                    *[
                        get_related_sections(section_dependencies, section_slug)
                        for section_slug in edit_section_slugs
                    ]
                )
            )
        )
        sections = (
            self.sections.filter(models.Q(is_edited=True) | models.Q(slug__in=all_related_sections))
            .exclude(is_title=True)
            .exclude(result=None)
        )
        return sorted(
            sections,
            key=lambda section: self.sections_generation_order.index(section.slug) if section.slug else -1,
        )

    def get_bibliographies(self) -> List[Dict[str, Any]]:
        if not self.bibliographies:
            return []

        content_types = {
            model: ContentType.objects.get_for_model(model)
            for model in (CustomBibliographyFile, BibliographyPubMed, WebBibliography)
        }

        bibliographies = Bibliography.objects.filter(id__in=self.bibliographies.keys()).select_related(
            "content_type"
        )

        content_type_groups = {ct: [] for ct in content_types.values()}
        for bib in bibliographies:
            content_type_groups[bib.content_type].append(bib.object_id)

        model_instances = {
            content_types[CustomBibliographyFile]: CustomBibliographyFile.objects.in_bulk(
                content_type_groups[content_types[CustomBibliographyFile]]
            ),
            content_types[BibliographyPubMed]: BibliographyPubMed.objects.in_bulk(
                content_type_groups[content_types[BibliographyPubMed]]
            ),
            content_types[WebBibliography]: WebBibliography.objects.in_bulk(
                content_type_groups[content_types[WebBibliography]]
            ),
        }

        custom_file_chunks = CustomBibliographyChunkEmbeddings.objects.filter(
            custom_bibliography_file_id__in=content_type_groups[content_types[CustomBibliographyFile]]
        ).values_list("pk", "custom_bibliography_file_id", "chunk_text")

        custom_file_chunks_mapping = {}
        for chunk_id, file_id, chunk_text in custom_file_chunks:
            custom_file_chunks_mapping.setdefault(str(file_id), {})[str(chunk_id)] = chunk_text

        def get_metadata_and_chunks(bibliography: Bibliography) -> Tuple[Dict, Dict]:
            content_type = bibliography.content_type
            instance = model_instances[content_type].get(bibliography.object_id)

            if not instance:
                return {}, {}

            if content_type == content_types[CustomBibliographyFile]:
                metadata = {**(instance.metadata or {}), "object_id": str(bibliography.object_id)}
                return (metadata, custom_file_chunks_mapping.get(str(bibliography.object_id), {}))
            return instance.metadata, instance.chunks

        bibliographies_data = []
        for bibliography in bibliographies:
            bib_id = str(bibliography.id)
            chunk_ids = self.bibliographies[bib_id]
            metadata, chunks = get_metadata_and_chunks(bibliography)

            bibliographies_data.append(
                {
                    "id": bib_id,
                    "type": bibliography.bib_type,
                    "metadata": metadata,
                    "chunks": {chunk_id: text for chunk_id, text in chunks.items() if chunk_id in chunk_ids},
                }
            )

        non_value_placeholder = "zzz"

        def sort_key(data):
            bib_type = data["type"]
            metadata = data["metadata"]

            if bib_type == BibliographyType.FILE:
                return (0, metadata.get("file_name", non_value_placeholder))
            elif bib_type == BibliographyType.PUBMED:
                authors = metadata.get("authors") or [non_value_placeholder]
                return (1, [author or non_value_placeholder for author in authors])
            elif bib_type == BibliographyType.WEBSEARCH:
                return (2, metadata.get("url", ""))
            return (3, non_value_placeholder)

        bibliographies_data.sort(key=sort_key)
        return bibliographies_data

    def get_custom_bibliographies(self) -> List[Dict[str, Any]]:
        result = []
        if not (custom_file_object_ids := self.settings.get("custom_bibliography_file_pks")):
            return result

        custom_files = CustomBibliographyFile.objects.filter(id__in=custom_file_object_ids)
        for custom_file in custom_files:
            result.append(
                {
                    "name": custom_file.name,
                    "object_id": custom_file.id,
                }
            )
        return result

    def refresh_bibliographies(self) -> None:
        content = "\n".join(
            [
                result.get("data", "")
                for result in self.sections.all().values_list("result", flat=True)
                if result
            ]
        )
        all_bib_id_chunk_id_list = get_bib_id_chunk_id_list(content)
        new_doc_bibliographies = {}
        for bib_id, chunk_id in all_bib_id_chunk_id_list:
            if bib_id in new_doc_bibliographies:
                new_doc_bibliographies[bib_id].append(chunk_id)
            else:
                new_doc_bibliographies[bib_id] = [chunk_id]
        self.update_fields({"bibliographies": new_doc_bibliographies})

    def publication_settings_to_params(self) -> Dict[str, Any]:
        publication_date = self.publication_settings.get("publication_date", PublicationDateEnum.ALL)
        start_year = PublicationDateEnum.get_value(publication_date)
        article_types = self.publication_settings.get("article_types", [])
        sort_by = "citation_count|desc" if self.publication_settings.get("top_cited") else None

        return {
            "start_year": start_year,
            "article_types": article_types,
            "filter_article_types": bool(article_types),
            "sort_by": sort_by,
        }

    def get_section_influences(self, has_title: bool = False) -> Dict[str, List[str]]:
        section_dependencies = self.get_section_dependencies()

        if not has_title:
            section_dependencies.pop("title", None)

        result = build_section_influences(section_dependencies)

        return result

    def _create_sections(self, section_jsons, plan: Optional[str] = None, parent=None):
        for section_json in section_jsons:
            section = Section.objects.create(
                parent=parent,
                document=self,
                slug=section_json["slug"],
                title=section_json["title"],
                prompt=section_json.get("prompt"),
                plan_prompt=section_json.get("plan_prompt"),
                plan=plan if section_json.get("requires_plan") else None,
                tools=section_json["tools"],
                is_title=section_json.get("is_title", False),
                requires_plan=section_json.get("requires_plan", False),
                generation_log={"agents_result": []},
            )
            if section_json.get("sub_sections"):
                self._create_sections(section_json["sub_sections"], plan=plan, parent=section)

    def _dfs(
        self, section: str, dependency_map: Dict[str, List[str]], visited: set, order: List[str]
    ) -> None:
        visited.add(section)
        for dependency in dependency_map[section]:
            if dependency not in visited:
                self._dfs(dependency, dependency_map, visited, order)
        order.append(section)


class Section(BaseModel):
    parent = models.ForeignKey(
        "self",
        verbose_name="Parent",
        related_name="sub_sections",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
    )
    document = models.ForeignKey(
        Document, verbose_name="Document", related_name="sections", on_delete=models.CASCADE
    )
    slug = models.CharField("Slug", max_length=255, null=True, blank=True)
    title = models.CharField("Title", max_length=255)
    status = models.CharField(
        "Status", max_length=50, choices=SectionStatus.choices, default=SectionStatus.INITIALIZED
    )
    prompt = models.TextField("Prompt", null=True, blank=True)
    plan_prompt = models.TextField("Plan Prompt", null=True, blank=True)
    plan = models.TextField("Plan", null=True, blank=True)
    custom_data = models.TextField("Custom Data", null=True, blank=True)
    requires_plan = models.BooleanField("Requires Plan", default=False)
    is_title = models.BooleanField("Is Title", default=False)
    tools = models.JSONField("Tools", null=True, blank=True)
    result = models.JSONField("Result", null=True, blank=True)
    generation_log = models.JSONField(
        verbose_name="Generation Log",
        blank=True,
        null=True,
        help_text="Contains error messages and other information related to the generation process.",
    )
    is_edited = models.BooleanField("Is Edited", default=False)
    refined_result = models.JSONField("Refined Result", null=True, blank=True)

    def __str__(self) -> str:
        return self.title

    @property
    def key(self) -> str:
        return self.slug or str(self.id)

    @property
    def like(self) -> Optional[bool]:
        feedback = Feedback.objects.filter(document_id=self.document.id, section_id=self.id).first()
        return feedback.like if feedback else None

    @property
    def display_on_plan_overview(self) -> bool:
        section_json = self.document.sections_map.get(self.slug, {})
        return section_json.get("display_on_plan_overview", True)

    @property
    def display_name_on_plan_overview(self) -> str:
        section_json = self.document.sections_map.get(self.slug, {})
        return section_json.get("display_name_on_plan_overview") or DEFAULT_DISPLAY_NAME_ON_PLAN_OVERVIEW

    @property
    def dynamic_template_subsection(self) -> bool:
        section_json = self.document.sections_map.get(self.slug, {})
        return section_json.get("dynamic_template_subsection", False)

    def get_sub_sections(self) -> models.QuerySet["Section"]:
        return self.sub_sections.all().order_by("created_at")

    def save_result(self, result: Optional[dict]) -> None:
        with transaction.atomic():
            model = type(self)
            instance = model.objects.select_for_update().get(pk=self.pk)
            instance.result = result
            instance.save(update_fields=["result"])

    def get_custom_sub_sections(self, section_slug: str) -> models.QuerySet["Section"]:
        model = type(self)
        return model.objects.filter(document=self.document, parent__slug=section_slug, slug=None)

    def cascade_delete(self):
        for sub_section in self.sub_sections.all():
            sub_section.delete()

        if self.parent and self.parent.sub_sections.count() == 1:
            self.parent.delete()

        self.delete()


class Feedback(BaseModel):
    user = models.ForeignKey(User, verbose_name="User", on_delete=models.CASCADE)
    document_id = models.UUIDField("Document ID")
    section_id = models.UUIDField("Section ID", blank=True, null=True)
    like = models.BooleanField("Like", blank=True, null=True)
    detail = models.TextField("Detail", blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document_id", "section_id"]),
        ]

    @property
    def document(self) -> Document:
        return Document.all_objects.get(id=self.document_id)

    @property
    def section(self) -> Optional[Section]:
        if self.section_id:
            return Section.all_objects.get(id=self.section_id)
        return None


class DiagramType(models.TextChoices):
    FLOWCHART = "FLOWCHART"
    STATE = "STATE"
    TIMELINE = "TIMELINE"
    SEQUENCE = "SEQUENCE"


class MermaidDiagram(BaseModel):
    user = models.ForeignKey(User, verbose_name="User", on_delete=models.CASCADE)
    document_ref = models.ForeignKey(Document, verbose_name="Document", on_delete=models.CASCADE)
    diagram_type = models.CharField("Diagram Type", max_length=30, choices=DiagramType.choices)
    svg_diagram = models.TextField("svg_diagram", null=True, blank=True)
    mermaid_code = models.TextField("mermaid_code", null=True, blank=True)
