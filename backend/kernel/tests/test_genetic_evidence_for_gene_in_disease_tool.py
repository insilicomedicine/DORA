from copy import deepcopy
from unittest.mock import patch

from django.test import TestCase

from kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease import (
    MAX_GENETIC_VARIANTS,
    GeneticEvidenceForGeneInDiseaseTool,
    GeneticVariantConstants,
    filter_genetic_evidence,
    get_data_page_from_dwh,
    retrieve_genetic_evidence_data,
)
from kernel.tests.defs import GENETIC_VARIANTS


@patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.retrieve_genetic_evidence_data")
@patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.get_efo_id_by_disease_name")
@patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.get_ensembl_by_gene_symbol")
class GeneticEvidenceForGeneInDiseaseToolTest(TestCase):
    def setUp(self):
        self.gene_symbol = "WRN"
        self.gene_ensembl_id = "ENSG00000165392"

        self.disease_efo_id = "Orphanet_902"
        self.disease_name = "Werner syndrome"

        self.data_type = "expression"

        self.expected_tool_output = [
            {
                "genetic_variant": "p.Thr1011fs",
                "clinical_significance": GeneticVariantConstants.PATHOGENIC,
                "mutation_type": "Deletion",
                "source": "Clinvar",
            },
            {
                "genetic_variant": "p.Val1082fs",
                "clinical_significance": GeneticVariantConstants.PATHOGENIC,
                "mutation_type": "Deletion",
                "source": "Clinvar",
            },
            {
                "genetic_variant": "p.Thr1011fs",
                "clinical_significance": GeneticVariantConstants.PATHOGENIC,
                "mutation_type": "Deletion",
                "source": "Clinvar",
            },
            {
                "genetic_variant": "p.Val1082fs",
                "clinical_significance": GeneticVariantConstants.PATHOGENIC,
                "mutation_type": "Deletion",
                "source": "Clinvar",
            },
            {
                "genetic_variant": "p.Thr1011fs",
                "clinical_significance": GeneticVariantConstants.PATHOGENIC,
                "mutation_type": "Deletion",
                "source": "Clinvar",
            },
        ]

    def test__run__gene_and_disease_with_expression_comparison__returned_data_with_required_fields(
        self,
        patched_get_ensembl_by_gene_symbol,
        patched_get_efo_id_by_disease_name,
        patched_retrieve_gen_ev,
    ):
        patched_get_ensembl_by_gene_symbol.return_value = self.gene_ensembl_id
        patched_get_efo_id_by_disease_name.return_value = self.disease_efo_id
        patched_retrieve_gen_ev.return_value = deepcopy(GENETIC_VARIANTS) * 3

        tool = GeneticEvidenceForGeneInDiseaseTool()
        result = tool._run(gene_name=self.gene_symbol, disease_name=self.disease_name)

        self.assertIsInstance(result, list)
        required_fields_only = ["genetic_variant", "clinical_significance", "mutation_type", "source"]
        self.assertListEqual(list(result[0].keys()), required_fields_only)
        self.assertListEqual(result, self.expected_tool_output)

        patched_retrieve_gen_ev.assert_called_with(
            gene_ensembl_id=self.gene_ensembl_id,
            disease_efo_id=self.disease_efo_id,
        )

    def test__run__failed_to_get_expression__tool_has_succeded_returns_empty_list(
        self,
        patched_get_ensembl_by_gene_symbol,
        patched_get_efo_id_by_disease_name,
        patched_get_exp_or_met_data,
    ):
        patched_get_ensembl_by_gene_symbol.return_value = self.gene_ensembl_id
        patched_get_efo_id_by_disease_name.return_value = self.disease_efo_id
        patched_get_exp_or_met_data.side_effect = ValueError("Something went wrong")

        tool = GeneticEvidenceForGeneInDiseaseTool()
        result = tool._run(gene_name=self.gene_symbol, disease_name=self.disease_name)
        self.assertListEqual(result, [])

        patched_get_exp_or_met_data.assert_called_with(
            gene_ensembl_id=self.gene_ensembl_id,
            disease_efo_id=self.disease_efo_id,
        )


