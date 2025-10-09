import { GenerationFlow, UserInput } from './template';

export type DocumentStage =
  | 'section_generating'
  | 'section_generated'
  | 'plan_generating'
  | 'plan_generated'
  | 'content_generating'
  | 'content_generated'
  | 'polishing'
  | 'polished'
  | 'draft';

export type DocumentStatus =
  | 'in_progress'
  | 'failed'
  | 'limited'
  | 'polishing'
  | 'completed'
  | 'initialized';

export type ReferenceSourceType = 'pubmed' | 'pmc' | 'file' | 'websearch';

export interface Section {
  id: string;
  slug: string;
  title: string;
  status: string;
  plan?: string;
  requires_plan: boolean;
  custom_data?: string;
  result: {
    data: string;
    data_format?: any[];
  };
  sub_sections: Section[];
  is_edited: boolean;
  is_refined: boolean;
  refined_result?: Record<string, any>;
  like?: boolean;
  display_on_plan_overview: boolean;
  display_name_on_plan_overview?: string;
  label: string;
}

export type Metadata = {
  title?: string;
  authors?: string[];
  pub_year: number;
  pub_type?: string[];
  journal_name?: string;
  citation_text?: string;
  citation_count?: number;
  pubmed_id?: string;
  doi?: string;
  pmc_id?: string;
  text?: string;
  file_name?: string;
  url?: string;
  object_id?: string;
};

export type Chunk = {
  pubmed_id: number;
  chunk_id: string;
  abstract_chunk?: string | null;
  fulltext_chunk?: string | null;
  chunk?: string | null;
  similarity?: number;
  source?: string;
  metadata?: Partial<Metadata>;
};

export type Bibliography = {
  id?: string;
  uid?: string;
  name?: string;
  object_id?: string;
  chunk_id?: string;
  type?: ReferenceSourceType;
  chunks?: Record<string, Chunk>;
  mermaid_diagram?: MermaidDiagramData | null;
  metadata?: Partial<Metadata>;
  isNew?: boolean;
};

export interface DocumentData extends Record<string, any> {
  id: string;
  title: string;
  settings?: {
    plan: string;
    agents: Record<string, { resources?: string[] }>;
    custom_data: Record<string, any>;
    user_inputs: Record<string, string>;
    custom_bibliography_file_pks: string[];
  };
  stage: DocumentStage;
  status: DocumentStatus;
  sections: Section[];
  template_id: string;
  template_name: string;
  estimated_document_generation_minutes?: number;
  bibliographies: Bibliography[];
  like?: boolean;
  publication_settings?: {
    top_cited?: boolean;
    article_types?: string[];
    publication_date?: string;
  };
  created_at: string;
  updated_at: string;
  template_type: string;
  custom_bibliographies?: Bibliography[];
  filled_user_inputs?: UserInput[];
  mermaid_diagram?: any;
  section_influences?: any;
  name: string;
  type: string;
  content?: any[];
}

export interface DocumentItem extends Partial<DocumentData> {
  generation_flow?: GenerationFlow;
  isNew?: boolean;
}

export interface MermaidDiagramData {
  diagram_type: string;
  mermaid_editor_link: string;
  svg_diagram: string;
}

export enum ReviewSuggestionSeriousnessLevels {
  low = 'low',
  medium = 'medium',
  high = 'high'
}

export interface LanguageMetrics {
  reading_time_minutes: number;
  section_word_character_counts: { [key: string]: number[] };
  total_character_count: number;
  total_word_count: number;
}

export interface ReadabilityMetrics {
  flesch_kincaid_grade: number;
}

export interface ArgumentationMetrics {
  publication_year_distribution: { [key: string]: number };
  total_references: number;
  unique_references: number;
}

export enum PredefinedCategoryIds {
  language = 'language_and_style',
  readability = 'readability_and_structure',
  argumentation = 'argumentation_and_evidence',
  content = 'content_and_relevance'
}

export interface ReviewCategoryItem {
  id: string;
  title: string;
  score: number;
  score_explanation: string;
  suggestions: ReviewCategorySuggestion[];
  code_based_metrics:
    | LanguageMetrics
    | ReadabilityMetrics
    | ArgumentationMetrics
    | null;
}

export interface ReviewCategorySuggestion {
  seriousness: string;
  text: string;
}

export enum DocumentViewMods {
  card = 'card',
  column = 'column'
}

export enum RightPanelComponentIds {
  bibliography = 'bibliography',
  reviewInsights = 'reviewinsights',
  textEvidence = 'textevidence'
}

// Logs data types
interface AgentResult {
  [key: string]: any;
}

interface GenerationLog {
  agents_result?: AgentResult[];
}

interface SubSection {
  title?: string;
  generation_log?: GenerationLog;
}

interface AgentLogsBySection {
  title?: string;
  generation_log?: GenerationLog;
  sub_sections?: SubSection[];
}

interface Message {
  text: string;
  agents?: string[];
}

interface MasterAgent {
  title?: string;
  messages?: Message[];
  agents?: string[];
}

export interface LogsData {
  agent_logs_by_sections?: AgentLogsBySection[];
  master?: MasterAgent;
  stage?: string;
  status?: string;
  template_name?: string;
  title?: string;
}
