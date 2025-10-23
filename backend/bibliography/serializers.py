import uuid
from typing import Any, Dict

from rest_framework import serializers

from base.storage.defs import AllowedStoragePresignedMethods
from base.storage.factory import get_storage
from bibliography.defs import (
    CustomBibliographyFileS3Template,
    CustomBibliographyFileStatus,
)
from bibliography.logic.preprocessing import preprocess_file
from bibliography.models import (
    Bibliography,
    BibliographyType,
    CustomBibliographyFile,
)


class PubMedMetadataSerializer(serializers.Serializer):
    pubmed_id = serializers.IntegerField()
    authors = serializers.ListField(child=serializers.CharField(allow_null=True))
    citation_count = serializers.IntegerField(allow_null=True)
    doi = serializers.CharField(allow_null=True)
    journal_name = serializers.CharField()
    pmc_id = serializers.CharField(allow_null=True)
    pub_type = serializers.ListField(child=serializers.CharField())
    pub_year = serializers.IntegerField()
    text = serializers.CharField(allow_null=True)
    title = serializers.CharField()


class WebSearchMetadataSerializer(serializers.Serializer):
    title = serializers.CharField()
    url = serializers.URLField()


class BibliographySerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=BibliographyType.choices)
    metadata = serializers.DictField()
    chunks = serializers.DictField(help_text='Example: {"chunk_id1": "text1", "chunk_id2": "text2"}')

    def validate(self, attrs):
        bib_type = attrs.get("type")
        metadata = attrs.get("metadata")

        if bib_type == BibliographyType.PUBMED:
            pubmed_serializer = PubMedMetadataSerializer(data=metadata)
            if not pubmed_serializer.is_valid():
                raise serializers.ValidationError({"metadata": pubmed_serializer.errors})
            attrs["metadata"] = pubmed_serializer.validated_data

        elif bib_type == BibliographyType.WEBSEARCH:
            websearch_serializer = WebSearchMetadataSerializer(data=metadata)
            if not websearch_serializer.is_valid():
                raise serializers.ValidationError({"metadata": websearch_serializer.errors})
            attrs["metadata"] = websearch_serializer.validated_data

        return attrs


class CreateBibilographySerializer(serializers.Serializer):
    bibliographies = BibliographySerializer(many=True, required=False)

    def create(self, validated_data):
        if bibliographies := validated_data["bibliographies"]:
            # Merge bibliographies with same identifier (pubmed_id for PubMed, url for WebSearch)
            bibliographies = self._merge_duplicate_bibliographies(bibliographies)

            if pubmed_bibliographies := [
                bib for bib in bibliographies if bib["type"] == BibliographyType.PUBMED
            ]:
                pubmed_data = {bib["metadata"]["pubmed_id"]: bib for bib in pubmed_bibliographies}
                pmid_bib_id_mapping = Bibliography.update_and_create_pubmed_bibliographies(pubmed_data)
                for bib in pubmed_bibliographies:
                    bib_id = pmid_bib_id_mapping.get(bib["metadata"]["pubmed_id"])
                    if bib_id is not None:
                        bib["id"] = bib_id

            if websearch_bibliographies := [
                bib for bib in bibliographies if bib["type"] == BibliographyType.WEBSEARCH
            ]:
                websearch_data = {}
                for bib in websearch_bibliographies:
                    bib["id"] = str(uuid.uuid4())
                    for chunk_id, chunk in bib["chunks"].items():
                        websearch_data[(bib["id"], chunk_id)] = {
                            "source": bib["metadata"]["url"],
                            "title": bib["metadata"]["title"],
                            "chunk": chunk,
                        }
                chunk_id_bib_id_mapping = Bibliography.update_and_create_web_bibliographies(websearch_data)
                for bib in websearch_bibliographies:
                    for chunk_id, _ in bib["chunks"].items():
                        mapping_result = chunk_id_bib_id_mapping.get((bib["id"], chunk_id))
                        if mapping_result is not None:
                            bib["id"], _ = mapping_result

            # Filter out bibliographies without valid IDs before updating validated_data
            valid_bibliographies = [bib for bib in bibliographies if bib.get("id") is not None]
            validated_data["bibliographies"] = valid_bibliographies

        return validated_data

    def _merge_duplicate_bibliographies(self, bibliographies):
        """
        Merge bibliographies with same identifier by combining their chunks.
        For PubMed: same pubmed_id
        For WebSearch: same url
        """
        bibliography_map = {}

        for bib in bibliographies:
            # Determine unique identifier based on type
            if bib["type"] == BibliographyType.PUBMED:
                identifier = ("pubmed", bib["metadata"]["pubmed_id"])
            elif bib["type"] == BibliographyType.WEBSEARCH:
                identifier = ("websearch", bib["metadata"]["url"])
            else:
                # For other types, treat each as unique
                identifier = ("other", id(bib))

            if identifier in bibliography_map:
                # Merge chunks with existing bibliography
                existing_bib = bibliography_map[identifier]
                existing_bib["chunks"].update(bib["chunks"])
            else:
                # First occurrence of this identifier
                bibliography_map[identifier] = {
                    "type": bib["type"],
                    "metadata": bib["metadata"],
                    "chunks": bib["chunks"].copy(),
                }

        return list(bibliography_map.values())


class CustomBibliographyFileListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomBibliographyFile
        fields = ["pk", "name", "status", "created_at", "updated_at"]


class CustomBibliographyFileDetailSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomBibliographyFile
        fields = [
            "pk",
            "name",
            "status",
            "created_at",
            "updated_at",
            "download_url",
            "metadata",
        ]

    @staticmethod
    def get_download_url(bibliography_file: CustomBibliographyFile) -> str:
        file_key = CustomBibliographyFileS3Template.format(pk=bibliography_file.pk)

        download_url = get_storage().generate_presigned_url(
            client_method=AllowedStoragePresignedMethods.GET,
            file_key=file_key,
        )

        return download_url


class CustomBibliographyFileCreateSerializer(serializers.ModelSerializer):
    upload_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomBibliographyFile
        fields = ["pk", "name", "upload_url"]

    @staticmethod
    def get_upload_url(bibliography_file: CustomBibliographyFile) -> str:
        file_key = CustomBibliographyFileS3Template.format(pk=bibliography_file.pk)
        upload_url = get_storage().generate_presigned_url(
            client_method=AllowedStoragePresignedMethods.PUT,
            file_key=file_key,
        )

        return upload_url

    @staticmethod
    def get_upload_headers(bibliography_file: CustomBibliographyFile) -> dict:
        """Return required headers for Azure Blob Storage PUT operation"""
        return {"x-ms-blob-type": "BlockBlob"}

    def create(self, validated_data: Dict[str, Any]) -> CustomBibliographyFile:
        validated_data["user_id"] = self.context["request"].user.pk
        custom_bibliography_file = super().create(validated_data)
        Bibliography.get_or_create(custom_bibliography_file)

        return custom_bibliography_file


class CustomBibliographyFileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomBibliographyFile
        fields = ["name", "status"]

    def validate_status(self, new_status: str) -> str:
        previous_status = self.instance.status

        if (previous_status, new_status) not in CustomBibliographyFileStatus.POSSIBLE_MANUAL_STATUS_CHANGES:
            raise serializers.ValidationError(
                "Attempt to change status failed. Possible pairs of previous/new statuses: "
                f"{CustomBibliographyFileStatus.POSSIBLE_MANUAL_STATUS_CHANGES}"
            )
        return new_status

    def update(
        self,
        instance: CustomBibliographyFile,
        validated_data: Dict[str, Any],
    ) -> CustomBibliographyFile:
        if "name" in validated_data:
            instance.metadata = instance.metadata or {}
            instance.metadata["file_name"] = validated_data["name"]
            validated_data["metadata"] = instance.metadata

        updated_instance = super().update(instance, validated_data)

        if "status" in validated_data and updated_instance.status == CustomBibliographyFileStatus.UPLOADED:
            preprocess_file.delay(instance.pk)

        return updated_instance
