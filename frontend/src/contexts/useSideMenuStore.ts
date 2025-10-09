import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SideMenuState {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const useSideMenuStore = create<SideMenuState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleCollapse: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed }))
    }),
    {
      name: 'side-menu-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useSideMenuStore;
