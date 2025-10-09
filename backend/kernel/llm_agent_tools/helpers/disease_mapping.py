import logging
from pathlib import Path
from typing import List, Optional

import pandas as pd
from langchain_openai import AzureChatOpenAI

from general.defs import ConfigKeyType
from general.models import Config
from kernel.llm_agent_tools.helpers.dnt_tool_utils import get_efo_id_by_disease_name
from kernel.services.pandaomics_client import call_pandaomics_api

logger = logging.getLogger(__name__)


def load_golden_projects_names(golden_projects_names_path: str) -> pd.DataFrame:
    """
    Load the disease mapping data from a Feather file.

    Parameters:
    mapping_path (str): Path to the Feather file containing the golden projects names.
    """
    try:
        return pd.read_feather(golden_projects_names_path)
    except Exception as e:
        logger.error(f"Failed to load golden projects names: {e}")
        raise


def get_disease_id_with_confirmed_project(disease_name: str) -> str | None:
    disease_id = None

    try:
        disease_efo_id = get_efo_id_by_disease_name(disease_name)
        response = call_pandaomics_api(
            http_method="GET",
            api_endpoint=f"/api/v1/disease_efo/get_efo_related_ids/?efo_disease_id={disease_efo_id}",
        )

        diseases_info = response.json()
        if diseases_info["project_id"]:
            disease_id = diseases_info["disease_id"]
    except Exception as e:
        logger.error(f"Failed to get disease ID: {e}")

    return disease_id


def llm_map_disease(term: str, available_diseases: List[str], llm: AzureChatOpenAI) -> Optional[str]:
    """
    Use LLM to map an unmapped disease term to the closest match in available diseases.

    Parameters:
    term (str): The disease term to map
    available_diseases (List[str]): List of available disease names
    llm (AzureChatOpenAI): LLM instance to use for mapping

    Returns:
    str: The mapped disease name or None if no good match found
    """
    default_prompt_template = (
        "You are a medical expert. You are a given the name of a disease "
        "that you must map to 1 most appropriate match from the available list."
        " If there is no reasonable match, return 'no match'. \n"
        "### DISEASE TERM:\n{term}\n"
        "### AVAILABLE DISEASES:\n{available_diseases}\n"
        "Return only the exact name from the list if there's a match, or 'no match' if none is appropriate."
        "Explanation is not needed, just return the matched term or 'no match'.\n"
        "###MATCH:"
    )

    prompt_template = (
        Config.get(ConfigKeyType.TOOL_PROMPTS, {})
        .get("pandaomics_targetID_analyzer", {})
        .get("llm_map_disease", default_prompt_template)
    )
    prompt = prompt_template.format(term=term, available_diseases=", ".join(available_diseases))

    try:
        response = llm.invoke(prompt).content.strip()
        return response if response != "no match" else None

    except Exception as e:
        logger.error(f"Error in LLM disease mapping: {e}")
        return None


def disease_search_with_synonyms(
    golden_projects_names_path: str | Path,
    term: str,
    llm: Optional[AzureChatOpenAI] = None,
    default_column: str = "name",
) -> str | None:
    """
    Search for a disease by term, including synonyms and LLM-based mapping.

    Parameters:
    golden_projects_names_path (str): Path to the golden projects names file
    term (str): The search term
    mode (str): The mode of ID to return ("dwh", "name", or "efo")
    llm (Optional[AzureChatOpenAI]): LLM instance for fallback mapping
    default_column (str): The column name to use for available diseases

    Returns:
    str: The disease ID or "no such disease" if not found
    """

    golden_projects_names = load_golden_projects_names(golden_projects_names_path)
    available_diseases = golden_projects_names[default_column].unique().tolist()

    # Try match with API
    disease_id = get_disease_id_with_confirmed_project(term)
    if disease_id:
        logger.info("Mapped with API: %s", term)
        return disease_id

    # Try LLM mapping
    if llm:
        logger.info(f"Attempting LLM mapping for term: {term}")
        mapped_llm_term = llm_map_disease(term, available_diseases, llm)
        logger.info(f"LLM mapped {term} to {mapped_llm_term}")
        if mapped_llm_term:
            disease_id = get_disease_id_with_confirmed_project(mapped_llm_term)
            if disease_id:
                logger.info("Mapped with LLM and API: %s", term)
                return disease_id

    return None
