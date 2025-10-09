import json
import logging
import os
import re
import time
from typing import List, Optional, Tuple, Type

import pandas as pd
import requests
from django.conf import settings
from langchain.schema import AIMessage, HumanMessage, SystemMessage
from langchain.tools import BaseTool
from pydantic import BaseModel

from kernel.chat_models.utils import init_llm
from kernel.llm_agent_tools.defs import ToolNames
from kernel.llm_agent_tools.input_models import Precious3GPTReverseAgingInputModel

logger = logging.getLogger(__name__)


def query(payload):
    headers = {
        "Accept": "application/json",
        "Authorization": settings.HUGGINFACE_AUTHORIZATION_TOKEN,
        "Content-Type": "application/json",
    }
    response = requests.post(
        settings.HUGGINFACE_API,
        headers=headers,
        json=payload,
        timeout=settings.EXTERNAL_API_MAX_REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def get_gender_mapping(user_query: str) -> str:
    """
    Maps gender abbreviations to standard abbreviations: 'm' for all terms related to males,
    and 'f' for all terms related to females.

    Parameters:
    user_query (str): The initial notation of gender.

    Returns:
    str: A single string: either 'm' or 'f'.
    """
    system_prompt = (
        "You are a helpful assistant. "
        "Your main task task is to map gender abbreviations to standard abbreviations: "
        "'m' for all terms related to males, and 'f' for all terms related to females. "
        "Given the initial notation, your output should be a single string: either 'm' or 'f', "
        "with no additional characters or text. "
        "Expected output: one string with only standart gender notation."
    )
    user_query1 = "Male"
    assistant_prompt1 = "m"
    user_query2 = "Females all."
    assistant_prompt2 = "f"
    llm = init_llm()
    msg = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_query1),
        AIMessage(content=assistant_prompt1),
        HumanMessage(content=user_query2),
        AIMessage(content=assistant_prompt2),
        HumanMessage(content=user_query),
    ]
    res = llm(messages=msg)
    return res.content


def get_tissue_mapping(user_query: str, available_tissues: List[str]) -> str:
    """
    Maps the initial human tissue name to the corresponding standard tissue
    from the list of available standard tissue list.

    Parameters:
    user_query (str): The initial tissue name.
    available_tissues (List[str]): The dict with available standard tissues.

    Returns:
    str: The string with corresponding standard tissue.
    """

    available_tissues = (", ").join(available_tissues)
    system_prompt = (
        "You are a biologist. Your primary task is to map the initial human tissue name "
        "to the corresponding standard tissue from the list of "
        f"available standard tissue list: {available_tissues}. "
        "Given the initial tissue name, your output should be the string with "
        "corresponding standard tissue, nothing else. "
        "Always return only a tissue from the standard tissue list. "
        "Expected output: one string with only tissue name from the standard tissue list."
    )
    user_query1 = "right hemisphere of human"
    assistant_prompt1 = "brain"
    user_query2 = "blood"
    assistant_prompt2 = "whole blood"
    llm = init_llm()
    msg = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_query1),
        AIMessage(content=assistant_prompt1),
        HumanMessage(content=user_query2),
        AIMessage(content=assistant_prompt2),
        HumanMessage(content=user_query),
    ]
    res = llm(messages=msg)
    return res.content


def process_tissue(
    input_data: str,
    available_tissues_path: str,
    retry_on_inputs: int,
    default_tissue: str,
) -> str:
    """
    Function to process initial inputed tissue name.
    It checks if the input data is in the list of available tissues.
    If not, it tries to map the input data to an available tissue. If mapping is unsuccessful after
    specified retries, it defaults to a default tissue.

    Parameters:
    input_data (str): The input tissue name
    available_tissues_path (list): Path to available tissues
    retry_on_inputs (int): Number of retries for mapping input data
    default_tissue (str): Default tissue if mapping is unsuccessful

    Returns:
    str: The processed tissue data
    """
    with open(available_tissues_path, "r") as f:
        available_tissues = json.load(f)
    available_tissues = [tissue for tissues in list(available_tissues.values()) for tissue in tissues]

    for _ in range(retry_on_inputs):
        if input_data.lower() not in available_tissues:
            input_data = get_tissue_mapping(input_data, available_tissues)
        else:
            break
    if input_data.lower() not in available_tissues:
        input_data = default_tissue
    return input_data.lower()


