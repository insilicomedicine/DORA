import logging
from typing import Dict, List, Type

import numpy as np
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


class DrugsClinicalTrialsClinicalStudiesTool(BaseTool):
    description: str = "Useful, when you need to get recent clinical trilas, associated with Disease"
    name: str = "recent_clinical_studies_for_disease"
    args_schema: Type[BaseModel] = DiseaseNameInputModel
    top_n: int = 20
    rename_map: Dict[str, str] = {
        "nct_id": "nct_id",
        "phase": "phase",
        "drug_name": "drug",
        "drug_type": "molecule_type",
    }

    @return_empty_list_on_any_exception_decorator("DrugsClinicalTrialsClinicalStudiesTool")
    def _run(self, disease_name: str) -> List[Dict[str, str]]:
        disease_efo_id = get_efo_id_by_disease_name(disease_name)

        if not disease_efo_id:
            return []

        data = DrugsAndTrialsDataLoader.get_drugs_data_for_disease(disease_efo_id)

        if not data:
            return []

        drugs_df = pd.DataFrame(data)
        drugs_df = drugs_df.drop_duplicates(self.rename_map.keys())
        drugs_df = drugs_df.sort_values(
            by="completion_year",
            ascending=False,
            key=lambda cell: cell.apply(lambda x: np.nan if x == "Unspecified" else x),
        )
        drugs_df = drugs_df.reindex(columns=self.rename_map.keys())
        drugs_df = drugs_df.rename(columns=self.rename_map)
        drugs_df["drug"] = drugs_df["drug"].apply(str.lower)
        drugs_df = drugs_df[: self.top_n]

        return drugs_df.to_dict("records")
