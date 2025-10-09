import { create } from 'zustand';
import { generateDocumentReview, getDocumentReview } from 'services/documents';
import { type ReviewCategoryItem } from 'types/document';

interface ReviewInsightsData {
  overall_impression?: {
    title: string;
    score: number;
    score_explanation: string;
  };
  categories?: ReviewCategoryItem[];
}

interface ReviewInsightsState {
  data: ReviewInsightsData;
  isLoading: boolean;
  status: string;

  // Actions
  setLoading: (isLoading: boolean) => void;
  setStatus: (status: string) => void;
  setData: (data: ReviewInsightsData) => void;
  reset: () => void;
  fetchReview: (paperId: string) => Promise<void>;
  generateReview: (paperId: string) => Promise<boolean>;
  updateFromWebSocket: (data: any, status: any) => void;
}

const initialState = {
  data: {},
  isLoading: false,
  status: ''
};

export const useReviewInsightsStore = create<ReviewInsightsState>(
  (set, _get) => ({
    ...initialState,

    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    setStatus: (status: string) => {
      set({ status });
    },

    setData: (data: ReviewInsightsData) => {
      set({ data });
    },

    reset: () => {
      set(initialState);
    },

    fetchReview: async (id: string) => {
      if (!id) return;
      set({ isLoading: true });

      const response = (await getDocumentReview(id)) as {
        data: any;
        status: any;
      };

      if (!response) {
        set({ isLoading: false });
        return;
      }

      set({
        data: response?.data || {},
        status: response?.status || '',
        isLoading: false
      });
    },

    generateReview: async (id: string) => {
      if (!id) return false;

      set({
        isLoading: true,
        status: 'in_progress'
      });

      const response = await generateDocumentReview(id);

      if (!response) {
        set({ isLoading: false });
        return false;
      }

      return true;
    },

    updateFromWebSocket: (data: any, status: any) => {
      set({
        data: data?.predefined_review || {},
        status: status || '',
        isLoading: false
      });
    }
  })
);

export default useReviewInsightsStore;
