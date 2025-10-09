import { create } from 'zustand';
import { UserInfo } from 'types/user';

interface UserState {
  userInfo: UserInfo;
  showSubscriptionDialog: boolean;

  // Actions
  setUserInfo: (userInfo: UserInfo) => void;
  updateUserInfo: (updates: Partial<UserInfo>) => void;
  clearUserInfo: () => void;
  setShowSubscriptionDialog: (show: boolean) => void;
}

const initialUserInfo: UserInfo = {
  email: '',
  is_internal: false,
  customerPortal: '',
  terms_and_privacy_accepted: false,
  in_progress_documents: 0,
  total_documents: 0,
  plan: undefined
};

export const useUserStore = create<UserState>((set, _get) => ({
  userInfo: initialUserInfo,
  showSubscriptionDialog: false,

  setUserInfo: (userInfo: UserInfo) => {
    set({ userInfo });
  },

  updateUserInfo: (updates: Partial<UserInfo>) => {
    set((state) => ({
      userInfo: { ...state.userInfo, ...updates }
    }));
  },

  clearUserInfo: () => {
    set({ userInfo: initialUserInfo });
  },

  setShowSubscriptionDialog: (show: boolean) => {
    set({ showSubscriptionDialog: show });
  }
}));

export default useUserStore;