class FilterGeneticEvidenceTest(TestCase):
    """
    Couple of acronyms used in names:
        lt: less than
        lte: less or equal then
        gt: greater than
        gte: you name it

    In the following description top_n is a short alias to MAX_GENETIC_VARIANTS.
    The conditions are too complex to be endcoded in test names so there's a list of tests:

    1. Genetic variants API returns less or equal to top_n values, no filtering is applied
    2. API returns more than top_n (here and in all of the following points) values and if after initial
       filtering by GeneticVariantConstants.PATHOGENIC there are less or equal to top_n values left, stop
       filtering
    * After initial filtering by GeneticVariantConstants.PATHOGENIC there are still more than top_n left,
       so apply filtering by GeneticVariantConstants.NAME_SUFFIX
    3. There are less or equal values left, return first top_n values not filtering by suffix
    4. There are still more than top_n, return first top_n values filtered by suffix
    5. What if more than MAX, but no pathogenic? Currently will return empty list
    """

    @staticmethod
    def generate_genetic_variants(clin_sig_value, suffix, size):
        variant_template = {
            "dbsnp": "rs121908446",
            "name": f"p.Arg1305T{suffix}",
            "clin_sig_corrected": clin_sig_value,
            "type": "SNV",
            "source": "Clinvar",
        }
        return [variant_template for _ in range(size)]

    def create_genetic_variants_conflicting(
        self,
        size=MAX_GENETIC_VARIANTS * 10,
    ):
        return self.generate_genetic_variants(
            clin_sig_value="conflicting",
            suffix="",
            size=size,
        )

    def create_genetic_variants_pathogenic(
        self,
        suffix,
        size=MAX_GENETIC_VARIANTS * 10,
    ):
        return self.generate_genetic_variants(
            clin_sig_value=GeneticVariantConstants.PATHOGENIC,
            suffix=suffix,
            size=size,
        )

    def create_genetic_variants_pathogenic_with_suffix(self, size, suffix):
        return self.create_genetic_variants_pathogenic(size=size, suffix=suffix)

    def create_genetic_variants_mixed_pathogenic_and_conflicting(
        self,
        pathogenic_size=MAX_GENETIC_VARIANTS,
        conflicting_size=MAX_GENETIC_VARIANTS,
        suffix="er",
    ):
        pathogenic = self.create_genetic_variants_pathogenic(size=pathogenic_size, suffix=suffix)
        conflicting = self.create_genetic_variants_conflicting(size=conflicting_size)
        return [*pathogenic, *conflicting]

    def test__filter_genetic_evidence__condition1__no_filtering_applied(self):
        for sub_test_name, size in [
            ("Less", MAX_GENETIC_VARIANTS - 1),
            ("Equal", MAX_GENETIC_VARIANTS),
        ]:
            with self.subTest(msg=sub_test_name):
                genetic_variants = self.create_genetic_variants_pathogenic(size=size, suffix="any")
                result = filter_genetic_evidence(data=genetic_variants)
                self.assertEqual(len(result), size)
                self.assertListEqual(result, genetic_variants)

    def test__filter_genetic_evidence__condition2__filter_by_pathogenic_only_applied_return_top_n(
        self,
    ):
        genetic_variants = self.create_genetic_variants_mixed_pathogenic_and_conflicting()
        result = filter_genetic_evidence(data=genetic_variants)

        self.assertEqual(len(result), MAX_GENETIC_VARIANTS)
        self.assertSetEqual(
            set([item["clin_sig_corrected"] for item in result]),
            {GeneticVariantConstants.PATHOGENIC},
        )

    def test__filter_genetic_evidence__condition3__filter_by_pathogenic_no_filter_by_suffix_return_top_n(
        self,
    ):
        genetic_variants = self.create_genetic_variants_mixed_pathogenic_and_conflicting(
            pathogenic_size=MAX_GENETIC_VARIANTS * 2,
            conflicting_size=MAX_GENETIC_VARIANTS,
            suffix="foobar",
        )
        result = filter_genetic_evidence(data=genetic_variants)

        self.assertEqual(len(result), MAX_GENETIC_VARIANTS)
        self.assertListEqual(result, genetic_variants[:MAX_GENETIC_VARIANTS])

    def test__filter_genetic_evidence__condition4__filter_by_pathogenic_and_by_suffix_return_top_n(
        self,
    ):
        genetic_variants = self.create_genetic_variants_mixed_pathogenic_and_conflicting(
            pathogenic_size=MAX_GENETIC_VARIANTS * 2,
            conflicting_size=MAX_GENETIC_VARIANTS,
            suffix=GeneticVariantConstants.NAME_SUFFIX,
        )
        result = filter_genetic_evidence(data=genetic_variants)

        self.assertEqual(len(result), MAX_GENETIC_VARIANTS)
        self.assertListEqual(result, genetic_variants[:MAX_GENETIC_VARIANTS])


