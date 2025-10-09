import { create } from 'zustand';

type Subsection = {
  slug: string;
  title: string;
  content?: string;
  sub_sections?: Subsection[];
};

type Section = {
  slug: string;
  title: string;
  sub_sections: Subsection[];
};

type Agent = {
  [key: string]: {
    resources: string[];
  };
};

interface SettingsState {
  user_inputs: Record<string, string>;
  custom_data: Record<string, any>;
  custom_subsections: Record<string, Subsection[]>;
  sections: Section[];
  plan: string;
  agents: Agent;
  uploadingFiles: boolean;
  custom_bibliography_file_pks: string[];
  [key: string]: any;
  setUserInputs: (inputs: Record<string, string>) => void;
  setCustomData: (customData: Record<string, any>) => void;
  setCustomSubsections: (
    customSubsections: Record<string, Subsection[]>
  ) => void;
  addCustomSubsection: (key: string, subsection: Subsection) => void;
  removeCustomSubsection: (key: string, subsectionSlug: string) => void;
  updateCustomSubsection: (
    key: string,
    subsectionSlug: string,
    updatedData: Partial<Subsection>
  ) => void;
  setSections: (sections: Section[]) => void;
  addSection: (section: Section) => void;
  addSubsection: (sectionSlug: string, subsection: Subsection) => void;
  removeSubsection: (sectionSlug: string, subsectionSlug: string) => void;
  updateSubsection: (
    sectionSlug: string,
    subsectionSlug: string,
    updatedData: Partial<Subsection>
  ) => void;
  updatePlan: (plan: string) => void;
  setAgents: (agents: Agent) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  clearSettings: () => void;
  setUploadingFiles: (hasUploadingFiles: boolean) => void;
  setCustomBibliographyFilePks: (pks: string[]) => void;
  addCustomBibliographyFilePk: (pk: string) => void;
  removeCustomBibliographyFilePk: (pk: string) => void;
}

const useSettingsStore = create<SettingsState>((set) => ({
  user_inputs: {},
  custom_data: {},
  custom_subsections: {},
  sections: [],
  plan: '',
  agents: {},
  uploadingFiles: false,
  custom_bibliography_file_pks: [],
  setUserInputs: (inputs) => set({ user_inputs: inputs }),
  setCustomData: (customData) => set({ custom_data: customData }),
  setCustomSubsections: (customSubsections) =>
    set({ custom_subsections: customSubsections }),
  addCustomSubsection: (key, subsection) =>
    set((state) => ({
      custom_subsections: {
        ...state.custom_subsections,
        [key]: [...(state.custom_subsections[key] || []), subsection]
      }
    })),
  removeCustomSubsection: (key, subsectionSlug) =>
    set((state) => ({
      custom_subsections: {
        ...state.custom_subsections,
        [key]: (state.custom_subsections[key] || []).filter(
          (sub) => sub.slug !== subsectionSlug
        )
      }
    })),
  updateCustomSubsection: (key, subsectionSlug, updatedData) =>
    set((state) => ({
      custom_subsections: {
        ...state.custom_subsections,
        [key]: (state.custom_subsections[key] || []).map((sub) =>
          sub.slug === subsectionSlug ? { ...sub, ...updatedData } : sub
        )
      }
    })),
  setSections: (sections) => set({ sections }),
  addSection: (section) =>
    set((state) => ({ sections: [...state.sections, section] })),
  addSubsection: (sectionSlug, subsection) =>
    set((state) => ({
      sections: state.sections.map((section) =>
        section.slug === sectionSlug
          ? { ...section, sub_sections: [...section.sub_sections, subsection] }
          : section
      )
    })),
  removeSubsection: (sectionSlug, subsectionSlug) =>
    set((state) => ({
      sections: state.sections.map((section) =>
        section.slug === sectionSlug
          ? {
              ...section,
              sub_sections: section.sub_sections.filter(
                (sub) => sub.slug !== subsectionSlug
              )
            }
          : section
      )
    })),
  updateSubsection: (sectionSlug, subsectionSlug, updatedData) =>
    set((state) => ({
      sections: state.sections.map((section) =>
        section.slug === sectionSlug
          ? {
              ...section,
              sub_sections: section.sub_sections.map((sub) =>
                sub.slug === subsectionSlug ? { ...sub, ...updatedData } : sub
              )
            }
          : section
      )
    })),
  updatePlan: (plan) => set({ plan }),
  updateSettings: (settings) => set({ ...settings }),
  clearSettings: () =>
    set({
      user_inputs: {},
      custom_data: {},
      custom_subsections: {},
      sections: [],
      plan: '',
      agents: {},
      uploadingFiles: false,
      custom_bibliographies: [],
      custom_bibliography_file_pks: []
    }),
  setAgents: (agents) => set({ agents }),
  setUploadingFiles: (uploadingFiles) => set({ uploadingFiles }),
  setCustomBibliographyFilePks: (pks) =>
    set({ custom_bibliography_file_pks: pks }),
  addCustomBibliographyFilePk: (pk) =>
    set((state) => ({
      custom_bibliography_file_pks: [...state.custom_bibliography_file_pks, pk]
    })),
  removeCustomBibliographyFilePk: (pk) =>
    set((state) => ({
      custom_bibliography_file_pks: state.custom_bibliography_file_pks.filter(
        (existingPk) => existingPk !== pk
      )
    }))
}));

export default useSettingsStore;
