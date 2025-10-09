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


class DrugsClinicalTrialsTopSponsorsTool(BaseTool):
    description: str = (
        "Useful, when you want to need to get leading pharmaceutical companies involved in {Disease} drug"
        " development"
    )
    name: str = "sponsors_for_drug_development_for_disease"
    args_schema: Type[BaseModel] = DiseaseNameInputModel
    top_n: int = 5

    @return_empty_list_on_any_exception_decorator("DrugsClinicalTrialsTopSponsorsTool")
    def _run(self, disease_name: str) -> List[str]:
        disease_efo_id = get_efo_id_by_disease_name(disease_name)

        if not disease_efo_id:
            return []

        data = DrugsAndTrialsDataLoader.get_drugs_data_for_disease(disease_efo_id)

        if not data:
            return []

        drugs_df = pd.DataFrame(data)
        aggregated_sponsor_leads: Dict[str, int] = (
            drugs_df.drop_duplicates(["sponsor_lead", "nct_id"])
            .groupby("sponsor_lead")["nct_id"]
            .agg("count")
            .sort_values(ascending=False)[: self.top_n]
            .to_dict()
        )

        return list(aggregated_sponsor_leads.keys())
