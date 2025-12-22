import { create } from 'zustand';
import { FileUploadStatusType } from 'types/bibliography';

interface FileUpdateData {
  pk: string;
  status: FileUploadStatusType;
  reload?: boolean;
  [key: string]: any;
}

type FileUpdateDataWithReload = FileUpdateData | null;

interface WebsocketState {
  uploadedFileUpdatesWS: FileUpdateDataWithReload;

  // Actions
  setUploadedFileUpdatesWS: (data: FileUpdateDataWithReload) => void;
  clearUploadedFileUpdatesWS: () => void;
}

export const useWebsocketStore = create<WebsocketState>((set) => ({
  uploadedFileUpdatesWS: null,

  setUploadedFileUpdatesWS: (data: FileUpdateDataWithReload) => {
    set({ uploadedFileUpdatesWS: data });
  },

  clearUploadedFileUpdatesWS: () => {
    set({ uploadedFileUpdatesWS: null });
  }
}));

export default useWebsocketStore;
