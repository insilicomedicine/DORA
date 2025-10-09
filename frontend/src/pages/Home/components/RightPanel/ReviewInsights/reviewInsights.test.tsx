import React from 'react';
import { render, screen } from '@testing-library/react';
import ReviewInsights from './index';
import { reviewInsightsMockData } from './reviewInsightsMockData';

import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Use vi.hoisted to properly handle mock variables during hoisting
const {
  mockFetchReview,
  mockGenerateReview,
  mockReset,
  mockUseReviewInsightsStore,
  mockUseDocumentStore,
  mockUsePlanStatus
} = vi.hoisted(() => ({
  mockFetchReview: vi.fn(),
  mockGenerateReview: vi.fn(),
  mockReset: vi.fn(),
  mockUseReviewInsightsStore: vi.fn(),
  mockUseDocumentStore: vi.fn(),
  mockUsePlanStatus: vi.fn()
}));

vi.mock('contexts/useReviewInsightsStore', () => ({
  __esModule: true,
  default: mockUseReviewInsightsStore
}));

vi.mock('contexts/documentsStore', () => ({
  useDocumentStore: mockUseDocumentStore
}));

vi.mock('hooks/usePlanStatus', () => ({
  __esModule: true,
  default: mockUsePlanStatus
}));

vi.mock('./components/OverallScore', () => ({
  default: ({ score, maxScore }) => (
    <div>
      Overall Score: {score?.title || 'No Score'}, {score?.score || 0} /{' '}
      {maxScore}
    </div>
  )
}));

vi.mock('./components/ReviewCategory', () => ({
  default: ({ category, maxScore }) => (
    <div>
      Category: {category.title}, {category.score} / {maxScore}
    </div>
  )
}));

describe('ReviewInsights Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useDocumentStore
    mockUseDocumentStore.mockReturnValue({
      documentData: {
        id: '123',
        status: 'completed',
        stage: 'writing'
      },
      isDocumentLoading: false
    });

    // Default mock for usePlanStatus
    mockUsePlanStatus.mockReturnValue({
      isExpired: false
    });
  });

  it('renders NoData when mock data is empty', () => {
    // Mock Zustand store with empty data
    mockUseReviewInsightsStore.mockReturnValue({
      data: {},
      isLoading: false,
      status: '',
      fetchReview: mockFetchReview,
      generateReview: mockGenerateReview,
      reset: mockReset
    });

    render(<ReviewInsights />);

    // Assert that NoData component is displayed
    const startButton = screen.queryByTestId('generatingReviewInsightsButton');
    expect(startButton).toBeInTheDocument();
  });

  it('displays the loading state when `loading` is true', async () => {
    // Mock Zustand store with loading state
    mockUseReviewInsightsStore.mockReturnValue({
      data: {},
      isLoading: true,
      status: 'in_progress',
      fetchReview: mockFetchReview,
      generateReview: mockGenerateReview,
      reset: mockReset
    });

    render(<ReviewInsights />);

    // Should show loading component instead of NoData
    expect(
      screen.queryByTestId('generatingReviewInsightsButton')
    ).not.toBeInTheDocument();
  });

  it('renders review insights correctly when mock data exists', () => {
    // Mock Zustand store with actual data
    mockUseReviewInsightsStore.mockReturnValue({
      data: reviewInsightsMockData.predefined_review,
      isLoading: false,
      status: 'completed',
      fetchReview: mockFetchReview,
      generateReview: mockGenerateReview,
      reset: mockReset
    });

    render(<ReviewInsights />);

    // Assert that OverallScore and ReviewCategory components are rendered
    expect(
      screen.getByText('Overall Score: Overall Score, 8 / 10')
    ).toBeInTheDocument();
    expect(screen.getByText('Category: Language, 7 / 10')).toBeInTheDocument();
    expect(
      screen.getByText('Category: Readability, 7 / 10')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Category: Argumentation, 7 / 10')
    ).toBeInTheDocument();
    expect(screen.getByText('Category: Content, 8 / 10')).toBeInTheDocument();
  });

  it('calls fetchReview on mount', () => {
    mockUseReviewInsightsStore.mockReturnValue({
      data: {},
      isLoading: false,
      status: '',
      fetchReview: mockFetchReview,
      generateReview: mockGenerateReview,
      reset: mockReset
    });

    render(<ReviewInsights />);

    expect(mockFetchReview).toHaveBeenCalledWith('123');
  });

  it('calls generateReview when generate button is clicked', async () => {
    mockUseReviewInsightsStore.mockReturnValue({
      data: {},
      isLoading: false,
      status: '',
      fetchReview: mockFetchReview,
      generateReview: mockGenerateReview,
      reset: mockReset
    });

    render(<ReviewInsights />);

    const generateButton = screen.getByTestId('generatingReviewInsightsButton');
    await userEvent.click(generateButton);

    expect(mockGenerateReview).toHaveBeenCalledWith('123');
  });
});
