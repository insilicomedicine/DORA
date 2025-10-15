from typing import Any, Dict, Tuple

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from pgvector.django import HnswIndex, VectorField

from base.models import BaseModel
from bibliography.defs import CustomBibliographyFileFormat, CustomBibliographyFileStatus, PublicationTypes
from dwh.metadata.postprocessing import get_metadata
from dwh.models import BibliographyPubMed


class BibliographyType(models.TextChoices):
    PUBMED = "pubmed", "PubMed"
    WEBSEARCH = "websearch", "Web Search"
    FILE = "file", "File"
    UNKNOWN = "unknown", "Unknown"


class Bibliography(BaseModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Bibliographies"

    @property
    def bib_type(self) -> BibliographyType:
        if self.content_type.model == BibliographyPubMed._meta.model_name:
            return BibliographyType.PUBMED
        elif self.content_type.model == CustomBibliographyFile._meta.model_name:
            return BibliographyType.FILE
        elif self.content_type.model == WebBibliography._meta.model_name:
            return BibliographyType.WEBSEARCH
        else:
            return BibliographyType.UNKNOWN

    @property
    def metadata(self) -> Dict[str, Any]:
        return self.content_object.metadata

    @property
    def chunks(self) -> Dict[str, str]:
        return self.content_object.chunks

    @classmethod
    def get_or_create(cls, content_object: models.Model) -> Tuple["Bibliography", bool]:
        content_type = ContentType.objects.get_for_model(content_object)
        object_id = content_object.id

        return cls.objects.get_or_create(
            content_type=content_type, object_id=object_id, defaults={"content_object": content_object}
        )

    @classmethod
    def update_and_create_pubmed_bibliographies(cls, pubmed_data: Dict[int, Any]) -> Dict[int, str]:
        def process_bibliography(pmid, data):
            pubmed_bibliography, created = BibliographyPubMed.objects.get_or_create(
                pubmed_id=pmid,
                defaults={"metadata": data.get("metadata", {}), "chunks": data.get("chunks", {})},
            )

            if not created:
                new_chunks = data.get("chunks", {})
                if new_chunks.keys() - pubmed_bibliography.chunks.keys():
                    pubmed_bibliography.chunks.update(new_chunks)
                    pubmed_bibliography.save()

            bibliography, _ = cls.get_or_create(pubmed_bibliography)
            pmid_bib_id_mapping[pmid] = str(bibliography.id)

        pmid_bib_id_mapping = {}
        for pmid, data in pubmed_data.items():
            process_bibliography(pmid, data)

        return pmid_bib_id_mapping

    @classmethod
    def update_and_create_web_bibliographies(
        cls, web_data: Dict[Tuple[str, str], Dict[str, Any]]
    ) -> Dict[Tuple[str, str], str]:
        from bibliography.utils import extract_source_identifier_from_url, get_hashed_link

        def process_bibliography(chunk_id, data, hashed_link):
            web_bibliography, created = WebBibliography.objects.get_or_create(
                hashed_link=hashed_link,
                defaults={
                    "metadata": {
                        "url": data["source"],
                        "title": data.get("title", ""),
                    },
                    "chunks": {chunk_id: data["chunk"]},
                },
            )

            if not created:
                existing_chunk = next(
                    (k for k, v in web_bibliography.chunks.items() if v == data["chunk"]), None
                )
                new_chunk_id = existing_chunk if existing_chunk else chunk_id

                if not existing_chunk:
                    web_bibliography.chunks[chunk_id] = data["chunk"]

                web_bibliography.metadata.update(
                    {
                        "url": data["source"],
                        "title": data.get("title", ""),
                    }
                )
                web_bibliography.save()

            bibliography, _ = cls.get_or_create(web_bibliography)
            return (str(bibliography.id), str(new_chunk_id if not created else chunk_id))

        # Check if PHARMACOGNITIVE_API_URL is configured to decide
        # if we need to collect metadata by this request
        should_update_metadata = bool(settings.PHARMACOGNITIVE_API_URL)

        pubmed_ids_map = {}
        pmc_ids_map = {}
        doi_ids_map = {}
        old_new_bib_chunk_id_mapping = {}

        for (bib_id, chunk_id), data in web_data.items():
            hashed_link = get_hashed_link(data["source"])
            old_new_bib_chunk_id_mapping[(bib_id, chunk_id)] = process_bibliography(
                chunk_id, data, hashed_link
            )

            if should_update_metadata:
                source_type, source_id, _ = extract_source_identifier_from_url(data["source"])
                if source_type == PublicationTypes.PUBMED.name:
                    pubmed_ids_map[source_id] = hashed_link
                elif source_type == PublicationTypes.PMC.name:
                    pmc_ids_map[source_id] = hashed_link
                elif source_type == PublicationTypes.DOI.name:
                    doi_ids_map[source_id] = hashed_link

        if should_update_metadata:
            WebBibliography.update_web_bib_metadata(pubmed_ids_map, pmc_ids_map, doi_ids_map)
        return old_new_bib_chunk_id_mapping


class CustomBibliographyFile(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=500)
    format = models.CharField(
        max_length=50,
        choices=CustomBibliographyFileFormat.FORMAT_CHOICES,
        default=CustomBibliographyFileFormat.PDF,
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=50,
        choices=CustomBibliographyFileStatus.STATUS_CHOICES,
        default=CustomBibliographyFileStatus.UPLOADING,
    )
    cleaned_text = models.TextField()
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_format_valid",
                check=models.Q(format__in=CustomBibliographyFileFormat.FORMATS),
            ),
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_status_valid",
                check=models.Q(status__in=CustomBibliographyFileStatus.STATUSES),
            ),
        ]

    @property
    def chunks(self):
        chunks = {
            str(pk): text
            for pk, text in self.custombibliographychunkembeddings_set.all().values_list("pk", "chunk_text")
        }
        return chunks


