from unittest.mock import MagicMock

from django.test import TestCase

from documents.document_export.pdf_generator import PDFGenerator
from documents.document_export.utils import simplify_url


class TestSimplifyUrl(TestCase):
    def test_http_url(self):
        self.assertEqual(simplify_url("http://example.com/path/to/resource"), "example.com/path")

    def test_https_url(self):
        self.assertEqual(simplify_url("https://example.com/path/to/resource"), "example.com/path")

    def test_www_url(self):
        self.assertEqual(simplify_url("http://www.example.com/path/to/resource"), "example.com/path")

    def test_pubmed_url(self):
        self.assertEqual(simplify_url("https://pubmed.ncbi.nlm.nih.gov/12345678"), "PMID12345678")

    def test_pmc_url(self):
        self.assertEqual(simplify_url("https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567"), "PMCID1234567")

    def test_long_url(self):
        self.assertEqual(
            simplify_url("http://example.com/this/is/a/very/long/path/that/should/be/truncated"),
            "example.com/this",
        )

    def test_short_url(self):
        self.assertEqual(simplify_url("http://example.com"), "example.com")


class TestPDFGenerator(TestCase):
    def setUp(self):
        self.document = MagicMock()

    def test_convert_bibs_to_bib_links(self):
        self.document.get_bibliographies.return_value = [
            {
                "id": "364a37c6-b59f-4cce-8c80-af982f0bcd23",
                "type": "pubmed",
                "metadata": {
                    "pubmed_id": 111111,
                    "authors": ["Author Aa", "Author Bb"],
                    "pub_year": 2022,
                },
            },
            {
                "id": "2d1baf47-2a9f-4e8e-8609-6a3079cb3b0d",
                "type": "websearch",
                "metadata": {
                    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC123456/",
                    "pmc_id": "PMC123456",
                    "authors": ["Author Cc", "Author Dd", "Author Ee"],
                    "pub_year": 2019,
                },
            },
            {
                "id": "2d1baf47-2a9f-4e8e-8609-6a3079cb3b0f",
                "type": "websearch",
                "metadata": {
                    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC999999/",
                },
            },
            {
                "id": "666d785c-520a-4041-91eb-0d5285c96105",
                "type": "websearch",
                "metadata": {
                    "url": "https://example.com/path/path2",
                },
            },
        ]

        pdf_generator = PDFGenerator(output_file=None, document=self.document)

        paragraph_text = (
            "This is a reference from Pubmed"
            "(BIB_ID:364a37c6-b59f-4cce-8c80-af982f0bcd23, CHUNK_ID:e24c1176-85c7-4159-8bf2-35e2acc0bcc4). "
            "This is a reference with websearch source and PMC metadata is found from DWH"
            "(BIB_ID:2d1baf47-2a9f-4e8e-8609-6a3079cb3b0d, CHUNK_ID:bb650cff-b447-4df3-b548-178005b61c7c). "
            "This is a reference with websearch source and no metadata is found from DWH"
            "(BIB_ID:2d1baf47-2a9f-4e8e-8609-6a3079cb3b0f, CHUNK_ID:bb650cff-b447-4df3-b548-178005b61c7d). "
            "This is a reference with websearch source and not from Pubmed or PMC"
            "(BIB_ID:666d785c-520a-4041-91eb-0d5285c96105, CHUNK_ID:bb650cff-b447-4df3-b548-178005b61c7e). "
        )
        expected_result = (
            "This is a reference from Pubmed"
            "(<font color='green'><a href='https://pubmed.ncbi.nlm.nih.gov/111111/'>"
            "Author Aa & Author Bb, 2022</a></font>). "
            "This is a reference with websearch source and PMC metadata is found from DWH"
            "(<font color='green'><a href='https://pmc.ncbi.nlm.nih.gov/articles/PMC123456/'>"
            "Author Cc et al., 2019</a></font>). "
            "This is a reference with websearch source and no metadata is found from DWH"
            "(<font color='green'><a href='https://pmc.ncbi.nlm.nih.gov/articles/PMC999999/'>"
            "PMCID999999</a></font>). "
            "This is a reference with websearch source and not from Pubmed or PMC"
            "(<font color='green'><a href='https://example.com/path/path2'>example.com/path</a></font>). "
        )

        result = pdf_generator._convert_bibs_to_bib_links(paragraph_text)
        self.assertEqual(result, expected_result)
