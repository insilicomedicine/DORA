import json
import logging
from pathlib import Path
from typing import ClassVar, Dict, List, Optional, Type

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.tools import BaseTool
from langchain_openai import AzureChatOpenAI
from pydantic import BaseModel, Field

from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm
from kernel.llm_agent_tools.helpers.disease_mapping import disease_search_with_synonyms
from kernel.llm_agent_tools.helpers.get_protein_families import get_protein_families
from kernel.llm_agent_tools.helpers.get_targetid_data import get_targetid_data_from_pandaomics

logger = logging.getLogger(__name__)


class QueryParameters(BaseModel):
    """Structured parameters for querying the target database."""

    disease: str = Field(
        None,
        description=(
            "The name of disease / or name a group of diseases to filter targets for. "
            "Could be one or several names"
        ),
    )
    gene: Optional[List[str]] = Field(None, description="List with name(s) of gene(s) to filter targets for")
    top_n: Optional[int] = Field(
        30,
        description=(
            "Number of top targets to return. Could be more than asked "
            "by the user to filter the genes in the downstream analysis"
        ),
    )
    protein_family: Optional[List[str]] = Field(
        None, description="Specific protein family or families to filter for"
    )
    small_molecules_score: Optional[List[int]] = Field(
        None,
        description=(
            "The druggability score. Targeted by known small molecules. "
            "2 - Gene belongs to the druggable family AND there are small molecules "
            "known to target gene's product. Possible values: (2, 1, or 0)"
        ),
    )
    antibodies_score: Optional[List[int]] = Field(
        None,
        description=(
            "The druggability score. Targeted by known antibodies. "
            "2 - Genes encoding secreted or membrane-bound proteins "
            "which can be targeted by antibodies. Possible values: (2, 1, or 0)"
        ),
    )
    safety_score: Optional[List[int]] = Field(
        None,
        description=(
            "The druggability score. Is safe to target. 2 - Non-essential genes or genes "
            "whose products are targeted by small molecules in clinical trials, safe to target."
            " Possible values: (2, 1, or 0)"
        ),
    )
    novelty_score: Optional[List[int]] = Field(
        None,
        description=(
            "The druggability score. Is novel target. Use 2 for novel targets. Possible values: (2, 1 or 0)"
        ),
    )
    selected_scores: Optional[List[str]] = Field(
        None,
        description=(
            "List of TargetID scores  to use for gene ranking in the disease."
            " Should not be repeated with druggability scores."
            " If not provided, all available scores will be used."
        ),
    )


class AllQueryParameters(BaseModel):
    """Structured parameters for querying the target database."""

    queries: List[QueryParameters] = Field(description="Ordered list of queries")


class TargetQueryInput(BaseModel):
    """Input schema for target parsing queries."""

    query: str = Field(
        description=(
            "Question about properties of drug targets. "
            "Formulate several question in one string if user asks for tables filtered by "
            "several criteria or needs targets with different properties. "
            "The number of top targets to return should be more than asked by the user to "
            "filter the genes in the downstream analysis. Give all details user provided to "
            "create efficient query or queries. Prioritize creation of several tables over 1."
        )
    )