def process_gender(input_data: str, retry_on_inputs: int, default_gender: str) -> str:
    """
    Function to process intial inputed gender. It checks if the input data is either 'm' or 'f'.
    If not, it tries to map the input data to 'm' or 'f'. If mapping is unsuccessful after
    specified retries, it defaults to a default gender.

    Parameters:
    input_data (str): The input gender
    retry_on_inputs (int): Number of retries for mapping input data
    default_gender (str): Default gender if mapping is unsuccessful

    Returns:
    str: The processed gender data
    """
    for _ in range(retry_on_inputs):
        if input_data.lower() not in ["m", "f"]:
            input_data = get_gender_mapping(input_data)
        else:
            break
    if input_data.lower() not in ["m", "f"]:
        input_data = default_gender
    return input_data.lower()


def load_config_file(file_path: str):
    """
    Load a JSON configuration file.

    Parameters:
    file_path (str): The path to the configuration file.

    Returns:
    dict: The loaded configuration.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The configuration file {file_path} does not exist.")
    with open(file_path, "r") as f:
        config = json.load(f)
    return config


def update_config(
    config: dict,
    tissue: str,
    gender: str,
    iteration_number: int,
    up_regulated_genes: list = None,
    down_regulated_genes: list = None,
):
    """
    Update a configuration with new values.

    Parameters:
    config (dict): The configuration to update.
    tissue (str): The tissue type.
    gender (str): The gender.
    up_regulated_genes (list, optional): The up-regulated genes.
    down_regulated_genes (list, optional): The down-regulated genes.

    Returns:
    dict: The updated configuration.
    """
    config["inputs"]["tissue"] = [tissue]
    config["inputs"]["gender"] = gender
    config["parameters"]["random_seed"] = iteration_number  # random.randint(0, 100)
    if up_regulated_genes is not None:
        config["inputs"]["up"] = up_regulated_genes
    if down_regulated_genes is not None:
        config["inputs"]["down"] = down_regulated_genes
    return config


def create_config_tissue_to_lists(tissue: str, gender: str, iteration_number: int) -> dict:
    """
    Create a configuration for tissue to lists.

    Parameters:
    tissue (str): The tissue name.
    gender (str): The gender.

    Returns:
    dict: The created configuration.
    """
    config = load_config_file("kernel/files/configs/config_tissue_to_list.json")
    return update_config(config, tissue, gender, iteration_number)


def create_config_lists_to_compound(
    tissue: str,
    gender: str,
    iteration_number: int,
    up_regulated_genes: list,
    down_regulated_genes: list,
) -> dict:
    """
    Create a configuration for lists to compound.

    Parameters:
    tissue (str): The tissue name.
    gender (str): The gender.
    up_regulated_genes (list): The list of generated up-regulated genes.
    down_regulated_genes (list): The list of generated down-regulated genes.

    Returns:
    dict: The created configuration.
    """
    config = load_config_file("kernel/files/configs/config_lists_to_compound.json")
    return update_config(
        config,
        tissue,
        gender,
        iteration_number,
        up_regulated_genes,
        down_regulated_genes,
    )


def filter_toxic_compunds(compounds: list, tissue: str, compound_black_list_path: str) -> list:
    """
    This function filters out toxic compounds from a given list of compounds.

    Parameters:
    compounds (list): A list of compounds to be filtered.
    tissue (str): The tissue type to consider when filtering.
    compound_black_list_path (str): The path to the pickled DataFrame containing the blacklisted compounds.

    Returns:
    list: A list of compounds after filtering out the toxic ones.
    """
    try:
        compound_black_list = pd.read_pickle(compound_black_list_path)  # nosec
    except Exception as e:
        logger.error(f"Error loading blacklisted compounds DataFrame: {e}")
        return compounds

    terms_filter = ["all", tissue]
    black_listed_compounds = compound_black_list[compound_black_list["affected_tissue"].isin(terms_filter)]

    list1 = black_listed_compounds["P3GPT Parent Molecule"].unique().tolist()
    list2 = black_listed_compounds["P3GPT Molecule"].unique().tolist()
    compound_black_list = [i for i in set(list1 + list2) if isinstance(i, str)]
    filtered_compounds = [compound for compound in compounds if compound not in compound_black_list]
    return filtered_compounds


def filter_compounds_names(names: List[str]) -> List[str]:
    """
    This function filters out compounds names that contain two or more consecutive digits.

    Args:
    names (List[str]): A list of names to be filtered.

    Returns:
    List[str]: A list of names that do not contain two or more consecutive digits.
    """
    try:
        pattern = re.compile(r"\d{2,}")
        return [name for name in names if not pattern.search(name)]
    except Exception as e:
        logger.error(f"An error occurred while filtering compunds names: {e}")
        return []


def filter_hub_compounds_list(names: List[str], compound_hub_list_path: str) -> List[str]:
    """
    This function filters out predefined compounds names occure unexpectedly often in Precious3GPT generations

    Args:
    names (List[str]): A list of names to be filtered.

    Returns:
    List[str]: A list of names that do not occure in the hub compounds list.
    """
    try:
        names = [
            i
            for i in names
            if i not in pd.read_pickle(compound_hub_list_path)["compounds"].tolist()  # nosec
        ]
        return names
    except Exception as e:
        logger.error(f"An error occurred while filtering hub compounds list: {e}")
        return []


def filter_flagged_compounds_names(drug_list: List[str], compound_flagged_list_path: str, top_n: int):
    n_required = top_n // 2
    remainder = top_n % 2

    flagged_annotation = pd.read_pickle(compound_flagged_list_path)  # nosec

    available_df = flagged_annotation[flagged_annotation["p3_name"].isin(drug_list)]
    available_df["p3_name"] = pd.Categorical(available_df["p3_name"], categories=drug_list, ordered=True)
    available_df = available_df.sort_values("p3_name")

    green_drugs = available_df[available_df["flag"] == "Green"]
    unflagged_drugs = available_df[available_df["flag"] == "Unflagged"]

    n_required_max = n_required + remainder
    remainder_green = remainder if len(green_drugs) >= n_required_max else 0
    n_required_green = n_required + remainder_green

    remainder_unflagged = (
        remainder if len(unflagged_drugs) >= n_required_max and len(green_drugs) < n_required_max else 0
    )
    n_required_unflagged = n_required + remainder_unflagged

    selected_green = green_drugs.head(n_required_green)
    selected_unflagged = unflagged_drugs.head(n_required_unflagged)

    deficiency_green = n_required_green - len(selected_green)
    deficiency_unflagged = n_required_unflagged - len(selected_unflagged)

    if deficiency_green > 0:
        additional_unflagged = unflagged_drugs.iloc[len(selected_unflagged) :].head(deficiency_green)
        selected_unflagged = pd.concat([selected_unflagged, additional_unflagged])

    if deficiency_unflagged > 0:
        additional_green = green_drugs.iloc[len(selected_green) :].head(deficiency_unflagged)
        selected_green = pd.concat([selected_green, additional_green])

    selected_drugs = pd.concat([selected_green, selected_unflagged]).drop_duplicates().head(top_n)
    return selected_drugs.p3_name.unique().tolist()


def filter_compounds(
    compounds: dict,
    top_n: int,
    tissue: str,
    compound_black_list_path: str,
    compound_hub_list_path: str,
    compound_flagged_list_path: str,
    filter_brd: bool = True,
    filter_toxic: bool = True,
    filter_digital_names: bool = False,
    filter_hub_compounds: bool = True,
    filter_flagged_compounds: bool = True,
) -> List[str]:
    """
    Filters the compounds based on the given conditions.

    Parameters:
    compounds (dict: dict containing generated compounds
    top_n (int): Number of top compounds to return
    filter_brd (bool): If True, filters out compounds containing 'brd'

    Returns:
    List[str]: List of filtered compounds
    """
    compounds = compounds["compounds"][0]
    if filter_brd:
        compounds = [compound for compound in compounds if "brd" not in compound]
    if filter_toxic:
        compounds = filter_toxic_compunds(compounds, tissue, compound_black_list_path)
    if filter_digital_names:
        compounds = filter_compounds_names(compounds)
    if filter_hub_compounds:
        compounds = filter_hub_compounds_list(compounds, compound_hub_list_path)
    if filter_flagged_compounds:
        compounds = filter_flagged_compounds_names(compounds, compound_flagged_list_path, top_n)

    return compounds[:top_n]


def create_lists_from_metadata(tissue: str, gender: str, retry_on_lists: int) -> Tuple[List[str], List[str]]:
    """
    Creates lists of up and down regulated genes based on tissue and gender.

    Parameters:
    tissue (str): Tissue type
    gender (str): Gender

    Returns:
    Tuple[List[str], List[str]]: Tuple containing lists of down and up regulated genes
    """
    retries = 0
    down_regulated_genes, up_regulated_genes = [], []
    for iteration_number in range(retry_on_lists):
        try:
            config_tissue_to_lists = create_config_tissue_to_lists(tissue, gender, iteration_number)
            up_down_lists = query(config_tissue_to_lists)
            down_regulated_genes = up_down_lists["output"]["up"][0]  # reverse
            up_regulated_genes = up_down_lists["output"]["down"][0]  # reverse

        except Exception as e:
            logger.error(f"Up and down lists are not generated: {e}")
            time.sleep(1)
            retries += 1
    return down_regulated_genes, up_regulated_genes, retries


def create_compounds_from_lists(
    tissue: str,
    gender: str,
    up_regulated_genes: List[str],
    down_regulated_genes: List[str],
    top_n: int,
    retry_on_compounds: int,
    compound_black_list_path: str,
    compound_hub_list_path: str,
    compound_flagged_list_path: str,
) -> List[str]:
    """
    Creates a list of compounds based on the given parameters.

    Parameters:
    tissue (str): Tissue type
    gender (str): Gender
    up_regulated_genes (List[str]): List of up regulated genes
    down_regulated_genes (List[str]): List of down regulated genes
    top_n (int): Number of top compounds to return
    retry_on_compounds (int): Number of retries in case of failure

    Returns:
    List[str]: List of generated compounds
    """

    retries = 0
    generated_compounds = []
    for iteration_number in range(retry_on_compounds):
        try:
            config_lists_to_compound = create_config_lists_to_compound(
                tissue,
                gender,
                iteration_number,
                up_regulated_genes,
                down_regulated_genes,
            )
            compounds = query(config_lists_to_compound)
            # assert compounds.get("compounds") and len(compounds["compounds"]) > 0
            if not compounds.get("compounds") or len(compounds["compounds"]) == 0:
                raise ValueError("No compounds found in the response")

            generated_compounds = filter_compounds(
                compounds,
                top_n,
                tissue,
                compound_black_list_path,
                compound_hub_list_path,
                compound_flagged_list_path,
            )
            # assert len(generated_compounds) > 1
            if len(generated_compounds) <= 1:
                raise ValueError("Insufficient number of generated compounds")
            break
        except Exception as e:
            retries += 1
            logger.error(f"Compounds are not generated: {e}")
            time.sleep(1)

    return generated_compounds, retries


def check_server_status(initiation_config_path: str, retry_on_api: int):
    """
    Function to check the server status and turn off the sleep mode of the API for further usage

    Parameters:
    initiation_config_path (str): Path to any configuration file
    retry_on_api (int): Number of retries on API failure

    Returns:
    None
    """
    for _ in range(retry_on_api):
        try:
            initiation_config = load_config_file(initiation_config_path)
            query(initiation_config)
            break
        except requests.exceptions.HTTPError as errh:
            logger.error(f"Huggingface Sever error - {errh}")
            time.sleep(30)


def retrieve_mock_generated_compounds(tissue: str, gender: str, mock_compounds_path: str) -> list:
    """
    Retrieve mock generated compounds based on tissue and gender.

    :param tissue: The tissue type.
    :param gender: The gender.
    :param mock_compounds_path: The path to the mock compounds file.
    :return: The mock compounds for the specified tissue and gender.
    """
    mock_compounds = load_config_file(mock_compounds_path)
    return mock_compounds[tissue][gender]["generated_compounds"]


class Precious3GPTReverseAgingTool(BaseTool, extra="allow"):
    """
    This tool is used to get the list of compounds that reverse aging for the selected tissue and gender.
    """

    name: str = ToolNames.PRECIOUS3GPT_REVERSE_AGING_TOOL
    args_schema: Type[BaseModel] = Precious3GPTReverseAgingInputModel

    def __init__(
        self,
        available_tissues_path: str = "kernel/files/data/available_tissues.json",
        initiation_config_path: str = "kernel/files/configs/initiation_config.json",
        compound_black_list_path: str = "kernel/files/data/compound_black_list.pickle",
        compound_hub_list_path: str = "kernel/files/data/compound_hub_list_path.pickle",
        mock_compounds_path: str = "kernel/files/data/mock_compounds.json",
        compound_flagged_list_path: str = "kernel/files/data/flagged_annotation.pickle",
        top_n: int = 8,
        retry_on_api: int = 10,
        retry_on_lists: int = 2,
        retry_on_compounds: int = 2,
        retry_on_inputs: int = 2,
        tissue_with_fixed_gender: Optional[dict] = None,
        default_tissue: str = "skin",
        default_gender: str = "m",
        use_mock_data: bool = True,
    ):
        """
        :param available_tissues_path: Path to the liist of available tissues pickle file.
        :param initiation_config_path: Path to the initiation \
            config json file (any config to initiate the API).
        :param compound_black_list_path: Path to compound_black_list_path pickle file (with toxic compounds).
        :param compound_hub_list_path: Path to compound_hub_list_path pickle file (with hub compunds).
        :param mock_compounds_path: Path to file with compounds generated \
            in advance (in case of Precious3GPT prediction fails).
        :param top_n: Number of top compounds to return.
        :param retry_on_api: Number of retries on API failure.
        :param retry_on_lists: : Number of retries on up- and down- lists creation failure.
        :param retry_on_compounds: Number of retries on compounds creation failure.
        :param retry_on_inputs: Number of retries on inputs processing failure.
        :param default_tissue: Default tissue to use if input tissue is not available.
        :param default_gender: Default gender to use if input gender is not valid.
        :param tissue_with_fixed_gender: The list of tissues for which only one gender is possible
        :param compound_flagged_list_path: The annotaion of compounds
        :param use_mock_data: If to use mock data, when the generation was not successful

        """

        description = (
            "Useful when you need to get the list of compounds that reverse aging for "
            "the selected tissue and gender. There are should be two inputs. "
            "First input is a tissue name (a string), second input is a gender string ('m' or 'f'). "
            "Always input 2 arguments (tissue and gender) in this tool"
        )
        super().__init__(description=description)

        if tissue_with_fixed_gender is None:
            tissue_with_fixed_gender = {
                "breast": "f",
                "ovary": "f",
                "internal female genital organ": "f",
                "prostate": "m",
                "internal male genital organ": "m",
            }
        self.available_tissues_path = available_tissues_path
        self.initiation_config_path = initiation_config_path
        self.mock_compounds_path = mock_compounds_path
        self.compound_flagged_list_path = compound_flagged_list_path
        self.top_n = top_n
        self.retry_on_compounds = retry_on_compounds
        self.retry_on_inputs = retry_on_inputs
        self.default_tissue = default_tissue
        self.default_gender = default_gender
        self.retry_on_api = retry_on_api
        self.retry_on_lists = retry_on_lists
        self.compound_black_list_path = compound_black_list_path
        self.compound_hub_list_path = compound_hub_list_path
        self.tissue_with_fixed_gender = tissue_with_fixed_gender
        self.use_mock_data = use_mock_data

    def _run(self, tissue: str, gender: str):
        """
        Run the tool with the given tissue and gender.

        :param tissue: Tissue name to use.
        :param gender: Gender to use.
        :return: Generated compunds to reverse aging.
        """

        if not settings.HUGGINFACE_AUTHORIZATION_TOKEN or not settings.HUGGINFACE_API:
            logger.warning("Huggingface API is not configured")
            return ""

        check_server_status(self.initiation_config_path, self.retry_on_api)
        tissue = process_tissue(
            tissue,
            self.available_tissues_path,
            self.retry_on_inputs,
            self.default_tissue,
        )
        if tissue in self.tissue_with_fixed_gender.keys():
            gender = self.tissue_with_fixed_gender[tissue]
        else:
            gender = process_gender(gender, self.retry_on_inputs, self.default_gender)
        generated_compounds = []
        down_regulated_genes, up_regulated_genes, _ = create_lists_from_metadata(
            tissue, gender, retry_on_lists=self.retry_on_lists
        )
        generated_compounds, _ = create_compounds_from_lists(
            tissue,
            gender,
            up_regulated_genes,
            down_regulated_genes,
            top_n=self.top_n,
            retry_on_compounds=self.retry_on_compounds,
            compound_black_list_path=self.compound_black_list_path,
            compound_hub_list_path=self.compound_hub_list_path,
            compound_flagged_list_path=self.compound_flagged_list_path,
        )
        if self.use_mock_data:
            if not generated_compounds:
                generated_compounds = retrieve_mock_generated_compounds(
                    tissue, gender, self.mock_compounds_path
                )

        return generated_compounds
