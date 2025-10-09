export type UserInput = {
  default_value?: string;
  display_name: string;
  display_size: string;
  slug: string;
  text_limit?: number;
  type?: string;
  value?: string;
};

export type GenerationFlow = 'linear' | 'single_page';

export type Template = {
  id: string;
  description: string;
  name?: string;
  type?: string;
  generation_flow?: GenerationFlow;
  use_cases?: string[];
  user_inputs?: UserInput[];
  sections?: any[];
  section_influences?: any[];
  display_name_on_plan_overview: string;
};
