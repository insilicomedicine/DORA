import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RightPanelState {
  isRightPanelCollapsed: boolean;
  toggleCollapseRightPanel: (arg0: boolean) => void;
}

const useRightPanelStore = create<RightPanelState>()(
  persist(
    (set) => ({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: (collapsed) =>
        set({ isRightPanelCollapsed: collapsed })
    }),
    {
      name: 'right-panel-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useRightPanelStore;
