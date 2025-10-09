/* eslint-disable no-magic-numbers */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LanguageCategoryMetrics from './index';
import { LanguageMetrics } from 'types/document';
import userEvent from '@testing-library/user-event';

vi.mock('../MetricItem', () => ({
  __esModule: true,
  default: ({
    label,
    value,
    unit
  }: {
    label: string;
    value: number | string;
    unit?: string;
  }) => (
    <div data-testid="metric-item">
      {label}: {value} {unit && unit}
    </div>
  )
}));

describe('LanguageCategoryMetrics', () => {
  const mockMetricsData: LanguageMetrics = {
    total_word_count: 1200,
    total_character_count: 6500,
    reading_time_minutes: 5.6,
    section_word_character_counts: {
      Introduction: [1200, 6500],
      Conclusion: [500, 2500]
    }
  };

  const mockSingleSectionMetricsData = {
    ...mockMetricsData,
    section_word_character_counts: {
      Introduction: [1200, 6500]
    }
  };

  it('renders the component with valid metrics', () => {
    render(
      <LanguageCategoryMetrics
        metricsData={mockMetricsData}
        title="Language Metrics"
      />
    );

    expect(screen.getByText(/Language Metrics/i)).toBeInTheDocument();

    expect(screen.getByText(/Total word count:/i)).toBeInTheDocument();
    expect(screen.getByText(/1200/i)).toBeInTheDocument();

    expect(screen.getByText(/Total character count:/i)).toBeInTheDocument();
    expect(screen.getByText(/6500/i)).toBeInTheDocument();

    expect(screen.getByText(/Reading time:/i)).toBeInTheDocument();
    expect(screen.getByText(/6 minutes/i)).toBeInTheDocument();
  });

  it('displays the info icon when there are multiple sections', () => {
    render(
      <LanguageCategoryMetrics
        metricsData={mockMetricsData}
        title="Language Metrics"
      />
    );
    expect(screen.getByTestId('InfoOutlinedIcon')).toBeInTheDocument();
  });

  it('does not display the info icon when there is only one section', () => {
    render(
      <LanguageCategoryMetrics
        metricsData={mockSingleSectionMetricsData}
        title="Language Metrics"
      />
    );
    expect(screen.queryByTestId('InfoOutlinedIcon')).not.toBeInTheDocument();
  });

  it('displays the tooltip on hover', async () => {
    render(
      <LanguageCategoryMetrics
        metricsData={mockMetricsData}
        title="Language Metrics"
      />
    );

    // Hover over the Info icon to trigger the tooltip
    const infoIcon = screen.getByTestId('InfoOutlinedIcon');
    userEvent.hover(infoIcon);

    // Wait for the tooltip to appear
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(
      'Introduction: 6500 words, 1200 characters. Conclusion: 2500 words, 500 characters.'
    );
    userEvent.unhover(infoIcon);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
