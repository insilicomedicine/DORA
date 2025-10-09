from collections import OrderedDict
from typing import List, Type

from langchain_core.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.drugs_and_trials.defs import DrugsAndTrialsColumnNames
from kernel.llm_agent_tools.defs import OUTPUT_DRUG_NUMBER
from kernel.llm_agent_tools.helpers.dnt_tool_utils import get_drug_data
from kernel.llm_agent_tools.input_models import GeneNameInputModel


class DrugsListRelatedToGeneTool(BaseTool):
    name: str = "Drugs_list_related_to_Gene"
    description: str = "Useful, when you need to get drug list, associated with Gene"
    args_schema: Type[BaseModel] = GeneNameInputModel
    max_drugs: int = OUTPUT_DRUG_NUMBER

    def _run(self, gene_name: str) -> List[str]:
        data = get_drug_data(gene_name=gene_name, tool_name=self.name)
        if not data:
            return []

        drug_names = [record[DrugsAndTrialsColumnNames.DRUG_NAME] for record in data]
        drug_names = list(set(drug.lower() for drug in drug_names))
        unique_drug_names = list(OrderedDict.fromkeys(drug_names))
        return unique_drug_names[: self.max_drugs]
