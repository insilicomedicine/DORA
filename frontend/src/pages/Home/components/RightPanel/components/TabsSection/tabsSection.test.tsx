import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import TabsSection from '../TabsSection';
import { RightPanelComponentIds } from 'types/document';
import useRightPanelStore from 'contexts/useRightPanelStore';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';
import usePlanStatus from 'hooks/usePlanStatus';
import { useDocumentStore } from 'contexts/documentsStore';

vi.mock('contexts/useRightPanelStore', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('contexts/useReviewInsightsStore', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('hooks/usePlanStatus', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('contexts/documentsStore', () => ({
  useDocumentStore: vi.fn()
}));

// Mock the child components to avoid additional dependencies
vi.mock('../../Bibliography', () => ({
  default: () => (
    <div data-testid="bibliography-content">Bibliography Content</div>
  )
}));

vi.mock('../../ReviewInsights', () => ({
  default: () => (
    <div data-testid="review-insights-content">Review Insights Content</div>
  )
}));

describe('TabsSection Component', () => {
  const mockUseRightPanelStore = useRightPanelStore as unknown as Mock;
  const mockUseReviewInsightsStore = useReviewInsightsStore as unknown as Mock;
  const mockUsePlanStatus = usePlanStatus as unknown as Mock;
  const mockUseDocumentStore = useDocumentStore as unknown as Mock;

  beforeEach(() => {
    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: vi.fn()
    });

    mockUseReviewInsightsStore.mockReturnValue({
      data: {},
      isLoading: false,
      status: 'completed',
      fetchReview: vi.fn(),
      generateReview: vi.fn(),
      reset: vi.fn()
    });

    mockUsePlanStatus.mockReturnValue({
      isExpired: false,
      isFree: true,
      isAdvanced: false,
      isLimited: false
    });

    mockUseDocumentStore.mockReturnValue({
      documentData: { status: 'completed' },
      isDocumentLoading: false
    });
  });

  it('renders tabs correctly', () => {
    render(
      <TabsSection
        activedComponentId={RightPanelComponentIds.bibliography}
        handleChange={vi.fn()}
      />
    );

    // Use more specific selectors for tabs
    expect(
      screen.getByRole('tab', { name: 'Bibliography' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Review Insights' })
    ).toBeInTheDocument();
  });

  it('renders correct content based on active tab', () => {
    const { rerender } = render(
      <TabsSection
        activedComponentId={RightPanelComponentIds.bibliography}
        handleChange={vi.fn()}
      />
    );

    expect(screen.getByTestId(RightPanelComponentIds.bibliography)).toHaveStyle(
      'display: block'
    );

    rerender(
      <TabsSection
        activedComponentId={RightPanelComponentIds.reviewInsights}
        handleChange={vi.fn()}
      />
    );

    expect(
      screen.getByTestId(RightPanelComponentIds.reviewInsights)
    ).toHaveStyle('display: block');

    rerender(
      <TabsSection
        activedComponentId={RightPanelComponentIds.textEvidence}
        handleChange={vi.fn()}
      />
    );
    expect(
      screen.queryByTestId(RightPanelComponentIds.bibliography)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(RightPanelComponentIds.reviewInsights)
    ).toBeInTheDocument();
  });

  it('calls handleChange when a tab is clicked', () => {
    const handleChangeMock = vi.fn();
    render(
      <TabsSection
        activedComponentId={RightPanelComponentIds.bibliography}
        handleChange={handleChangeMock}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Review Insights' }));
    expect(handleChangeMock).toHaveBeenCalled();
  });

  it('calls toggleCollapseRightPanel when collapse button is clicked', async () => {
    const toggleCollapseMock = vi.fn();

    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: toggleCollapseMock
    });

    render(
      <TabsSection
        activedComponentId={RightPanelComponentIds.bibliography}
        handleChange={vi.fn()}
      />
    );

    const collapseButton = screen.getByTestId('sidebarCollapse-button');
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(toggleCollapseMock).toHaveBeenCalledTimes(1);
    });
  });
});
