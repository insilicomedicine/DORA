import ast
import logging
from hashlib import md5
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

import sentry_sdk

from app.notifications import (
    NotificationStatus,
    NotificationType,
    get_notification_payload,
    send_ws_notification,
)
from documents.serializers import TransparencyRetrieveSerializer
from documents.transparency.defs import ToolStatus
from kernel.utils import flatten_sections, is_available_tool

if TYPE_CHECKING:
    from documents.models import Document, Section

logger = logging.getLogger(__name__)


class ToolInputOutputFormatter:
    @staticmethod
    def get_python_object_from_string(string: str) -> Union[dict, list, None]:
        try:
            return ast.literal_eval(string)
        except (ValueError, SyntaxError):
            return None

    @staticmethod
    def format_text(text: str) -> str:
        if not text:
            return ""
        return str(text).replace("\n\n", "\n")

    @staticmethod
    def format_ranks_to_column(ranks: List[Dict[str, Union[str, int]]]) -> str:
        return "\n".join(f"{rank['rank']} {rank['name']}," for rank in ranks)

    @staticmethod
    def format_list_to_enumarated_column(
        parsed_input: list[str],
        rows_to_show: int = 5,
    ) -> str:
        output = [
            f"{index + 1}. {element.capitalize()}"
            for index, element in enumerate(parsed_input[:rows_to_show])
        ]

        if len(parsed_input) > rows_to_show:
            output.append(f"  ... and {len(parsed_input) - rows_to_show} more rows")

        return "\n".join(output)

    @staticmethod
    def format_gene_in_disease(parsed_input: dict) -> str:
        return f"{parsed_input['gene_name']} in {parsed_input['disease_name'].capitalize()}"

    @staticmethod
    def format_tissue_and_gender(parsed_input: dict[str, str]) -> str:
        return f"Tissue: {parsed_input['tissue']}, Gender: {parsed_input['gender']}"

    @staticmethod
    def format_gene(parsed_input: dict) -> str:
        return f"{parsed_input['gene_name']}"

    @staticmethod
    def format_disease(parsed_input: dict) -> str:
        return f"{parsed_input['disease_name'].capitalize()}"

    @staticmethod
    def format_genes_in_disease(parsed_input: dict) -> str:
        """
        Format {'gene_names': ['CA1', 'CA2', 'FOXQ1', 'RCRDD123'], 'disease_name': 'colorectal cancer'}
        to "CA1, CA2, FOXQ1, and RCRDD123 in Colorectal cancer"
        """
        gene_names = parsed_input.get("gene_names", [])
        disease_name = parsed_input.get("disease_name", "")

        if not gene_names:
            gene_names_str = "No genes"
        elif len(gene_names) == 1:
            gene_names_str = gene_names[0]
        else:
            gene_names_list = ", ".join(gene_names[:-1])
            last_gene_name = gene_names[-1]
            gene_names_str = f"{gene_names_list} and {last_gene_name}"

        return f"{gene_names_str} in {disease_name.capitalize()}"

    @staticmethod
    def format_list_diff_expression(parsed_input: list[dict]) -> str:
        output = []
        for idx, record in enumerate(parsed_input, start=1):
            transcriptomic = record.get("transcriptomic", {})
            methylation = record.get("methylation", {})
            gene = transcriptomic.get("gene_symbol") or methylation.get("gene_symbol") or "Unknown"
            output.append(f"{idx}. Gene: {gene}")

            if transcriptomic:
                output.append(" Transcriptomic:")
                output.append(
                    f" - CombinedLFC: {transcriptomic['combined_lfc_norm']} "
                    f"P-value: {transcriptomic['combined_pval']}"
                )

            if methylation:
                output.append(" Methylation:")
                output.append(
                    f" - CombinedLFC: {methylation['combined_lfc_norm']} "
                    f"P-value: {methylation['combined_pval']}"
                )

        return "\n".join(output)

    @staticmethod
    def format_question(parsed_input: dict) -> str:
        return f"Question: {parsed_input.get('question') or parsed_input.get('query')}"

    @staticmethod
    def format_diff_expression(parsed_input: dict) -> str:
        return f"CombinedLFC: {parsed_input['combined_lfc_norm']} P-value: {parsed_input['combined_pval']}"

    @staticmethod
    def format_diff_exp_table_to_column(
        parsed_input: List[Dict[str, Union[str, float]]],
        datasets_to_show: int = 10,
    ) -> str:
        output = []
        for item in parsed_input[:datasets_to_show]:
            dataset = item.get("dataset_name", "Unknown dataset")
            technology = item.get("technology", "unknown")
            tissue = item.get("experiment_group", "unknown")
            lfc = item.get("lfc_norm", 0)
            pval = item.get("pval", 0)
            output.append(
                f"  {dataset} - Technology {technology}; Tissue {tissue}; LFC {lfc}; P-value {pval}"
            )

        if len(parsed_input) > datasets_to_show:
            output.append(f"  ... and {len(parsed_input) - datasets_to_show} more datasets")

        return "\n".join(output)

    @staticmethod
    def format_dnt_table_to_column(
        parsed_input: List[Dict[str, Union[str]]],
        rows_to_show: int = 10,
    ) -> str:
        output = []

        for item in parsed_input[:rows_to_show]:
            nct_id = item.get("nct_id", "Unknown")
            phase = item.get("phase", "unknown")
            drug_name = item.get("drug_name", "unknown")
            drug_type = item.get("drug_type", "unknown")
            disease_name = item.get("disease_name", "unknown")
            sponsor_lead = item.get("sponsor_lead", "unknown")
            completion_year = item.get("completion_year", "unknown")
            output.append(
                f"  NCT_ID: {nct_id}; Phase: {phase}; "
                f"Drug: {drug_name}; "
                f"Type: {drug_type}; "
                f"Disease: {disease_name}; "
                f"Sponsor: {sponsor_lead}; "
                f"Completion Year: {completion_year}"
            )

        if len(parsed_input) > rows_to_show:
            output.append(f"  ... and {len(parsed_input) - rows_to_show} more rows")

        return "\n".join(output)

    @staticmethod
    def format_protein_level_in_human_tissues_table(
        parsed_input: List[Dict[str, Union[str, float]]],
        rows_to_show: int = 10,
    ) -> str:
        """
        Format a list of {'tissue': 'basal ganglia', 'ntpm': 26.5} to a column string.
        """
        output = []

        for item in parsed_input[:rows_to_show]:
            tissue = item.get("tissue", "Unknown")
            ntpm = item.get("ntpm", "unknown")
            output.append(f"  Tissue: '{tissue}'; nTPM: {ntpm}")

        if len(parsed_input) > rows_to_show:
            output.append(f"  ... and {len(parsed_input) - rows_to_show} more rows")

        return "\n".join(output)

    @staticmethod
    def format_gene_level_in_human_tissues_table(
        parsed_input: List[Dict[str, str]],
        rows_to_show: int = 10,
    ) -> str:
        """
        Format a list of {'tissue': 'adipose tissue', 'cell_type': 'adipocytes', 'level': 'Not detected'}
        to a column string.
        """
        output = []
        for item in parsed_input[:rows_to_show]:
            tissue = item.get("tissue", "Unknown")
            cell_type = item.get("cell_type", "unknown")
            level = item.get("level", "unknown")
            output.append(f"  Tissue: '{tissue}'; Cell type: '{cell_type}'; Level: '{level}'")

        if len(parsed_input) > rows_to_show:
            output.append(f"  ... and {len(parsed_input) - rows_to_show} more rows")

        return "\n".join(output)

    @staticmethod
    def format_rows_to_table(
        parsed_input: List[Dict[str, str]],
        rows_to_show: int = 10,
    ) -> str:
        output = []
        for item in parsed_input[:rows_to_show]:
            row = [f"{k.replace('_', ' ').capitalize()}: {v};" for k, v in item.items()]
            output.append(" ".join(row))

        if len(parsed_input) > rows_to_show:
            output.append(f"  ... and {len(parsed_input) - rows_to_show} more rows")

        return "\n".join(output)

    @staticmethod
    def format_knowledge_graph_output(parsed_input: list[str]) -> str:
        return "\n".join(parsed_input)

    @staticmethod
    def format_target_analyzer_output(parsed_input: list[dict]) -> str:
        """
        Format the target analyzer output data showing top genes with relevant metadata.

        Args:
            parsed_input: List of dictionaries containing target analyzer results with tables data

        Returns:
            Formatted string with top genes and their metadata
        """
        if not parsed_input or not isinstance(parsed_input, list):
            return "No data available"

        result_lines = [
            (
                "Here are the top-ranked genes filtered according to your query. "
                "For details, please explore PandaOmics"
            )
        ]

        for table_data in parsed_input:
            if not isinstance(table_data, dict) or "data" not in table_data or "metadata" not in table_data:
                continue

            data = table_data["data"]
            metadata = table_data["metadata"]
            disease = str(metadata.get("disease", "Unknown disease"))

            columns = data.get("columns", [])
            values = data.get("values", [])

            # Get indices for needed columns
            gene_idx = columns.index("Gene") if "Gene" in columns else -1
            family_idx = columns.index("Target Family") if "Target Family" in columns else -1
            rank_idx = columns.index("Rank") if "Rank" in columns else -1
            small_molecule_idx = columns.index("Small molecule") if "Small molecule" in columns else -1
            biologic_idx = columns.index("Biologic") if "Biologic" in columns else -1
            safety_idx = columns.index("Safety") if "Safety" in columns else -1
            novelty_idx = columns.index("Novelty") if "Novelty" in columns else -1
            expression_idx = columns.index("Expression") if "Expression" in columns else -1
            interactome_idx = (
                columns.index("Interactome Community") if "Interactome Community" in columns else -1
            )
            causal_idx = columns.index("Causal inference") if "Causal inference" in columns else -1
            knockouts_idx = columns.index("Knockouts") if "Knockouts" in columns else -1
            mutations_idx = columns.index("Mutations") if "Mutations" in columns else -1

            # Format each gene's data - limit to top 20 genes
            for gene_data in values[:20]:
                if gene_idx == -1:
                    continue

                gene = gene_data[gene_idx] if gene_idx >= 0 and gene_idx < len(gene_data) else "Unknown"
                family = (
                    gene_data[family_idx] if family_idx >= 0 and family_idx < len(gene_data) else "Unknown"
                )
                rank = gene_data[rank_idx] if rank_idx >= 0 and rank_idx < len(gene_data) else "N/A"
                small_molecule = (
                    gene_data[small_molecule_idx]
                    if small_molecule_idx >= 0 and small_molecule_idx < len(gene_data)
                    else "N/A"
                )
                biologic = (
                    gene_data[biologic_idx] if biologic_idx >= 0 and biologic_idx < len(gene_data) else "N/A"
                )
                safety = gene_data[safety_idx] if safety_idx >= 0 and safety_idx < len(gene_data) else "N/A"
                novelty = (
                    gene_data[novelty_idx] if novelty_idx >= 0 and novelty_idx < len(gene_data) else "N/A"
                )
                expression = (
                    gene_data[expression_idx]
                    if expression_idx >= 0 and expression_idx < len(gene_data)
                    else "N/A"
                )
                interactome = (
                    gene_data[interactome_idx]
                    if interactome_idx >= 0 and interactome_idx < len(gene_data)
                    else "N/A"
                )
                causal = gene_data[causal_idx] if causal_idx >= 0 and causal_idx < len(gene_data) else "N/A"
                knockouts = (
                    gene_data[knockouts_idx]
                    if knockouts_idx >= 0 and knockouts_idx < len(gene_data)
                    else "N/A"
                )
                mutations = (
                    gene_data[mutations_idx]
                    if mutations_idx >= 0 and mutations_idx < len(gene_data)
                    else "N/A"
                )

                # Format line for each gene
                line = (
                    f"{disease}, {gene}, {family}, rank={rank}, small molecule score={small_molecule}, "
                    f"antibodies score={biologic}, safety={safety}, novelty={novelty}, "
                    f"expression={expression}, interactome community={interactome}, "
                    f"causal inference={causal}, knockouts={knockouts}, mutations={mutations}, ..."
                )

                result_lines.append(line)

        return "\n".join(result_lines)

    prettify_by_tool_name = {
        "pubmed_abstract_similarity_search_tool": (format_question, format_text),
        "PandaOmics_combined_diff_expression": (format_gene_in_disease, format_diff_expression),
        "PandaOmics_combined_diff_methylation": (format_gene_in_disease, format_diff_expression),
        "PandaOmics_comparisons_diff_expression": (format_gene_in_disease, format_diff_exp_table_to_column),
        "PandaOmics_comparisons_diff_methylation": (format_gene_in_disease, format_diff_exp_table_to_column),
        "PandaOmics_evidence_from_Knowledge_graph": (format_gene_in_disease, format_knowledge_graph_output),
        "PandaOmics_materials_and_methods": (format_question, format_text),
        "PandaOmics_multiple_gene_omics_results_for_disease": (
            format_genes_in_disease,
            format_list_diff_expression,
        ),
        "PandaOmics_omics_data_overview_disease": (format_disease, format_text),
        "Dora_Indication_Prioritization_Gene_results": (format_gene, format_ranks_to_column),
        "precious3gpt_reverse_aging_tool": (format_tissue_and_gender, format_list_to_enumarated_column),
        "web_search_tool": (format_question, format_text),
        "Recent_clinical_studies_for_Gene": (format_gene, format_dnt_table_to_column),
        "Drugs_list_related_to_Gene": (format_gene, format_list_to_enumarated_column),
        "Indications_with_developed_Gene_molecules": (format_gene, format_list_to_enumarated_column),
        "gene_level_in_healthy_human_tissues": (format_gene, format_gene_level_in_human_tissues_table),
        "protein_level_in_healthy_human_tissues": (format_gene, format_protein_level_in_human_tissues_table),
        "recent_clinical_studies_for_disease": (format_disease, format_rows_to_table),
        "association_related_drugs": (format_disease, format_list_to_enumarated_column),
        "sponsors_for_drug_development_for_disease": (format_disease, format_list_to_enumarated_column),
        "genetic_evidence_for_gene_in_disease": (format_gene_in_disease, format_rows_to_table),
        "pandaomics_targetID_analyzer": (format_question, format_target_analyzer_output),
    }

    @classmethod
    def prettify_io(cls, tool_title: str, message: str, result: Optional[Any]) -> tuple:
        message_prettify, result_prettify = cls.prettify_by_tool_name.get(tool_title, (None, None))

        parsed_message = cls.get_python_object_from_string(message)
        if parsed_message and message_prettify:
            message = message_prettify(parsed_message)

        parsed_result = cls.get_python_object_from_string(result)
        if parsed_result and result_prettify:
            result = result_prettify(parsed_result)

        return message, result