class CustomBibliographyChunkEmbeddings(BaseModel):
    custom_bibliography_file = models.ForeignKey(CustomBibliographyFile, on_delete=models.CASCADE)
    chunk_text = models.TextField()
    embeddings = VectorField(dimensions=1536, null=True)

    class Meta:
        indexes = [
            HnswIndex(
                name="bibliography_embeddings_hnsw", fields=["embeddings"], opclasses=["vector_l2_ops"]
            ),
        ]


class WebBibliography(BaseModel):
    metadata = models.JSONField(default=dict)
    chunks = models.JSONField(default=dict)
    hashed_link = models.CharField(max_length=64, unique=True)

    class Meta:
        verbose_name_plural = "Web Bibliographies"

    @classmethod
    def update_web_bib_metadata(
        cls, pubmed_ids_map: Dict[int, str], pmc_ids_map: Dict[str, str], doi_ids_map: Dict[str, str]
    ) -> None:
        if not any([pubmed_ids_map, pmc_ids_map, doi_ids_map]):
            return

        if not settings.PHARMACOGNITIVE_API_URL:
            return

        pubmed_ids = list(pubmed_ids_map.keys())
        pmc_ids = list(pmc_ids_map.keys())
        doi_ids = list(doi_ids_map.keys())
        pubmed_metadata_found, pmc_metadata_found, doi_metadata_found = get_metadata(
            pmid_list=pubmed_ids, pmc_list=pmc_ids, doi_list=doi_ids
        )

        hashed_link_found_metadata_map = {
            pubmed_ids_map.get(pubmed_id): metadata for pubmed_id, metadata in pubmed_metadata_found.items()
        }
        hashed_link_found_metadata_map.update(
            {pmc_ids_map.get(pmc_id): metadata for pmc_id, metadata in pmc_metadata_found.items()}
        )
        hashed_link_found_metadata_map.update(
            {doi_ids_map.get(doi_id): metadata for doi_id, metadata in doi_metadata_found.items()}
        )

        hashed_links = list(hashed_link_found_metadata_map.keys())
        web_bib_records = cls.objects.filter(hashed_link__in=hashed_links)
        for web_bib in web_bib_records:
            existing_metadata = web_bib.metadata or {}
            additional_metadata = hashed_link_found_metadata_map[web_bib.hashed_link]
            existing_metadata.update(additional_metadata)
            web_bib.metadata = existing_metadata

        if web_bib_records:
            cls.objects.bulk_update(web_bib_records, ["metadata"])
