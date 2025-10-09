import logging
from typing import Dict, List, Type

import pandas as pd
from langchain.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.drugs_and_trials.dnt_data_loader import DrugsAndTrialsDataLoader
from kernel.llm_agent_tools.helpers.dnt_tool_utils import (
    get_efo_id_by_disease_name,
    return_empty_list_on_any_exception_decorator,
)
from kernel.llm_agent_tools.input_models import DiseaseNameInputModel

logger = logging.getLogger(__name__)


class DrugsClinicalTrialsTopDrugsTool(BaseTool):
    description: str = "Useful, when you want to need to get Drugs associated with Disease"
    name: str = "association_related_drugs"
    args_schema: Type[BaseModel] = DiseaseNameInputModel
    top_n: int = 20

    @return_empty_list_on_any_exception_decorator("DrugsClinicalTrialsTopDrugsTool")
    def _run(self, disease_name: str) -> List[str]:
        disease_efo_id = get_efo_id_by_disease_name(disease_name)

        if not disease_efo_id:
            return []

        data = DrugsAndTrialsDataLoader.get_drugs_data_for_disease(disease_efo_id)

        if not data:
            return []

        drugs_df = pd.DataFrame(data)
        aggregated_drugs: Dict[str, int] = (
            drugs_df.drop_duplicates(["drug_name", "nct_id"])
            .groupby("drug_name")["nct_id"]
            .agg("count")
            .sort_index()
            .sort_values(ascending=False, kind="stable")[: self.top_n]
            .to_dict()
        )

        return list(aggregated_drugs.keys())