def serialize_transparency(document: "Document") -> dict:
    serializer = TransparencyRetrieveSerializer(document)
    return serializer.data


def send_ws_transparency_message(document: "Document", type: str, message: str, data: dict) -> None:
    notification_data = {"id": str(document.id), "type": type, "message": message, "data": data}
    ws_notification_args = get_notification_payload(
        user_id=document.created_by.id,
        data=notification_data,
        status=NotificationStatus.SUCCESS,
        message=message,
    )
    send_ws_notification(**ws_notification_args)


def update_generation_log(section: "Section", agents_result: dict):
    section.refresh_from_db()
    generation_log = section.generation_log or {}
    generation_log.setdefault("agents_result", []).append(agents_result)
    section.update_fields({"generation_log": generation_log})

    send_ws_transparency_message(
        section.document,
        NotificationType.GENERATION_LOG_UPDATED,
        "transparency",
        serialize_transparency(section.document),
    )


def create_tool_level_record(
    tool_title: str,
    message: str,
    result: Optional[Any] = None,
    hashid: str = None,
    status: str = ToolStatus.COMPLETED,
) -> dict:
    try:
        result = result if result is None else str(result)
    except Exception as exc:
        sentry_sdk.capture_exception(exc)

    try:
        formatted_message, formatted_result = ToolInputOutputFormatter.prettify_io(
            tool_title=tool_title,
            message=message,
            result=result,
        )
    except Exception as exc:
        formatted_message, formatted_result = message, result
        sentry_sdk.capture_exception(exc)

    if not hashid:
        hashid = hash_md5(tool_title + message)

    return {
        "hashid": hashid,
        "agent_title": tool_title,
        "message": formatted_message,
        "status": status,
        "result": formatted_result,
    }


def hash_md5(string: str) -> str:
    return md5(string.encode()).hexdigest()  # nosec (non-cryptographic hash usage)


def create_document_generation_log(document: "Document") -> Dict[str, Any]:
    template_json = document.template_json
    tool_display_names = template_json.get("tool_display_names", {})
    checked_agents = document.settings.get("agents", {})

    # Get all tools from sections
    tools = set()
    for section_data in flatten_sections(template_json.get("sections", [])):
        tools.update(section_data.get("tools", []))

    # Filter tools that are available and add checked agents that weren't in tools
    available_tools = [tool for tool in tools if is_available_tool(tool, checked_agents)]
    available_tools.extend(agent for agent in checked_agents if agent not in available_tools)

    # Process tool names for display
    tool_processed_names = [tool_display_names.get(tool, tool) for tool in available_tools]

    # Create the agents result data structure
    return {
        "agents_result": [
            {"text": "Analyzing input...", "agents": []},
            {"text": "Spawning team of agents...", "agents": tool_processed_names},
        ]
    }
