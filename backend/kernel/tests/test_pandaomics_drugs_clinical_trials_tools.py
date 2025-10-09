from copy import deepcopy
from unittest.mock import Mock, patch

from django.test import TestCase

from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_studies import (
    DrugsClinicalTrialsClinicalStudiesTool,
)
from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_trials_top_drugs_tool import (
    DrugsClinicalTrialsTopDrugsTool,
)
from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_trials_top_sponsors_tool import (
    DrugsClinicalTrialsTopSponsorsTool,
)
from kernel.tests.defs import (
    DISEASE,
    DISEASE_EFO_ID,
    DISEASE_METADATA,
    DRUGS_CLINICAL_TRIALS_CLINICAL_STUDIES_TOOL_ANSWER,
    DRUGS_CLINICAL_TRIALS_TOP_DRUGS_TOOL_ASNWER,
    PC_V2_DRUGS_AND_TRIALS_RESPONSE,
)


@patch("kernel.llm_agent_tools.helpers.dnt_tool_utils.get_disease_metadata")
@patch("dwh.drugs_and_trials.dnt_data_loader.get_clinical_trial_drugs_and_trials_disease")
class PandaOmicsProteinLevelInHealthyHumanTissuesToolTest(TestCase):
    def test__drugs_clinical_trials_tools_run__symbol_supplied__converted_to_ensembl(
        self,
        patched_get_drugs_data_for_disease: Mock,
        patched_get_disease_metadata: Mock,
    ) -> None:
        patched_get_drugs_data_for_disease.return_value = {"drugs": None}
        disease = "B-cell acute lymphoblastic leukemia"
        patched_get_disease_metadata.return_value = deepcopy(DISEASE_METADATA)

        for sub_test_tool in (
            DrugsClinicalTrialsTopSponsorsTool,
            DrugsClinicalTrialsTopDrugsTool,
            DrugsClinicalTrialsClinicalStudiesTool,
        ):
            with self.subTest(msg=sub_test_tool.__name__):
                result = sub_test_tool()._run(disease_name=disease)
                patched_get_drugs_data_for_disease.assert_called_with(DISEASE_EFO_ID)
                self.assertListEqual(result, [])

    def test__drugs_clinical_trials_tools_run__exception_raised__empty_list_returned(
        self,
        patched_get_drugs_data_for_disease: Mock,
        patched_get_disease_metadata: Mock,
    ) -> None:
        error_msg = "Hello!"
        patched_get_drugs_data_for_disease.side_effect = ValueError(error_msg)
        patched_get_disease_metadata.return_value = deepcopy(DISEASE_METADATA)

        for sub_test_tool in (
            DrugsClinicalTrialsTopSponsorsTool,
            DrugsClinicalTrialsTopDrugsTool,
            DrugsClinicalTrialsClinicalStudiesTool,
        ):
            with self.subTest(msg=sub_test_tool.__name__):
                result = sub_test_tool()._run(disease_name=DISEASE)
                patched_get_drugs_data_for_disease.assert_called_with(DISEASE_EFO_ID)
                self.assertListEqual(result, [])

    def test__drugs_clinical_trials_top_sponsors_tool_run__return_list_of_top_sponsors(
        self,
        patched_get_drugs_data_for_disease: Mock,
        patched_get_disease_metadata: Mock,
    ) -> None:
        patched_get_drugs_data_for_disease.return_value = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
        patched_get_disease_metadata.return_value = deepcopy(DISEASE_METADATA)

        result = DrugsClinicalTrialsTopSponsorsTool()._run(disease_name=DISEASE)
        patched_get_drugs_data_for_disease.assert_called_with(DISEASE_EFO_ID)
        self.assertListEqual(
            result,
            ["Abramson Cancer Center at Penn Medicine", "Children's Oncology Group", "Katsuyoshi Koh"],
        )

    def test__drugs_clinical_trials_top_drugs_tool_run__return_list_of_top_drugs(
        self,
        patched_get_drugs_data_for_disease: Mock,
        patched_get_disease_metadata: Mock,
    ) -> None:
        patched_get_drugs_data_for_disease.return_value = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
        patched_get_disease_metadata.return_value = deepcopy(DISEASE_METADATA)
        result = DrugsClinicalTrialsTopDrugsTool()._run(disease_name=DISEASE)
        patched_get_drugs_data_for_disease.assert_called_with(DISEASE_EFO_ID)
        self.assertListEqual(result, DRUGS_CLINICAL_TRIALS_TOP_DRUGS_TOOL_ASNWER)

    def test__drugs_clinical_trials_clinical_studies_tool_run__return_list_of_clinical_studies(
        self,
        patched_get_drugs_data_for_disease: Mock,
        patched_get_disease_metadata: Mock,
    ) -> None:
        patched_get_drugs_data_for_disease.return_value = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
        patched_get_disease_metadata.return_value = deepcopy(DISEASE_METADATA)

        result = DrugsClinicalTrialsClinicalStudiesTool()._run(disease_name=DISEASE)
        patched_get_drugs_data_for_disease.assert_called_with(DISEASE_EFO_ID)
        self.assertListEqual(result, DRUGS_CLINICAL_TRIALS_CLINICAL_STUDIES_TOOL_ANSWER)
