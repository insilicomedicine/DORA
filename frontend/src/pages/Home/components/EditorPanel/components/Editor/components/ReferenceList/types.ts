import { TabType } from 'utils/system';

export type ReferenceListActionType = 'FindReferences' | 'AddCitations';
export type ReferenceListResourceType = 'pubmed' | 'pmc' | 'websearch';

export interface TabItem {
  id: string;
  type: TabType;
  label: string;
  hidden?: boolean;
  isLoading?: boolean;
  showLoadingIcon?: boolean;
  showDoneIcon?: boolean;
  isAutoSearch?: boolean;
}

export interface TabState {
  tabValue: string;
  isEnabledTabContent: boolean;
  isPMCTabActive: boolean;
  isAutoSearch?: boolean;
  setTabValue: (value: string) => void;
}

// Default tab configuration
export const defaultTabItems: TabItem[] = [
  {
    id: 'pubmed',
    type: TabType.PUBMED,
    label: 'PubMed'
  },
  {
    id: 'pmc',
    type: TabType.PMC,
    label: 'Full-Text (PMC)',
    showLoadingIcon: true,
    showDoneIcon: true
  },
  {
    id: 'websearch',
    type: TabType.WEBSEARCH,
    label: 'Web',
    isAutoSearch: true
  }
];
