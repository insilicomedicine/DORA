from unittest.mock import patch

from django.test import TestCase

from dwh.metadata.postprocessing import get_metadata


class TestGetMetadata(TestCase):
    @patch("dwh.metadata.postprocessing.make_dwh_chunks_or_metadata_request")
    def test_get_metadata_with_pubmed_ids(self, mock_request):
        mock_response = [
            {
                "doi": "10.11111/aging.22222",
                "text": "Sample Text",
                "title": "Sample Title",
                "pmc_id": "PMC9000000",
                "authors": ["Author1", "Author2"],
                "pub_type": ["Journal Article"],
                "pub_year": 2022,
                "pubmed_id": 123456,
                "journal_name": "Aging",
                "citation_count": 15,
            }
        ]
        mock_request.return_value = mock_response

        pmid_list = [123456]
        pmc_list = []
        doi_list = []
        pubmed_metadata, pmc_metadata, doi_metadata = get_metadata(pmid_list, pmc_list, doi_list)

        expected_pubmed_metadata = {
            123456: {
                "doi": "10.11111/aging.22222",
                "text": "Sample Text",
                "title": "Sample Title",
                "pmc_id": "PMC9000000",
                "authors": ["Author1", "Author2"],
                "pub_type": ["Journal Article"],
                "pub_year": 2022,
                "pubmed_id": 123456,
                "journal_name": "Aging",
                "citation_count": 15,
            }
        }

        self.assertEqual(pubmed_metadata, expected_pubmed_metadata)
        self.assertEqual(pmc_metadata, {})
        self.assertEqual(doi_metadata, {})

    @patch("dwh.metadata.postprocessing.make_dwh_chunks_or_metadata_request")
    def test_get_metadata_with_doi_ids(self, mock_request):
        mock_response = [
            {
                "doi": "10.11111/aging.22222",
                "text": "Sample Text",
                "title": "Sample Title",
                "pmc_id": "PMC9000000",
                "authors": ["Author1", "Author2"],
                "pub_type": ["Journal Article"],
                "pub_year": 2022,
                "pubmed_id": 123456,
                "journal_name": "Aging",
                "citation_count": 15,
            }
        ]
        mock_request.return_value = mock_response

        pmid_list = []
        pmc_list = []
        doi_list = ["10.11111/aging.22222", "10.11111/aging.33333", "10.11111/aging.44444"]
        pubmed_metadata, pmc_metadata, doi_metadata = get_metadata(pmid_list, pmc_list, doi_list)

        expected_doi_metadata = {
            "10.11111/aging.22222": {
                "doi": "10.11111/aging.22222",
                "text": "Sample Text",
                "title": "Sample Title",
                "pmc_id": "PMC9000000",
                "authors": ["Author1", "Author2"],
                "pub_type": ["Journal Article"],
                "pub_year": 2022,
                "pubmed_id": 123456,
                "journal_name": "Aging",
                "citation_count": 15,
            }
        }

        self.assertEqual(pubmed_metadata, {})
        self.assertEqual(pmc_metadata, {})
        self.assertEqual(doi_metadata, expected_doi_metadata)

    @patch("dwh.metadata.postprocessing.make_dwh_chunks_or_metadata_request")
    def test_get_metadata_with_multiple_type_of_ids(self, mock_request):
        mock_response = [
            {
                "pubmed_id": 123456,
                "pmc_id": None,
                "text": "Sample text for PubMed",
                "citation_count": 10,
                "journal_name": "Sample Journal",
                "pub_type": "Research",
                "pub_year": 2021,
                "title": "Sample PubMed Title",
                "authors": ["Author1", "Author2"],
                "doi": None,
            },
            {
                "pubmed_id": None,
                "pmc_id": "PMC123456",
                "text": "Sample text for PMC",
                "citation_count": 5,
                "journal_name": "Another Journal",
                "pub_type": "Review",
                "pub_year": 2020,
                "title": "Sample PMC Title",
                "authors": ["Author3", "Author4"],
                "doi": None,
            },
        ]
        mock_request.return_value = mock_response

        pmid_list = [123456, 654321]
        pmc_list = ["PMC123456"]
        doi_list = []
        pubmed_metadata, pmc_metadata, doi_metadata = get_metadata(pmid_list, pmc_list, doi_list)

        expected_pubmed_metadata = {
            123456: {
                "pubmed_id": 123456,
                "pmc_id": None,
                "text": "Sample text for PubMed",
                "citation_count": 10,
                "journal_name": "Sample Journal",
                "pub_type": "Research",
                "pub_year": 2021,
                "title": "Sample PubMed Title",
                "authors": ["Author1", "Author2"],
                "doi": None,
            }
        }

        expected_pmc_metadata = {
            "PMC123456": {
                "pubmed_id": None,
                "pmc_id": "PMC123456",
                "text": "Sample text for PMC",
                "citation_count": 5,
                "journal_name": "Another Journal",
                "pub_type": "Review",
                "pub_year": 2020,
                "title": "Sample PMC Title",
                "authors": ["Author3", "Author4"],
                "doi": None,
            }
        }

        self.assertEqual(pubmed_metadata, expected_pubmed_metadata)
        self.assertEqual(pmc_metadata, expected_pmc_metadata)
        self.assertEqual(doi_metadata, {})

    @patch("dwh.metadata.postprocessing.make_dwh_chunks_or_metadata_request")
    def test_get_metadata_with_empty_lists(self, mock_request):
        pmid_list = []
        pmc_list = []
        doi_list = []
        pubmed_metadata, pmc_metadata, doi_metadata = get_metadata(pmid_list, pmc_list, doi_list)

        self.assertEqual(pubmed_metadata, {})
        self.assertEqual(pmc_metadata, {})
        self.assertEqual(doi_metadata, {})
        mock_request.assert_not_called()
