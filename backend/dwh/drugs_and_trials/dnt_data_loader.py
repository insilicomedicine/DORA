from typing import Any, Dict, List, Union

import pandas as pd
from dateutil.parser import parse

from dwh.drugs_and_trials.annotations import DrugsAndTrialsPCRows, DrugsAndTrialsRows
from dwh.drugs_and_trials.defs import UNSPECIFIED
from dwh.drugs_and_trials.defs import DrugsAndTrialsColumnNames as DnTColumnNames
from dwh.pharmacognitive.api_interface import (
    get_clinical_trial_drugs_and_trials_disease,
    get_clinical_trial_drugs_and_trials_gene,
)


class DrugsAndTrialsDataLoader:
    @classmethod
    def _parse_year(cls, raw_date: Union[str, None]) -> str:
        if not raw_date:
            return UNSPECIFIED

        try:
            year = int(raw_date)
        except (ValueError, TypeError):
            completion_date = parse(raw_date, fuzzy=True).year if raw_date else UNSPECIFIED
        else:
            completion_date = year

        return str(completion_date)

    @classmethod
    def _prepare_pc_api_response(cls, response: List[Dict[str, Any]]) -> pd.DataFrame:
        data: List = []

        for row in response:
            if phase := row.get(DnTColumnNames.PHASE, []):
                row.update({DnTColumnNames.PHASE: "/".join(phase)})

            row[DnTColumnNames.COMPLETION_YEAR] = cls._parse_year(
                row.pop(DnTColumnNames.PRIMARY_COMPLETION_DATE, None)
            )
            data.append(row)

        df = pd.DataFrame(data)
        if not df.empty:
            text_fields = [
                DnTColumnNames.DISEASE_NAME,
                DnTColumnNames.COMPOUND_ID,
                DnTColumnNames.COMPOUND_NAME,
                DnTColumnNames.DRUG_NAME,
                DnTColumnNames.DRUG_TYPE,
                DnTColumnNames.PHASE,
                DnTColumnNames.SPONSOR_LEAD,
                DnTColumnNames.COMPLETION_YEAR,
                DnTColumnNames.GENE_SYMBOL,
            ]
            df[text_fields] = df[text_fields].fillna(UNSPECIFIED)
        return df

    @classmethod
    def get_drugs_data_for_gene(cls, gene_ensembl_id: str) -> DrugsAndTrialsRows:
        response: DrugsAndTrialsPCRows = get_clinical_trial_drugs_and_trials_gene(gene_ensembl_id)
        data = cls._prepare_pc_api_response(response)
        data = data.to_dict(orient="records") or []
        return data

    @classmethod
    def get_drugs_data_for_disease(cls, disease_efo_id: str) -> DrugsAndTrialsRows:
        response: DrugsAndTrialsPCRows = get_clinical_trial_drugs_and_trials_disease(disease_efo_id)
        data = cls._prepare_pc_api_response(response)
        data = data.to_dict(orient="records") or []
        return data
