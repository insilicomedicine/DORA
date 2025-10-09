from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_studies import (
    DrugsClinicalTrialsClinicalStudiesTool,
)
from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_trials_top_drugs_tool import (
    DrugsClinicalTrialsTopDrugsTool,
)
from kernel.llm_agent_tools.tool_dnt_disease_drugs_clinical_trials_top_sponsors_tool import (
    DrugsClinicalTrialsTopSponsorsTool,
)
from kernel.llm_agent_tools.tool_dnt_drugs_list_related_to_gene import DrugsListRelatedToGeneTool
from kernel.llm_agent_tools.tool_dnt_indications_with_developed_gene_molecules import (
    IndicationsWithDevelopedMoleculesTool,
)
from kernel.llm_agent_tools.tool_dnt_recent_clinical_studies_for_gene import RecentClinicalStudiesForGeneTool
from kernel.llm_agent_tools.tool_gene_level_in_healty_human_tissues import GeneLevelInHealthyHumanTissuesTool
from kernel.llm_agent_tools.tool_genetic_evidence_for_gene_in_disease import (
    GeneticEvidenceForGeneInDiseaseTool,
)
from kernel.llm_agent_tools.tool_precious3gpt_reverse_aging import Precious3GPTReverseAgingTool
from kernel.llm_agent_tools.tool_protein_level_in_healthy_human_tissues import (
    ProteinLevelInHealthyHumanTissuesTool,
)
from kernel.llm_agent_tools.tool_pubmed_abstract_similarity_search import PubmedAbstractSimilaritySearchTool
from kernel.llm_agent_tools.tool_target_analyzer import TargetAnalyzerTool
from kernel.llm_agent_tools.tool_web_search import WebSearchTool

internal_tools_mapping = {
    "pubmed_abstract_similarity_search_tool": PubmedAbstractSimilaritySearchTool,
    "precious3gpt_reverse_aging_tool": Precious3GPTReverseAgingTool,
    "web_search_tool": WebSearchTool,
    "protein_level_in_healthy_human_tissues": ProteinLevelInHealthyHumanTissuesTool,
    "gene_level_in_healthy_human_tissues": GeneLevelInHealthyHumanTissuesTool,
    "Drugs_list_related_to_Gene": DrugsListRelatedToGeneTool,
    "Recent_clinical_studies_for_Gene": RecentClinicalStudiesForGeneTool,
    "Indications_with_developed_Gene_molecules": IndicationsWithDevelopedMoleculesTool,
    "recent_clinical_studies_for_disease": DrugsClinicalTrialsClinicalStudiesTool,
    "association_related_drugs": DrugsClinicalTrialsTopDrugsTool,
    "sponsors_for_drug_development_for_disease": DrugsClinicalTrialsTopSponsorsTool,
    "genetic_evidence_for_gene_in_disease": GeneticEvidenceForGeneInDiseaseTool,
    "pandaomics_targetID_analyzer": TargetAnalyzerTool,
}
