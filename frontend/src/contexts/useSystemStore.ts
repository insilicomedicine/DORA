import { create } from 'zustand';
import { SystemInfo } from 'utils/system';
import { getSystemInfo } from 'services/system';

interface SystemState {
  systemInfo: SystemInfo;
  isLoading: boolean;

  // Actions
  setSystemInfo: (systemInfo: SystemInfo) => void;
  clearSystemInfo: () => void;
  fetchSystemInfo: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

const initialSystemInfo: SystemInfo = {
  search_sources: []
};

export const useSystemStore = create<SystemState>((set, get) => ({
  systemInfo: initialSystemInfo,
  isLoading: false,

  setSystemInfo: (systemInfo: SystemInfo) => {
    set({ systemInfo });
  },

  clearSystemInfo: () => {
    set({ systemInfo: initialSystemInfo });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  fetchSystemInfo: async () => {
    const { setLoading, setSystemInfo } = get();
    setLoading(true);
    const systemInfo = await getSystemInfo();
    if (systemInfo && Object.keys(systemInfo).length > 0) {
      setSystemInfo(systemInfo);
    }
    setLoading(false);
  }
}));

export default useSystemStore;
