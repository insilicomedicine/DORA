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


class ProteinLevelInHealthyHumanTissuesTool(BaseTool):
    description: str = (
        "Useful, when you want to get gene's protein levels in healthy human tissues from Human "
        "protein atlas. The higher the level, the higher the gene’s protein expression"
    )
    name: str = "protein_level_in_healthy_human_tissues"
    args_schema: Type[BaseModel] = GeneNameInputModel

    def _run(self, gene_name: str) -> List[Dict[str, Union[str, float]]]:
        gene_ensembl_id = get_ensembl_by_gene_symbol(gene_name)
        response = make_dwh_api_request(
            endpoint="/gene/rna_tissue_consensus",
            params={
                "gene_ensembl_ids": [gene_ensembl_id],
                "gene_ensembl_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
                "hgnc_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_HGNC,
                "hpa_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS,
            },
        )

        rna_levels: List[Dict[str, Union[str, float]]] = []

        if response:
            result = pd.DataFrame(response["data"], columns=["tissue", "ntpm"])
            result.ntpm = result.ntpm.astype("float")
            result = result.sort_values("ntpm", ascending=False)
            rna_levels = result.to_dict(orient="records")

        return rna_levels
