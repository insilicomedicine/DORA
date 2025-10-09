import json
import logging
from typing import Dict, List, Optional, Tuple

import pandas as pd
import requests
import sentry_sdk

from kernel.services.pandaomics_client import call_pandaomics_api

logger = logging.getLogger(__name__)


def load_tid_config(path: str = "kernel/files/data/tid_config.json") -> Tuple[Dict, List, Dict, Dict]:
    """Load Target ID configuration from JSON file.

    Args:
        path: Path to the configuration file

    Returns:
        Tuple containing:
        - DEFAULT_FILTERS: Default filter settings
        - SCORINGS_LIST: List of available scoring metrics
        - TID_FIELD_RENAMINGS: Mapping of field names
        - SCORINGS_LIST_WITH_TYPE: Scoring metrics grouped by type

    Raises:
        FileNotFoundError: If config file does not exist
        json.JSONDecodeError: If config file is not valid JSON
        KeyError: If required configuration keys are missing
    """
    logger.info(f"Loading configuration from {path}")
    try:
        with open(path, "r") as file:
            tid_config = json.load(file)

        # Validate required keys
        required_keys = ["DEFAULT_FILTERS", "SCORINGS_LIST", "TID_FIELD_RENAMINGS", "SCORINGS_LIST_WITH_TYPE"]
        missing_keys = [key for key in required_keys if key not in tid_config]
        if missing_keys:
            logger.error(f"Missing required configuration keys: {', '.join(missing_keys)}")
            raise KeyError(f"Missing required configuration keys: {', '.join(missing_keys)}")

        logger.debug("Configuration loaded successfully")
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {path}")
        raise
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in configuration file: {path}")
        raise

    return (
        tid_config["DEFAULT_FILTERS"],
        tid_config["SCORINGS_LIST"],
        tid_config["TID_FIELD_RENAMINGS"],
        tid_config["SCORINGS_LIST_WITH_TYPE"],
    )


class TargetIDConfig:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TargetIDConfig, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            (
                self.default_filters,
                self.scorings_list,
                self.field_renamings,
                self.scorings_list_with_type,
            ) = load_tid_config()
            self._initialized = True

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload_config(self, path: str = "kernel/files/data/tid_config.json"):
        (
            self.default_filters,
            self.scorings_list,
            self.field_renamings,
            self.scorings_list_with_type,
        ) = load_tid_config(path)


def get_project_overview(disease_id: str) -> Dict:
    """Get project overview data for a specific disease.

    Args:
        disease_id: Disease ID to get overview for

    Returns:
        Project overview data as dictionary
    """
    logger.info(f"Getting project overview for disease ID: {disease_id}")
    response = call_pandaomics_api(
        http_method="GET", api_endpoint=f"/api/v1/disease_efo/{disease_id}/default_project/overview/"
    )
    data = response.json()

    if data.get("error"):
        raise ValueError(f"Error retrieving project overview: {data['error']}")

    logger.debug(f"Retrieved project overview with {len(data.get('experiments', {}))} experiments")
    return data


def build_experiment_ids(disease_id: str, experiment_ids: Optional[List[int]] = None) -> List[int]:
    """Build list of experiment IDs for a disease project.

    Args:
        client: PandaOmics API client instance
        disease_id: Disease ID to get experiments for
        experiment_ids: Optional list of specific experiment IDs to use

    Returns:
        List of experiment IDs

    Raises:
        ValueError: If specified experiment IDs are not found in the project
    """
    logger.info(f"Building experiment IDs for disease {disease_id}")
    overview = get_project_overview(disease_id)
    project_experiment_ids = list(map(int, overview["experiments"].keys()))

    if experiment_ids:
        logger.debug(f"Validating specified experiment IDs: {experiment_ids}")
        for experiment_id in experiment_ids:
            if experiment_id not in project_experiment_ids:
                error_msg = (
                    f"Experiment {experiment_id} not found in project {disease_id} "
                    f"experiments list {project_experiment_ids}"
                )
                logger.error(error_msg)
                raise ValueError(error_msg)
        project_experiment_ids = experiment_ids

    logger.debug(f"Using experiment IDs: {project_experiment_ids}")
    return project_experiment_ids


def map_gene_name_to_ensembl(genes: List[str]) -> List[str]:
    """Convert gene names to ENSEMBL IDs.

    Args:
        genes: List of gene names to convert

    Returns:
        List of corresponding ENSEMBL IDs for found genes
    """
    ensembl_ids = []

    for gene_name in genes:
        try:
            response = call_pandaomics_api(
                http_method="GET", api_endpoint=f"/api/v1/genes/info/?name={gene_name}"
            )
            gene_info = response.json()

            if gene_info and gene_info.get("ensembl_id"):
                ensembl_ids.append(gene_info["ensembl_id"])
                logger.info(f"Found ENSEMBL ID for gene: {gene_name} - {gene_info['ensembl_id']}")
            else:
                logger.warning(f"Could not find ENSEMBL ID for gene: {gene_name}")

        except Exception as e:
            logger.error(f"Error converting gene {gene_name} to ENSEMBL ID: {str(e)}")

    return ensembl_ids


