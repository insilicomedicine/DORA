import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

import sentry_sdk

from dwh.drugs_and_trials.dnt_data_loader import DrugsAndTrialsDataLoader
from dwh.pharmacognitive.api_interface import get_disease_metadata, get_gene_symbol_mapping

logger = logging.getLogger(__name__)


def get_ensembl_by_gene_symbol(gene_symbol: str) -> str:
    gene_mapping = get_gene_symbol_mapping([gene_symbol])

    if len(gene_mapping) != 1:
        sentry_sdk.capture_message(f"For gene: {gene_symbol} recieved unexpected mapping: {gene_mapping}")

    return gene_mapping[0]["ensg"]


def get_drug_data(gene_name: str, tool_name: str) -> Optional[List[dict]]:
    ensembl = get_ensembl_by_gene_symbol(gene_name)
    data = DrugsAndTrialsDataLoader.get_drugs_data_for_gene(ensembl)

    if not data:
        logger.warning(f"Tool {tool_name} failed to get data from PC")
        return None

    return data


def get_efo_id_by_disease_name(disease_name: str) -> str:
    efo_to_disease_map = get_disease_metadata()
    name_to_disease_map = {
        disease_map["name"]: {"efo_id": efo_id, "synonyms": disease_map["synonyms"] or []}
        for efo_id, disease_map in efo_to_disease_map.items()
    }

    disease_data = name_to_disease_map.get(disease_name)
    if disease_data:
        return disease_data["efo_id"]

    for v in name_to_disease_map.values():
        if disease_name in v["synonyms"]:
            return v["efo_id"]


def return_empty_list_on_any_exception_decorator(name: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        def wrapper(*args: Tuple[Any], **kwargs: Dict[Any, Any]) -> List[Any]:
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as exc:
                logger.warning(f"{name} failed to get data with exception: {exc}")
                return []

        return wrapper

    return decorator


def filter_list_of_dicts_by_value_suffix(
    data: List[Dict[str, str]],
    key: str,
    suffix: str,
) -> List[Dict[str, Any]]:
    return list(filter(lambda item: item[key].endswith(suffix), data))


def filter_list_of_dicts_by_exact_value(
    data: List[Dict[str, Any]],
    key: str,
    value: Any,
) -> List[Dict[str, Any]]:
    return list(filter(lambda item: item[key] == value, data))


def remap_fields(
    source_data: List[Dict[str, Any]],
    mapping: Dict[str, str],
) -> List[Dict[str, Any]]:
    remapped = []

    for item in source_data:
        remapped.append(
            {
                mapping[field_name]: field_value
                for field_name, field_value in item.items()
                if field_name in mapping
            }
        )

    return remapped
