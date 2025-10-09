from copy import deepcopy
from unittest.mock import Mock, patch

from dwh.pharmacognitive.api_interface import (
    get_clinical_trial_drugs_and_trials_association,
    get_clinical_trial_drugs_and_trials_disease,
    get_clinical_trial_drugs_and_trials_gene,
)
from dwh.tests.defs import PC_V2_DRUGS_AND_TRIALS_RESPONSE


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_gene__has_answer_from_pc__correct_answer(
    self, patched_api_call: Mock
) -> None:
    drugs_data = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
    patched_api_call.return_value = {"data": drugs_data, "total": len(drugs_data)}
    result = get_clinical_trial_drugs_and_trials_gene("gene_ensembl_id")
    self.assertListEqual(result, drugs_data)
    self.assertTrue(isinstance(result, list))
    self.assertTrue(isinstance(result[0], dict))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_gene__no_answer_from_pc__empty_answer(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = {"data": [], "total": 0}
    result = get_clinical_trial_drugs_and_trials_gene("gene_ensembl_id")
    self.assertListEqual(result, [])
    self.assertTrue(isinstance(result, list))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_gene__none_answer_from_pc__raise_exception(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = None

    with self.assertRaises(ValueError):
        get_clinical_trial_drugs_and_trials_gene("gene_ensembl_id")


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_association__has_answer_from_pc__correct_answer(
    self, patched_api_call: Mock
) -> None:
    drugs_data = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
    patched_api_call.return_value = {"data": drugs_data, "total": len(drugs_data)}
    result = get_clinical_trial_drugs_and_trials_association("gene_ensembl_id", "disease_efo_id")
    self.assertListEqual(result, drugs_data)
    self.assertTrue(isinstance(result, list))
    self.assertTrue(isinstance(result[0], dict))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_association__no_answer_from_pc__empty_answer(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = {"data": [], "total": 0}
    result = get_clinical_trial_drugs_and_trials_association("gene_ensembl_id", "disease_efo_id")
    self.assertListEqual(result, [])
    self.assertTrue(isinstance(result, list))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_association__none_answer_from_pc__raise_exception(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = None

    with self.assertRaises(ValueError):
        get_clinical_trial_drugs_and_trials_association("gene_ensembl_id", "disease_efo_id")


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_disease__has_answer_from_pc__correct_answer(
    self, patched_api_call: Mock
) -> None:
    drugs_data = deepcopy(PC_V2_DRUGS_AND_TRIALS_RESPONSE)
    patched_api_call.return_value = {"data": drugs_data, "total": len(drugs_data)}
    result = get_clinical_trial_drugs_and_trials_disease("disease_efo_id")
    self.assertListEqual(result, drugs_data)
    self.assertTrue(isinstance(result, list))
    self.assertTrue(isinstance(result[0], dict))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_disease__no_answer_from_pc__empty_answer(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = {"data": [], "total": 0}
    result = get_clinical_trial_drugs_and_trials_disease("disease_efo_id")
    self.assertListEqual(result, [])
    self.assertTrue(isinstance(result, list))


@patch("dwh.pharmacognitive.api_interface.send_request")
def test__get_clinical_trial_drugs_and_trials_disease__none_answer_from_pc__raise_exception(
    self, patched_api_call: Mock
) -> None:
    patched_api_call.return_value = None

    with self.assertRaises(ValueError):
        get_clinical_trial_drugs_and_trials_disease("disease_efo_id")
