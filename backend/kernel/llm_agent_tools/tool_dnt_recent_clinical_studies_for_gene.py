from collections import OrderedDict
from typing import List, Type

import pandas as pd
from langchain_core.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.drugs_and_trials.defs import UNSPECIFIED
from dwh.drugs_and_trials.defs import DrugsAndTrialsColumnNames as ColumnNames
from kernel.llm_agent_tools.defs import OUTPUT_CT_NUMBER
from kernel.llm_agent_tools.helpers.dnt_tool_utils import get_drug_data
from kernel.llm_agent_tools.input_models import GeneNameInputModel


class RecentClinicalStudiesForGeneTool(BaseTool):
    name: str = "Recent_clinical_studies_for_Gene"
    description: str = "Useful, when you need to get recent clinical trilas, associated with Gene"
    args_schema: Type[BaseModel] = GeneNameInputModel
    max_clinical_trials: int = OUTPUT_CT_NUMBER
    columns_to_select: List[str] = [
        ColumnNames.NCT_ID,
        ColumnNames.PHASE,
        ColumnNames.DRUG_NAME,
        ColumnNames.DRUG_TYPE,
        ColumnNames.DISEASE_NAME,
        ColumnNames.SPONSOR_LEAD,
        ColumnNames.COMPLETION_YEAR,
    ]

    def _run(self, gene_name: str) -> List[dict]:
        data = get_drug_data(gene_name=gene_name, tool_name=self.name)
        if not data:
            return []

        ct_data = pd.DataFrame(data)[self.columns_to_select].sort_values(
            ColumnNames.COMPLETION_YEAR,
            ascending=False,
            key=lambda col: col.replace(UNSPECIFIED, "0").astype(int),
        )
        ct_data = ct_data.groupby(ColumnNames.NCT_ID, sort=False).agg(
            lambda values: ", ".join([str(value) for value in OrderedDict.fromkeys(values)])
        )
        ct_records = ct_data.reset_index().to_dict("records")[: self.max_clinical_trials]
        return ct_records
