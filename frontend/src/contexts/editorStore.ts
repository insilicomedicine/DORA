import { Bibliography, ReferenceSourceType } from 'types/document';
import { create } from 'zustand';

interface ReferenceLinkTarget {
  id?: string;
  pmid?: string;
  chunkid?: string;
}

interface RightPanel {
  activedComponentId: string;
}

type TextEvidences = Partial<Record<ReferenceSourceType, Bibliography[]>>;
interface EditorState {
  referenceLinkTarget: ReferenceLinkTarget;
  rightPanel: RightPanel;
  textEvidences: TextEvidences | null;
  newBibliographyList: Bibliography[] | null;
  reloadBibliography: boolean | undefined;
  isFormatting: boolean;
  activePopper: string | null;
  setReferenceLinkTarget: (target: ReferenceLinkTarget) => void;
  setRightPanel: (panel: RightPanel) => void;
  setTextEvidences: (evidences: TextEvidences) => void;
  setNewBibliographyList: (list: Bibliography[] | null) => void;
  clearTextEvidences: () => void;
  setReloadBibliography: (status: boolean | undefined) => void;
  setIsFormatting: (status: boolean) => void;
  setActivePopper: (popperId: string | null) => void;
  resetStore: () => void;
}

const initialState = {
  referenceLinkTarget: {
    pmid: undefined,
    chunkid: undefined
  },
  rightPanel: {
    activedComponentId: 'bibliography'
  },
  textEvidences: { pubmed: [], pmc: [] },
  newBibliographyList: null,
  reloadBibliography: undefined,
  isFormatting: false,
  activePopper: null
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setReferenceLinkTarget: (target: ReferenceLinkTarget) =>
    set((prevState) => ({
      referenceLinkTarget: {
        ...prevState.referenceLinkTarget,
        ...target
      }
    })),
  setRightPanel: (panel: RightPanel) => set({ rightPanel: panel }),
  setTextEvidences: (evidences: TextEvidences) =>
    set({ textEvidences: evidences }),
  setNewBibliographyList: (list: Bibliography[] | null) =>
    set({ newBibliographyList: list }),
  clearTextEvidences: () => set({ textEvidences: null }),
  setReloadBibliography: (status) =>
    set(() => ({ reloadBibliography: status })),
  setIsFormatting: (status: boolean) => set(() => ({ isFormatting: status })),
  setActivePopper: (popperId: string | null) =>
    set(() => ({ activePopper: popperId })),
  resetStore: () => set(initialState)
}));
