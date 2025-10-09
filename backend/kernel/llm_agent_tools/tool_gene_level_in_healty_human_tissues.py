import logging
from typing import Dict, List, Type, Union

import pandas as pd
from langchain.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.requests.base_request import make_dwh_api_request
from kernel.llm_agent_tools.defs import EntitiesVersions
from kernel.llm_agent_tools.helpers.dnt_tool_utils import get_ensembl_by_gene_symbol
from kernel.llm_agent_tools.input_models import GeneNameInputModel

logger = logging.getLogger(__name__)


class GeneLevelInHealthyHumanTissuesTool(BaseTool):
    description: str = (
        "Useful, when you want to get gene's expression (RNA) levels in healthy human tissues "
        "from Human protein atlas. ntpm description - normalized transcript per million (nTPM). "
        "The higher the nTPM value, the higher the RNA expression in the tissue"
    )
    name: str = "gene_level_in_healthy_human_tissues"
    args_schema: Type[BaseModel] = GeneNameInputModel
    reliability: List[str] = ["Approved", "Enhanced"]

    def _run(self, gene_name: str) -> List[Dict[str, Union[str, float]]]:
        gene_ensembl_id = get_ensembl_by_gene_symbol(gene_name)
        response = make_dwh_api_request(
            endpoint="/gene/normal_tissue",
            params={
                "gene_ensembl_ids": [gene_ensembl_id],
                "gene_ensembl_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
                "hgnc_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_HGNC,
                "hpa_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS,
                "reliability": self.reliability,
            },
        )

        protein_levels: List[Dict[str, Union[str, float]]] = []

        if response:
            result = pd.DataFrame(response["data"], columns=["tissue", "cell_type", "level"])
            protein_levels = result.to_dict(orient="records")

        return protein_levels
