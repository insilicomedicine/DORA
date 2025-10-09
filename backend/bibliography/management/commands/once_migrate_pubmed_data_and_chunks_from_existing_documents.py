import json

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from bibliography.models import Bibliography
from documents.models import Document, Section
from dwh.metadata.parser import PmIdChunkIdParser
from dwh.models import BibliographyPubMed


class Command(BaseCommand):
    help = "Migrate Pubmed data and chunks from existing documents once"

    def handle(self, *args, **kwargs):
        self.stdout.write(
            self.style.SUCCESS("Starting migration of Pubmed data and chunks from existing documents...")
        )

        self.generate_bibliographies_from_section_metadata_pmids()
        self.update_bibliographies_chunks_from_section_metadata_chunks()
        self.replace_pmid_to_bib_id_in_section_text()
        self.refresh_documents_bibliographies()

        self.stdout.write(self.style.SUCCESS("Migration completed successfully."))

    def generate_bibliographies_from_section_metadata_pmids(self):
        section_results = Section.objects.values_list("result", flat=True)
        for section_result in section_results:
            pmid_data = (section_result or {}).get("metadata", {}).get("pmids")
            if not pmid_data:
                continue

            existing_pmids = BibliographyPubMed.objects.filter(pubmed_id__in=pmid_data.keys()).values_list(
                "pubmed_id", flat=True
            )
            new_pubmeds = []
            for pmid, pubmed_data in pmid_data.items():
                if int(pmid) not in existing_pmids:
                    metadata = {
                        "pubmed_id": int(pmid),
                        "text": pubmed_data.pop("citation_text", ""),
                        **pubmed_data,
                    }
                    new_pubmeds.append(
                        {
                            "pubmed_id": int(pmid),
                            "metadata": metadata,
                            "chunks": {},
                        }
                    )

            new_pubmed_bibliographies = BibliographyPubMed.objects.bulk_create(
                [BibliographyPubMed(**pubmed) for pubmed in new_pubmeds]
            )
            Bibliography.objects.bulk_create(
                [Bibliography(content_object=pubmed) for pubmed in new_pubmed_bibliographies]
            )

    def update_bibliographies_chunks_from_section_metadata_chunks(self):
        non_existing_pmids = []
        sections = Section.objects.all()
        for section in sections:
            chunks_data = (section.result or {}).get("metadata", {}).get("chunks")
            if not chunks_data:
                continue

            pubmed_chunks = {}
            for chunk_id, chunk_data in chunks_data.items():
                pmid = chunk_data.get("pubmed_id")
                chunk_text = chunk_data.get("abstract_chunk") or chunk_data.get("fulltext_chunk")
                if pmid and chunk_text:
                    if pmid in pubmed_chunks:
                        pubmed_chunks[pmid].update({chunk_id: chunk_text})
                    else:
                        pubmed_chunks[pmid] = {chunk_id: chunk_text}

            existing_pubmed_bibliographies = BibliographyPubMed.objects.filter(
                pubmed_id__in=pubmed_chunks.keys()
            )
            for pubmed_bibliography in existing_pubmed_bibliographies:
                new_pubmed_chunks = pubmed_chunks[pubmed_bibliography.pubmed_id]
                if new_pubmed_chunks.keys() - (pubmed_bibliography.chunks or {}).keys():
                    pubmed_bibliography.chunks.update(new_pubmed_chunks)
                    pubmed_bibliography.save()

            non_existing_pmids_set = pubmed_chunks.keys() - existing_pubmed_bibliographies.values_list(
                "pubmed_id", flat=True
            )
            if non_existing_pmids_set:
                non_existing_pmids.extend(non_existing_pmids_set)
                self.stdout.write(
                    self.style.ERROR(
                        f"Section {section.id} Pubmed IDs not found in the database: {non_existing_pmids_set}"
                    )
                )
                print(section.created_at)

        if non_existing_pmids:
            non_existing_pmids = list(set(non_existing_pmids))
            with open("non_existing_pmids.json", "w") as f:
                json.dump(non_existing_pmids, f)

    def replace_pmid_to_bib_id_in_section_text(self):
        pmid_bib_id_mapping = self._get_pmid_bib_id_mapping()

        sections = Section.objects.all()
        for section in sections:
            section_data = {}
            result_data = (section.result or {}).get("data")
            if result_data:
                parser = PmIdChunkIdParser(input_text=result_data)
                parser.parse()

                if pmid_list := parser.pmid_list:
                    for pmid in pmid_list:
                        if bib_id := pmid_bib_id_mapping.get(pmid):
                            result_data = result_data.replace(f"PMID:{pmid}", f"BIB_ID:{bib_id}")
                    section_data["data"] = result_data

            result_data_format = (section.result or {}).get("data_format")
            if result_data_format:
                result_data_format_str = json.dumps(result_data_format)
                parser = PmIdChunkIdParser(input_text=result_data_format_str)
                parser.parse()

                if pmid_list := parser.pmid_list:
                    for pmid in pmid_list:
                        if bib_id := pmid_bib_id_mapping.get(pmid):
                            result_data_format_str = result_data_format_str.replace(
                                f"PMID:{pmid}", f"BIB_ID:{bib_id}"
                            )
                    section_data["data_format"] = json.loads(result_data_format_str)

            if section_data:
                section.update_fields({"result": section_data})

    def refresh_documents_bibliographies(self):
        docs = Document.objects.all()
        for doc in docs:
            doc.refresh_bibliographies()

    def _get_pmid_bib_id_mapping(self):
        pubmed_content_type = ContentType.objects.get_for_model(BibliographyPubMed)
        bibliographies = Bibliography.objects.filter(content_type=pubmed_content_type)
        return {bib.content_object.pubmed_id: str(bib.id) for bib in bibliographies}
