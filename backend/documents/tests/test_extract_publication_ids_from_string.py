from django.test import TestCase

from documents.logic.extract_publication_ids_from_string import (
    extract_doi_from_string,
    extract_pmcid_from_string,
    extract_publication_ids_from_string,
    extract_pubmed_from_string,
)


class TestExtractPublicationIdsFromString(TestCase):
    def setUp(self):
        self.pmc_ids_string = (
            "PMC491346401 PMC 491346402 PMC:491346403 PMCID491346404 PMCID:491346405 "
            "PMCID:PMC491346406 PMCID PMC491346407 PMCID: PMC491346408 "
            "ID: PMC491346409 https://pmc.ncbi.nlm.nih.gov/articles/PMC491346410/ PMCID-491346411"
        )

        self.doi_ids_string = (
            "doi:10.1007/s11882-015-0592-301 "
            "doi 10.1007/s11882-015-0592-302 "
            "doi: 10.1007/s11882-015-0592-303 "
            "10.1007/s11882-015-0592-304 "
            "DOI: 10.1021/acs.jcim.2c0119105 "
            "DOI:10.1234/abcd.efgh06 "
            "doi.org/10.1234/abcd.efgh07 "
            "https://doi.org/10.1234/abcd.efgh08 "
            "doi/10.1234/abcd.efgh09 "
            "doi:10.1234/abcd/efgh10 "
        )

        self.pubmed_ids_string = (
            "22415826 "
            "PMID:22415826 "
            "PMID: 36728505 "
            "PMID 36728505 "
            "pmid:36728505 "
            "pmid: 36728505 "
            "pmid 36728505 "
            "https://pubmed.ncbi.nlm.nih.gov/36728505/ "
            "PMID=22415826 "
            "pubmed:36728505 "
            "pubmed: 36728505 "
            "pubmed 36728505 "
        )

    @staticmethod
    def _build_expected(
        string="", pmc_ids=None, pubmed_ids=None, doi_nums=None
    ) -> tuple[str, list, list, list]:
        if pmc_ids is None:
            pmc_ids = []
        if pubmed_ids is None:
            pubmed_ids = []
        if doi_nums is None:
            doi_nums = []
        return string, doi_nums, pmc_ids, pubmed_ids

    def test_extract_doi_from_string(self):
        self.assertEqual(
            extract_publication_ids_from_string("https://doi.org/10.1016/j.cpr.2021.100012"),
            self._build_expected(doi_nums=["10.1016/j.cpr.2021.100012"]),
        )

    def test_extract_pmcid_from_string(self):
        updated_string, pmcids = extract_pmcid_from_string("https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567")
        self.assertEqual(updated_string, "https://pmc.ncbi.nlm.nih.gov/articles/")
        self.assertCountEqual(pmcids, ["PMC1234567"])

    def test_extract_pubmed_from_string(self):
        updated_string, pmcids = extract_pubmed_from_string("https://pubmed.ncbi.nlm.nih.gov/1234567/")
        self.assertEqual(updated_string, "https://pubmed.ncbi.nlm.nih.gov//")
        self.assertCountEqual(pmcids, ["1234567"])

    def test_extract_pmc_ids_from_string(self):
        updated_string, _, pmc_ids, _ = extract_publication_ids_from_string(self.pmc_ids_string)
        expected_pmc_ids = [
            "PMC491346406",
            "PMC491346404",
            "PMC491346411",
            "PMC491346403",
            "PMC491346407",
            "PMC491346401",
            "PMC491346405",
            "PMC491346408",
            "PMC491346410",
            "PMC491346409",
            "PMC491346402",
        ]
        self.assertEqual(updated_string, "")
        self.assertCountEqual(expected_pmc_ids, pmc_ids)

    def test_extact_doi_from_string(self):
        _, doi_nums = extract_doi_from_string(self.doi_ids_string)
        expected_doi_nums = [
            "10.1007/s11882-015-0592-302",
            "10.1021/acs.jcim.2c0119105",
            "10.1007/s11882-015-0592-304",
            "10.1007/s11882-015-0592-303",
            "10.1234/abcd/efgh10",
            "10.1234/abcd.efgh08",
            "10.1234/abcd.efgh09",
            "10.1234/abcd.efgh06",
            "10.1007/s11882-015-0592-301",
            "10.1234/abcd.efgh07",
        ]
        self.assertCountEqual(doi_nums, expected_doi_nums)

    def test_extract_pubmeds_from_string(self):
        updated_string, _, _, pubmed_ids = extract_publication_ids_from_string(self.pubmed_ids_string)
        self.assertEqual(updated_string, "")
        self.assertCountEqual(["36728505", "22415826"], pubmed_ids)

    def text_extract_from_string_with_no_ids(self):
        self.assertEqual(
            extract_publication_ids_from_string("insilico medicine"),
            self._build_expected(string="insilico medicine"),
        )
