import { create } from 'zustand';
import {
  DocumentData,
  Bibliography,
  DocumentStage,
  DocumentStatus,
  LogsData
} from '../types/document';

interface DocumentState {
  documentData: DocumentData | null;
  newDocument: Partial<DocumentData | null>;
  isNewDocument: boolean;
  isNewDocumentGenerating: boolean;
  deletedSectionsIds: string[];
  deletedSectionId: string;
  isBibliographyChanged: boolean;
  completedDocument: Partial<DocumentData> | null;
  updatedDocument: Partial<DocumentData | null> | null;
  logsData: LogsData;
  isLogsLoading: boolean;
  isDocumentLoading: boolean;
  bibliographyList: Bibliography[];
  sectionStatusUpdated: boolean;
  allSectionsPolished: boolean;
  setNewDocument: (document: Partial<DocumentData | null>) => void;
  setIsNewDocument: (isNew: boolean) => void;
  setIsNewDocumentGenerating: (isGenerating: boolean) => void;
  setCompletedDocument: (document: Partial<DocumentData>) => void;
  clearCompletedDocument: () => void;
  updateDocumentStage: (stage: DocumentStage) => void;
  updateDocumentStatus: (status: DocumentStatus) => void;
  setUpdatedDocument: (updatedDocument: Partial<DocumentData>) => void;
  clearUpdatedDocument: () => void;
  setDeletedSectionId: (sectionId: string) => void;
  clearDeletedSectionId: () => void;
  setDeletedSectionsIds: (sectionIds: string[]) => void;
  clearDeletedSectionsIds: () => void;
  setIsBibliographyChanged: (isChanged: boolean) => void;
  setLogsData: (logsData: LogsData) => void;
  clearLogsData: () => void;
  setIsLogsLoading: (isLoading: boolean) => void;
  setDocumentData: (documentData: DocumentData | null) => void;
  setBibliographyList: (list: Bibliography[]) => void;
  setSectionStatusUpdated: (updated: boolean) => void;
  setAllSectionsPolished: (polished: boolean) => void;
  setDocumentDetailData: (
    data: Partial<{
      documentData: DocumentData | null;
      isDocumentLoading: boolean;
      bibliographyList: Bibliography[];
      sectionStatusUpdated: boolean;
      allSectionsPolished: boolean;
    }>
  ) => void;
}

// Deleted document state
interface DeletedDocumentState {
  deletedDocumentId: string;
  setDeletedDocumentId: (id: string) => void;
  clearDeletedDocumentId: () => void;
}

// ScrollingDocumentPageContent state
interface ScrollingDocumentPageContentState {
  activeSectionId: string;
  isScrollingDocumentPageContent: boolean;
  setActiveSectionId: (id: string) => void;
  setIsScrollingDocumentPageContent: (isScrolling: boolean) => void;
}

// Create Document state store
const useDocumentStore = create<DocumentState>((set) => ({
  documentData: null,
  isNewDocument: false,
  isNewDocumentGenerating: false,
  newDocument: null,
  completedDocument: null,
  updatedDocument: null,
  deletedSectionsIds: [],
  deletedSectionId: '',
  isBibliographyChanged: false,
  logsData: {},
  isLogsLoading: false,
  isDocumentLoading: true,
  bibliographyList: [],
  sectionStatusUpdated: false,
  allSectionsPolished: false,

  setIsNewDocument: (isNew: boolean) => set(() => ({ isNewDocument: isNew })),
  setIsNewDocumentGenerating: (isGenerating: boolean) =>
    set(() => ({ isNewDocumentGenerating: isGenerating })),
  setNewDocument: (document: Partial<DocumentData | null>) =>
    set(() => ({ newDocument: document })),
  setCompletedDocument: (document: Partial<DocumentData>) =>
    set(() => ({ completedDocument: document })),
  clearCompletedDocument: () => set(() => ({ completedDocument: null })),
  updateDocumentStage: (stage: DocumentStage) =>
    set((state) => ({
      completedDocument: state.completedDocument
        ? { ...state.completedDocument, stage }
        : null
    })),
  updateDocumentStatus: (status: DocumentStatus) =>
    set((state) => ({
      completedDocument: state.completedDocument
        ? { ...state.completedDocument, status }
        : null
    })),
  setUpdatedDocument: (updatedDocument) => set({ updatedDocument }),
  clearUpdatedDocument: () => set({ updatedDocument: null }),
  setDeletedSectionId: (sectionId) => set({ deletedSectionId: sectionId }),
  clearDeletedSectionId: () => set({ deletedSectionId: '' }),
  setDeletedSectionsIds: (sectionIds) =>
    set({ deletedSectionsIds: sectionIds }),
  clearDeletedSectionsIds: () => set({ deletedSectionsIds: [] }),
  setIsBibliographyChanged: (isChanged) =>
    set({ isBibliographyChanged: isChanged }),
  setLogsData: (logsData: LogsData) => set({ logsData }),
  clearLogsData: () => set({ logsData: {} }),
  setIsLogsLoading: (isLoading: boolean) => set({ isLogsLoading: isLoading }),
  setDocumentData: (documentData: DocumentData | null) => set({ documentData }),
  setBibliographyList: (bibliographyList: Bibliography[]) =>
    set({ bibliographyList }),
  setSectionStatusUpdated: (sectionStatusUpdated: boolean) =>
    set({ sectionStatusUpdated }),
  setAllSectionsPolished: (allSectionsPolished: boolean) =>
    set({ allSectionsPolished }),
  setDocumentDetailData: (data) =>
    set((state) => ({
      ...state,
      ...data,
      documentData:
        data.documentData !== undefined
          ? data.documentData
          : state.documentData,
      isDocumentLoading:
        data.isDocumentLoading !== undefined
          ? data.isDocumentLoading
          : state.isDocumentLoading,
      bibliographyList:
        data.bibliographyList !== undefined
          ? data.bibliographyList
          : state.bibliographyList,
      sectionStatusUpdated:
        data.sectionStatusUpdated !== undefined
          ? data.sectionStatusUpdated
          : state.sectionStatusUpdated,
      allSectionsPolished:
        data.allSectionsPolished !== undefined
          ? data.allSectionsPolished
          : state.allSectionsPolished
    }))
}));

// DeletedDocument state store
const useDeletedDocumentStore = create<DeletedDocumentState>((set) => ({
  deletedDocumentId: '',
  setDeletedDocumentId: (id: string) => set(() => ({ deletedDocumentId: id })),
  clearDeletedDocumentId: () => set(() => ({ deletedDocumentId: '' }))
}));

// ScrollingDocumentPageContent state store
const useScrollingDocumentPageContentStore =
  create<ScrollingDocumentPageContentState>((set) => ({
    activeSectionId: '',
    isScrollingDocumentPageContent: false,
    setActiveSectionId: (id: string) => set(() => ({ activeSectionId: id })),
    setIsScrollingDocumentPageContent: (isScrolling: boolean) =>
      set(() => ({ isScrollingDocumentPageContent: isScrolling }))
  }));

export {
  useDocumentStore,
  useDeletedDocumentStore,
  useScrollingDocumentPageContentStore
};
