import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadabilityCategoryMetrics from './index';

describe('ReadabilityCategoryMetrics', () => {
  const mockMetricsData = {
    flesch_kincaid_grade: 8.2
  };

  it('renders the component with the title and metric', () => {
    render(
      <ReadabilityCategoryMetrics
        metricsData={mockMetricsData}
        title="Readability Metrics"
      />
    );

    expect(screen.getByText('Readability Metrics')).toBeInTheDocument();

    expect(screen.getByText('Flesch Reading Ease:')).toBeInTheDocument();
    expect(screen.getByText('8.2')).toBeInTheDocument();
  });

  it('displays the tooltip on hover', async () => {
    render(
      <ReadabilityCategoryMetrics
        metricsData={mockMetricsData}
        title="Readability Metrics"
      />
    );

    const infoIcon = screen.getByTestId('InfoOutlinedIcon');
    userEvent.hover(infoIcon);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(
      'The Flesch-Kincaid Grade Level indicates the education level needed to understand the text, based on sentence and word complexity. A score of 8 ensures general readability, while 12+ is suited for academic or professional audiences.'
    );

    userEvent.unhover(infoIcon);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
