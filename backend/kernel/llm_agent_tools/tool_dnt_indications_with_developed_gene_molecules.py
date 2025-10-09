from typing import List, Type

import pandas as pd
from langchain_core.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.drugs_and_trials.defs import UNSPECIFIED
from dwh.drugs_and_trials.defs import DrugsAndTrialsColumnNames as ColumnNames
from kernel.llm_agent_tools.defs import OUTPUT_INDICATION_NUMBER
from kernel.llm_agent_tools.helpers.dnt_tool_utils import get_drug_data
from kernel.llm_agent_tools.input_models import GeneNameInputModel


class IndicationsWithDevelopedMoleculesTool(BaseTool):
    name: str = "Indications_with_developed_Gene_molecules"
    description: str = (
        "Useful, when you need to get diseases for which the molecule for the Gene of interest was developed"
    )
    args_schema: Type[BaseModel] = GeneNameInputModel
    max_indications: int = OUTPUT_INDICATION_NUMBER

    def _run(self, gene_name: str) -> List[str]:
        data = get_drug_data(gene_name=gene_name, tool_name=self.name)
        if not data:
            return []

        indications = pd.DataFrame(data)[[ColumnNames.DISEASE_NAME, ColumnNames.NCT_ID]].drop_duplicates()
        indications = indications.loc[indications[ColumnNames.DISEASE_NAME] != UNSPECIFIED]
        sorted_indications = (
            indications[ColumnNames.DISEASE_NAME].value_counts(ascending=False).index.to_list()
        )

        return sorted_indications[: self.max_indications]