def build_filters(filter_sequence: Dict) -> Dict:
    """Build filter configuration from filter sequence.

    Args:
        filter_sequence: Dictionary containing filter parameters

    Returns:
        Dictionary of enabled filters with their values
    """
    config = TargetIDConfig.get_instance()
    enabled_filters = config.default_filters.copy()
    ALLOWED_DRUGGABILITY_SCORES_NAMES = [
        "small_molecules_score",
        "antibodies_score",
        "safety_score",
        "novelty_score",
    ]

    # Handle druggability filters
    if "druggability_filters" in filter_sequence:
        for filter_name, value in filter_sequence["druggability_filters"].items():
            if filter_name in ALLOWED_DRUGGABILITY_SCORES_NAMES:
                enabled_filters[filter_name] = {
                    "value": value if isinstance(value, list) else [value],
                    "enabled": True,
                }
            else:
                logger.info(f"{filter_name} not in ALLOWED_DRUGGABILITY_SCORES_NAMES")

    # Handle gene filter
    if "gene" in filter_sequence:
        genes = (
            filter_sequence["gene"]
            if isinstance(filter_sequence["gene"], list)
            else [filter_sequence["gene"]]
        )

        if len(genes) == 1:
            enabled_filters["specific_gene"] = {"enabled": True, "name": genes[0]}
        else:
            # Convert multiple genes to ENSEMBL IDs
            ensembl_ids = map_gene_name_to_ensembl(genes)
            if ensembl_ids:
                enabled_filters["specific_gene_list"] = {"enabled": True, "ensembl_gene_list": ensembl_ids}

    # Handle protein families
    if "protein_family" in filter_sequence:
        enabled_filters["protein_class"] = {
            "enabled": True,
            "selected_protein_classes": filter_sequence["protein_family"],
        }
    return enabled_filters


def build_scorings(filter_sequence: Dict) -> Dict:
    """Build scoring configuration from filter sequence.

    Args:
        filter_sequence: Dictionary containing scoring parameters

    Returns:
        Dictionary of enabled scoring metrics
    """
    config = TargetIDConfig.get_instance()
    list_sc = {}

    # Enable selected scores if present
    if "scores" in filter_sequence and len(filter_sequence.get("scores", [])) > 0:
        # Initialize all scores as disabled
        for scoring in config.scorings_list:
            list_sc[scoring] = {"enabled": False}
        for score in filter_sequence["scores"]:
            if score in config.scorings_list:
                list_sc[score] = {"enabled": True}
            else:
                logger.info(f"{score} not in SCORINGS_LIST")
    else:
        # Initialize all scores
        for scoring in config.scorings_list:
            list_sc[scoring] = {"enabled": True}

    return list_sc


def convert_target_id_result_to_df(data: List[Dict]) -> pd.DataFrame:
    """Convert Target ID API response to a pandas DataFrame.

    Args:
        data: List of dictionaries containing target data

    Returns:
        DataFrame with renamed columns according to TID_FIELD_RENAMINGS
    """
    config = TargetIDConfig.get_instance()

    logger.info(f"Converting API response to DataFrame with {len(data)} records")
    flattened_df = pd.json_normalize(data)

    # Drop columns that are not in our field mappings
    columns_to_drop = [col for col in flattened_df.columns if col not in config.field_renamings.keys()]
    logger.info(f"Dropping {len(columns_to_drop)} unmapped columns")
    flattened_df.drop(columns_to_drop, axis=1, inplace=True)

    # Rename columns according to our mappings
    logger.info("Renaming columns according to field mappings")
    flattened_df.rename(columns=config.field_renamings, inplace=True)
    flattened_df = flattened_df.round(2)

    logger.info(f"Final DataFrame shape: {flattened_df.shape}")
    return flattened_df


def get_targetid_data_from_pandaomics(
    disease_id: str, filter_sequence: Dict, top_n: int = 50
) -> pd.DataFrame:
    """Get target data from PandaOmics API based on filter sequence.

    Args:
        disease_id: Disease ID to get targets for
        filter_sequence: Dictionary containing filter and scoring parameters
        top_n: Number of top targets to return (default: 50)

    Returns:
        DataFrame containing target data with applied filters and scores

    Raises:
        ValueError: If disease is not specified in filter_sequence
        requests.exceptions.RequestException: If API request fails
        json.JSONDecodeError: If API response is not valid JSON
    """
    try:
        data = {
            "experiments": build_experiment_ids(disease_id),
            "filters": build_filters(filter_sequence),
            "scorings": build_scorings(filter_sequence),
        }

        response = call_pandaomics_api(
            http_method="POST",
            api_endpoint=f"/api/v1/disease_efo/{disease_id}/default_project/get_targets/",
            json=data,
        )

        targetid_df = convert_target_id_result_to_df(response.json())
        targetid_df = targetid_df.sort_values("Rank")

        limit = filter_sequence.get("top_n", top_n)
        targetid_df = targetid_df.head(limit)

        return targetid_df

    except (requests.exceptions.RequestException, json.JSONDecodeError) as exc:
        sentry_sdk.capture_exception(exc)
        logger.error(f"API error occurred: {str(exc)}")
        return pd.DataFrame()
