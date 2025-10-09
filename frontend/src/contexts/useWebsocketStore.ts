import { create } from 'zustand';
import { FileUploadStatusType } from 'types/bibliography';

interface FileUpdateData {
  pk: string;
  status: FileUploadStatusType;
  [key: string]: any;
}

interface WebsocketState {
  uploadedFileUpdatesWS: FileUpdateData | null;

  // Actions
  setUploadedFileUpdatesWS: (data: FileUpdateData | null) => void;
  clearUploadedFileUpdatesWS: () => void;
}

export const useWebsocketStore = create<WebsocketState>((set) => ({
  uploadedFileUpdatesWS: null,

  setUploadedFileUpdatesWS: (data: FileUpdateData | null) => {
    set({ uploadedFileUpdatesWS: data });
  },

  clearUploadedFileUpdatesWS: () => {
    set({ uploadedFileUpdatesWS: null });
  }
}));

export default useWebsocketStore;
