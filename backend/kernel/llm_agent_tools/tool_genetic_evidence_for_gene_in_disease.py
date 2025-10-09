import logging
from typing import Any, Dict, List, Type

from langchain.tools import BaseTool
from pydantic.v1 import BaseModel

from dwh.requests.base_request import make_dwh_api_request
from kernel.llm_agent_tools.defs import EntitiesVersions
from kernel.llm_agent_tools.helpers.dnt_tool_utils import (
    filter_list_of_dicts_by_exact_value,
    filter_list_of_dicts_by_value_suffix,
    get_efo_id_by_disease_name,
    get_ensembl_by_gene_symbol,
    remap_fields,
    return_empty_list_on_any_exception_decorator,
)
from kernel.llm_agent_tools.input_models import GeneDiseaseNamesInputModel

logger = logging.getLogger(__name__)


GENETIC_EVIDENCE_API_MAX_PAGE_SIZE = 500
GENETIC_EVIDENCE_ENDPOINT = "/disease/genetic_data/associated_variants"

MAX_GENETIC_VARIANTS = 5


GENETIC_VARIANTS_FIELD_MAPPING = {
    "name": "genetic_variant",
    "clin_sig_corrected": "clinical_significance",
    "type": "mutation_type",
    "source": "source",
}

FILTER_BY_CLIN_SIG = "clin_sig_corrected"
FILTER_BY_NAME = "name"

GENETIC_EVIDENCE_DESCRIPTION = (
    "Necessary to use when you need to get genetic variants, associated with the Gene in Disease"
)


class GeneticVariantConstants:
    PATHOGENIC = "pathogenic"
    NAME_SUFFIX = "fs"


def get_data_page_from_dwh(
    endpoint: str,
    params: Dict[str, Any],
    versions: Dict[str, Any],
    offset: int,
) -> Dict[str, Any]:
    page = make_dwh_api_request(
        endpoint=endpoint,
        params={
            "offset": offset,
            **params,
            **versions,
        },
    )
    if page is None:
        raise ValueError(
            f"Failed to retrieve page of data from DWH: endpoint={endpoint}, params={params},"
            f" versions={versions}, offset={offset}"
        )

    return page


def retrieve_genetic_evidence_data(
    gene_ensembl_id: str,
    disease_efo_id: str,
) -> List[Dict[str, Any]]:
    params = {
        "efo_id": disease_efo_id,
        "gene_ensembl_id": gene_ensembl_id,
        "limit": GENETIC_EVIDENCE_API_MAX_PAGE_SIZE,
    }

    versions = {
        "efo_version": EntitiesVersions.DRUGS_AND_TRIALS_EFO,
        "gene_ensembl_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
    }

    offset = 0
    result = []

    first_page = get_data_page_from_dwh(
        endpoint=GENETIC_EVIDENCE_ENDPOINT,
        params=params,
        versions=versions,
        offset=offset,
    )

    first_page_data, total = first_page["data"], first_page["total"]
    result.extend(first_page_data)
    records_left = total - len(first_page_data)

    while records_left > 0:
        offset += GENETIC_EVIDENCE_API_MAX_PAGE_SIZE
        next_page = get_data_page_from_dwh(
            endpoint=GENETIC_EVIDENCE_ENDPOINT,
            params=params,
            versions=versions,
            offset=offset,
        )

        page_data = next_page["data"]
        result.extend(page_data)
        records_left -= len(page_data)

    return result


def filter_genetic_evidence(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if len(data) > MAX_GENETIC_VARIANTS:
        data = filter_list_of_dicts_by_exact_value(
            data=data,
            key=FILTER_BY_CLIN_SIG,
            value=GeneticVariantConstants.PATHOGENIC,
        )

    if len(data) > MAX_GENETIC_VARIANTS:
        filtered = filter_list_of_dicts_by_value_suffix(
            data=data,
            key=FILTER_BY_NAME,
            suffix=GeneticVariantConstants.NAME_SUFFIX,
        )

        if len(filtered) < MAX_GENETIC_VARIANTS:
            data = data[:MAX_GENETIC_VARIANTS]
        else:
            data = filtered[:MAX_GENETIC_VARIANTS]

    return data


class GeneticEvidenceForGeneInDiseaseTool(BaseTool):
    name: str = "genetic_evidence_for_gene_in_disease"
    description: str = GENETIC_EVIDENCE_DESCRIPTION

    args_schema: Type[BaseModel] = GeneDiseaseNamesInputModel

    @return_empty_list_on_any_exception_decorator("GeneticEvidenceForGeneInDiseaseTool")
    def _run(self, gene_name: str, disease_name: str) -> Any:
        disease_efo_id = get_efo_id_by_disease_name(disease_name)
        gene_ensembl_id = get_ensembl_by_gene_symbol(gene_name)
        data = retrieve_genetic_evidence_data(
            gene_ensembl_id=gene_ensembl_id,
            disease_efo_id=disease_efo_id,
        )

        filtered = filter_genetic_evidence(data=data)
        remapped = remap_fields(source_data=filtered, mapping=GENETIC_VARIANTS_FIELD_MAPPING)
        return remapped