class GetDataFromDwhTest(TestCase):
    PATCHED_GENETIC_EVIDENCE_API_MAX_PAGE_SIZE = 5

    def setUp(self):
        self.page_data = {"data": deepcopy(GENETIC_VARIANTS), "total": len(GENETIC_VARIANTS)}
        self.endpoint = "/gene/normal_tissue"
        self.params = {
            "efo_id": "EFO_1234",
            "gene_ensembl_id": "ENSG42",
            "limit": len(GENETIC_VARIANTS),
        }
        self.versions = {"v1": 123}

    @patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.make_dwh_api_request")
    def test__get_data_page_from_dwh__dwh_request_successful__responded_with_valid_page_data(
        self,
        patched_make_dwh_api_request,
    ):
        offset = 0
        patched_make_dwh_api_request.return_value = self.page_data
        data = get_data_page_from_dwh(
            endpoint=self.endpoint,
            params=self.params,
            versions=self.versions,
            offset=offset,
        )

        self.assertIsNotNone(data)
        self.assertDictEqual(data, self.page_data)

        patched_make_dwh_api_request.assert_called_with(
            endpoint=self.endpoint,
            params={
                "offset": offset,
                **self.params,
                **self.versions,
            },
        )

    @patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.make_dwh_api_request")
    def test__get_data_page_from_dwh__dwh_request_failed__raises_value_error_with_msg(
        self,
        patched_make_dwh_api_request,
    ):
        offset = 0
        patched_make_dwh_api_request.return_value = None

        with self.assertRaisesMessage(
            ValueError,
            f"Failed to retrieve page of data from DWH: endpoint={self.endpoint}, params={self.params},"
            f" versions={self.versions}, offset={offset}",
        ):
            get_data_page_from_dwh(
                endpoint=self.endpoint,
                params=self.params,
                versions=self.versions,
                offset=offset,
            )

    @patch(
        "kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease",
        "GENETIC_EVIDENCE_API_MAX_PAGE_SIZE",
        PATCHED_GENETIC_EVIDENCE_API_MAX_PAGE_SIZE,
    )
    @patch("kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease.make_dwh_api_request")
    def test__retrieve_genetic_evidence_data__all_params_valid_data_in_dwh_is_present__returns_valid_results(
        self,
        patched_make_dwh_api_request,
    ):
        full_page_size = len(GENETIC_VARIANTS)
        total = full_page_size * 3 - 2
        last_page_size = 3

        full_page_data = deepcopy(GENETIC_VARIANTS)
        last_page_data = deepcopy(GENETIC_VARIANTS[:last_page_size])
        expected_result = [*full_page_data, *full_page_data, *last_page_data]

        first_page = {"data": full_page_data, "total": total}
        middle_page = deepcopy(first_page)
        last_page = {"data": last_page_data, "total": total}

        patched_make_dwh_api_request.side_effect = [first_page, middle_page, last_page]

        result = retrieve_genetic_evidence_data(
            gene_ensembl_id=self.params["gene_ensembl_id"],
            disease_efo_id=self.params["efo_id"],
        )

        self.assertEqual(patched_make_dwh_api_request.call_count, 3)
        self.assertListEqual(result, expected_result)