class TargetAnalyzerTool(BaseTool):
    """Tool for parsing and analyzing drug target data using natural language queries."""

    name: str = "pandaomics_targetID_analyzer"
    description: str = (
        "Tool that analyzes drug target data (TargetID from PandaOmics) to find promising "
        "targets for the selected disease(s). Restricted to data available in PandaOmics. "
        "Provides access to table TargetID data with data on availability of small molecules "
        "and antibodies for targets, targets safety and novetly, as well as TargetID scores "
        "(KOL scores, Financial scores, Text-based (NLP) scores, Omics scores). "
        "Useful to answer queries about target rankings in disease, targets druggability with "
        "small molecules/antibodies, novelty, target safety and to get TargetID scores. "
        "Could output several tables if user asks for tables filtered by several criteria or "
        "needs targets with different properties. "
        "Prioritize creation of several tables over one big table."
    )
    args_schema: Type[BaseModel] = TargetQueryInput
    druggability_scores_description: Optional[Dict] = None
    targetID_scores_description: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    tool_llm: Optional[AzureChatOpenAI] = None
    protein_families: Optional[Dict] = None
    golden_projects_names_path: ClassVar[Path] = "kernel/files/data/golden_projects_names.feather"

    def __init__(self):
        """Initialize the tool with LLM for query parsing.

        Args:
            data_path: Path to the feather file containing target data
        """
        super().__init__()
        # Load druggability and TargetID scores description
        try:
            with open("kernel/files/data/druggability_scores_description.json", "r") as f:
                self.druggability_scores_description = json.load(f)
            with open("kernel/files/data/targetid_scores_description_pandaomics_names.json", "r") as f:
                self.targetID_scores_description = json.load(f)

        except Exception as e:
            logger.error("Failed to load configuration files: %s", str(e), exc_info=True)
            raise

        if self.protein_families is None:
            self.protein_families = get_protein_families()
            logger.info("Retrieved %s protein families", len(self.protein_families))

        # Setup LLM
        self.tool_llm = init_llm(temperature=0.6)

    def _parse_query(self, query: str) -> AllQueryParameters:
        """Parse natural language query into structured parameters using LLM.

        This method supports parsing multiple queries from a single input, returning
        an AllQueryParameters object containing a list of QueryParameters.
        """
        output_parser = PydanticOutputParser(pydantic_object=AllQueryParameters)

        # Create prompt template with format instructions
        default_prompt_template = (
            "You are a biologist, an expert in parsing natural language queries about drug targets "
            "into structured parameters for table analysis.\nConvert the user's query or queries into "
            "one or more sets of parameters for filtering and ranking target data. "
            "Sets could be several if the user asks for several tables filtered by different criteria or "
            "targets with different properties.\n\n## AVAILABLE TARGET FAMILIES:\n{protein_families}\n\n"
            "## TARGET ID SCORE DESCRIPTIONS:\n{targetid_scores_description}\n\n"
            "## DRUGGABILITY SCORE DESCRIPTIONS:\n{druggability_scores_description}\n\n"
            "### INSTRUCTIONS FOR PARAMETERS CONSTRUCTION: \n#### GENERAL:\n- If user does not mention "
            "specific criteria, do not include them in the parameters.\n- Use only parameters mentioned in "
            "the expected output format.\n- If the query suggests multiple different analyses "
            "(e.g., comparing different diseases or criteria), create multiple parameter sets in the queries "
            "list.\n- Each set of parameters will generate a separate table in the results.\n"
            "- Prioritize creating several focused tables over one large table.\n\n"
            "#### FILTERING AND RANKING INSTRUCTIONS:\nThe tool will apply filters in this order:\n"
            "1. Disease filter - required\n2. Druggability filters (small_molecules_score, antibodies_score, "
            "safety_score, novelty_score), if specified\n3. Ranking based on selected scores, "
            "if specified\n\n#### SCORE-BASED RANKING:\n- Use selected_scores to specify which scores "
            "should be used for ranking\n- The tool will create a novel rank based on the mean of "
            "selected scores\n- Choose scores that are most relevant to the user's query\n"
            "- Examples of score combinations:\n    * For trending targets with funding potential:"
            "\n    selected_scores=['trend', 'funding', 'fund_per_pub']\n\n"
            "Always check the score descriptions to understand:\n* What each score measures\n"
            "* The biological interpretation of high/low values\n* Which scores work well together "
            "for specific analysis goals\n\n### USER QUERY: \n{user_input}\n\n"
            "### EXPECTED OUTPUT FORMAT:\n{format_instructions}\n\n"
        )

        prompt_template = (
            Config.get(ConfigKeyType.TOOL_PROMPTS, {})
            .get(self.name, {})
            .get("parse_query", default_prompt_template)
        )
        query_prompt = PromptTemplate(
            template=prompt_template,
            input_variables=[
                "user_input",
                "targetid_scores_description",
                "protein_families",
                "druggability_scores_description",
            ],
            partial_variables={"format_instructions": output_parser.get_format_instructions()},
        )
        logger.info("User query: %s", query)

        # Create the chain steps
        prompt_step = query_prompt | self.tool_llm
        extract_content = RunnableLambda(lambda x: x.content if hasattr(x, "content") else x)
        parse_step = RunnableLambda(output_parser.parse)

        # Chain them together
        chain = prompt_step | extract_content | parse_step
        try:
            output = chain.invoke(
                {
                    "user_input": query,
                    "druggability_scores_description": json.dumps(self.druggability_scores_description),
                    "protein_families": "\n - ".join(list(self.protein_families.keys())),
                    "targetid_scores_description": json.dumps(self.targetID_scores_description),
                }
            )
            logger.info("LLM convert query to the following parameters: %s", output)
            return output

        except Exception as e:
            logger.error(f"Error in LLM: {e}, retry with ddruggability scores only")
            return []

    def _make_disease_mapping(self, disease: str) -> str | None:
        """Map a disease name to its ID using exact match, synonyms, or LLM mapping."""
        if disease is None:
            return None
        else:
            logger.info(f"Attempting to map a disease: {disease}")
            # Create a separate LLM instance with lower temperature for mapping
            mapping_llm = init_llm(temperature=0.1)
            try:
                disease_id = disease_search_with_synonyms(
                    golden_projects_names_path=self.golden_projects_names_path,
                    term=disease,
                    llm=mapping_llm,
                )
                return disease_id

            except Exception as e:
                logger.error(f"Error in disease mapping: {e}")
                return None

    def _initialize_filter_sequence(self, params: QueryParameters) -> Dict:
        """Initialize the sequence of filters to apply.

        Args:
            params: Query parameters to build filters from

        Returns:
            Dictionary containing filter configuration
        """
        filter_sequence: Dict = {}

        try:
            filter_sequence["disease"] = params.disease

            # Add primary filters (gene)
            if params.gene:
                filter_sequence["gene"] = params.gene

            # Add protein family filters
            if params.protein_family:
                filter_sequence["protein_family"] = [
                    self.protein_families.get(i) for i in params.protein_family
                ]

            # Add druggability filters
            druggability_filters = [
                key for key in self.druggability_scores_description if "general_notes" not in key
            ]
            filter_sequence["druggability_filters"] = {}

            for filter_type in druggability_filters:
                value = getattr(params, filter_type)
                if value:
                    filter_sequence["druggability_filters"][filter_type] = value

            # Add regular TargetID scores
            if params.selected_scores:
                filter_sequence["scores"] = params.selected_scores

            # Add top_n
            if params.top_n:
                filter_sequence["top_n"] = params.top_n

            logger.info(f"Initialized filter sequence: {filter_sequence}")
            return filter_sequence

        except Exception as e:
            logger.error(f"Error initializing filter sequence: {e}")
            return {}

    def _run(
        self,
        query: str,
    ) -> List[Dict]:
        """Process a natural language query about drug targets.

        This method now supports generating multiple tables based on the query parameters.
        Each table is accompanied by metadata describing its contents and filtering criteria.

        Returns:
            Dict with 'table' key containing CSV data that can be parsed into a pandas DataFrame
        """
        try:
            query_params_list = self._parse_query(query)
            if not query_params_list:
                return {"table": "No valid query parameters found. Retry with other query."}

            # Initialize tables list to store multiple result tables
            tables = []
            disease_mapping_cache = {}

            # Process each set of query parameters
            for index, params in enumerate(query_params_list.queries):
                if not params.disease:
                    raise ValueError(
                        "Disease parameter is required but was not "
                        f"specified in the query {index + 1}: {params}"
                    )

                # Map disease names if present
                logger.info(f"Original disease names for query {index + 1}: {params.disease}")
                # Convert to lowercase
                disease = params.disease.lower()

                if disease in disease_mapping_cache:
                    disease_id = disease_mapping_cache[disease]
                    logger.info(f"Using cached mapping for disease: {disease}")
                else:
                    # Map new disease and cache the result
                    disease_id = self._make_disease_mapping(disease)
                    if disease_id is None:
                        return ["no such disease"]

                    disease_mapping_cache[disease] = disease_id
                    logger.info(f"New mapping for disease: {disease} -> {disease_id}")

                if params.top_n is None or params.top_n > 50:
                    logger.info(f"Identified top N = {params.top_n}. Decreasing to 50")
                    params.top_n = 50

                filter_sequence = self._initialize_filter_sequence(params)
                targetid_filtered_data = get_targetid_data_from_pandaomics(disease_id, filter_sequence)

                if not targetid_filtered_data.empty:
                    # Store DataFrame info separately
                    tables.append(
                        {
                            "table": f"Table {index + 1}",
                            "data": {
                                "columns": list(targetid_filtered_data.columns),
                                "values": targetid_filtered_data.values.tolist(),
                            },
                            "metadata": filter_sequence,
                        }
                    )

            return tables

        except Exception as e:
            logger.error("Error processing query: %s", str(e), exc_info=True)
            return []
