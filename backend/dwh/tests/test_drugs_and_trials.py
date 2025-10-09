from copy import deepcopy
from unittest.mock import Mock, patch

from django.test import TestCase

from dwh.drugs_and_trials.defs import UNSPECIFIED
from dwh.drugs_and_trials.defs import DrugsAndTrialsColumnNames as DnTNames
from dwh.drugs_and_trials.dnt_data_loader import DrugsAndTrialsDataLoader
from dwh.tests.defs import PC_V2_DRUGS_AND_TRIALS_RESPONSE


class TestInternalMethodsDrugsAndTrialsDataLoader(TestCase):
    def test__parse_year__different_data__received_correct_result(self):
        for raw_date, expected_year in [
            (2020, "2020"),
            ("2020", "2020"),
            ("2023-06-27", "2023"),
            ("June 27, 2023", "2023"),
            ("", UNSPECIFIED),
            (None, UNSPECIFIED),
        ]:
            with self.subTest(msg=f"{raw_date} -> {expected_year}"):
                answer = DrugsAndTrialsDataLoader._parse_year(raw_date)
                self.assertEqual(answer, expected_year)

    def test__prepare_pc_api_response__data_empty__received_empty_dataframe(self):
        api_response_df = DrugsAndTrialsDataLoader._prepare_pc_api_response([])
        self.assertTrue(api_response_df.empty)

    def test__prepare_pc_api_response__dnt_data_exists__received_df_with_correct_data(self):
        dnt_data = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
        api_response_df = DrugsAndTrialsDataLoader._prepare_pc_api_response(dnt_data)
        self.assertFalse(api_response_df.empty)
        prepared_data = api_response_df.to_dict("records")

        data = {row["nct_id"]: row for row in prepared_data}
        self.assertEqual(data["LONG_DATE"]["completion_year"], "2007")
        self.assertEqual(data["EMPTY_DATE"]["completion_year"], UNSPECIFIED)
        self.assertIsNone(data["EMPTY_DISEASE_FIELDS"]["disease_id"])
        self.assertEqual(data["EMPTY_DISEASE_FIELDS"]["disease_name"], UNSPECIFIED)
        self.assertEqual(data["TWO_PHASES"]["phase"], "Phase 1/Phase 2")
        self.assertFalse(any([True for row in prepared_data if DnTNames.PRIMARY_COMPLETION_DATE in row]))
        self.assertTrue(any([True for row in prepared_data if DnTNames.COMPLETION_YEAR in row]))


class TestGeneMethodsDrugsAndTrialsDataLoader(TestCase):
    @patch("dwh.drugs_and_trials.dnt_data_loader.get_clinical_trial_drugs_and_trials_gene")
    def test__get_drugs_agg_info_for_gene__dnt_data_exists__received_correct_answer(
        self,
        patched_get_clinical_trial_drugs_and_trials_gene: Mock,
    ):
        patched_get_clinical_trial_drugs_and_trials_gene.return_value = deepcopy(
            PC_V2_DRUGS_AND_TRIALS_RESPONSE
        )
        data = DrugsAndTrialsDataLoader.get_drugs_data_for_gene("gene")
        self.assertDictEqual(
            data[0],
            {
                "compound_id": "CHEMBL514200",
                "compound_name": "TALMAPIMOD",
                "disease_id": "EFO_0000685",
                "disease_name": "rheumatoid arthritis",
                "drug_name": "SCIO-469",
                "drug_type": "Small Molecule",
                "gene_id": "ENSG00000112062",
                "gene_symbol": "MAPK14",
                "nct_id": "NCT00089921",
                "phase": "Phase 1",
                "sponsor_lead": "Scios, Inc.",
                "completion_year": "2005",
            },
        )

    @patch("dwh.drugs_and_trials.dnt_data_loader.get_clinical_trial_drugs_and_trials_gene")
    def test__get_drugs_agg_info_for_gene__dnt_data_empty__received_empty_schema(
        self,
        patched_get_clinical_trial_drugs_and_trials_gene: Mock,
    ):
        patched_get_clinical_trial_drugs_and_trials_gene.return_value = []
        data = DrugsAndTrialsDataLoader.get_drugs_data_for_gene("gene")
        self.assertEqual(data, [])

    @patch("dwh.drugs_and_trials.dnt_data_loader.get_clinical_trial_drugs_and_trials_disease")
    def test__get_drugs_data_for_disease__dnt_data_exists__received_correct_answer(
        self,
        patched_get_clinical_trial_drugs_and_trials_disease: Mock,
    ):
        patched_get_clinical_trial_drugs_and_trials_disease.return_value = deepcopy(
            PC_V2_DRUGS_AND_TRIALS_RESPONSE
        )
        data = DrugsAndTrialsDataLoader.get_drugs_data_for_disease("disease")
        self.assertDictEqual(
            data[0],
            {
                "compound_id": "CHEMBL514200",
                "compound_name": "TALMAPIMOD",
                "disease_id": "EFO_0000685",
                "disease_name": "rheumatoid arthritis",
                "drug_name": "SCIO-469",
                "drug_type": "Small Molecule",
                "gene_id": "ENSG00000112062",
                "gene_symbol": "MAPK14",
                "nct_id": "NCT00089921",
                "phase": "Phase 1",
                "sponsor_lead": "Scios, Inc.",
                "completion_year": "2005",
            },
        )

    @patch("dwh.drugs_and_trials.dnt_data_loader.get_clinical_trial_drugs_and_trials_disease")
    def test__get_drugs_data_for_disease__dnt_data_empty__received_empty_schema(
        self,
        patched_get_clinical_trial_drugs_and_trials_disease: Mock,
    ):
        patched_get_clinical_trial_drugs_and_trials_disease.return_value = []
        data = DrugsAndTrialsDataLoader.get_drugs_data_for_disease("disease")
        self.assertEqual(data, [])
