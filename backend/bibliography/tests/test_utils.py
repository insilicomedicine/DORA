from django.test import TestCase

from bibliography.utils import extract_source_identifier_from_url


class TestExtractSourceIdentifierFromUrl(TestCase):
    def test_pubmed_url(self):
        url = "https://pubmed.ncbi.nlm.nih.gov/12345678/"
        expected_result = ("pubmed", "12345678", "PMID12345678")
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)

    def test_pmc_url(self):
        url = "https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/"
        expected_result = ("pmc", "PMC1234567", "PMCID1234567")
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)

    def test_another_pmc_url(self):
        url = "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/"
        expected_result = ("pmc", "PMC1234567", "PMCID1234567")
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)

    def test_invalid_url(self):
        url = "https://example.com/12345678/"
        expected_result = (None, None, None)
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)

    def test_pubmed_url_no_match(self):
        url = "https://pubmed.ncbi.nlm.nih.gov/"
        expected_result = (None, None, None)
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)

    def test_pmc_url_no_match(self):
        url = "https://pmc.ncbi.nlm.nih.gov/articles/"
        expected_result = (None, None, None)
        result = extract_source_identifier_from_url(url)
        self.assertEqual(result, expected_result)
