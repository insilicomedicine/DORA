import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewCategory from './index';
import { type ReviewCategoryItem } from 'types/document';
import { theme } from 'theme';
import { ThemeProvider } from '@mui/material/styles';

describe('ReviewCategory', () => {
  const defaultCategory: ReviewCategoryItem = {
    id: '1',
    title: 'Clarity',
    score: 8,
    score_explanation: 'The document is clear and concise.',
    suggestions: [
      { seriousness: 'high', text: 'High text 1' },
      { seriousness: 'medium', text: 'Medium text' },
      { seriousness: 'high', text: 'High text 2' },
      { seriousness: 'low', text: 'Low text' }
    ],
    code_based_metrics: null
  };

  const maxScore = 10;

  const renderComponent = (category = defaultCategory) =>
    render(
      <ThemeProvider theme={theme}>
        <ReviewCategory category={category} maxScore={maxScore} />
      </ThemeProvider>
    );

  test('renders the title, score, and score explanation', () => {
    renderComponent();

    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(
      screen.getByText('The document is clear and concise.')
    ).toBeInTheDocument();
  });

  test('displays and filters suggestions correctly (interact with Show More button)', () => {
    renderComponent();

    // Verify only two suggestions are visible initially
    expect(screen.getByText('High text 1')).toBeInTheDocument();
    expect(screen.getByText('Medium text')).toBeInTheDocument();
    expect(screen.queryByText('High text 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Low text')).not.toBeInTheDocument();

    // Click "Show More" to reveal all suggestions
    const showMoreButton = screen.getByTestId('suggestionsList-showMoreButton');
    fireEvent.click(showMoreButton);

    // Verify all suggestions are visible
    expect(screen.getByText('High text 1')).toBeInTheDocument();
    expect(screen.getByText('Medium text')).toBeInTheDocument();
    expect(screen.getByText('High text 2')).toBeInTheDocument();
    expect(screen.getByText('Low text')).toBeInTheDocument();

    // Click "Show Less" to hide suggestions again
    fireEvent.click(showMoreButton);
    expect(screen.getByText('High text 1')).toBeInTheDocument();
    expect(screen.getByText('Medium text')).toBeInTheDocument();
    expect(screen.queryByText('High text 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Low text')).not.toBeInTheDocument();
  });

  test('filters suggestions when filter buttons are clicked', () => {
    renderComponent();

    // Click the High seriousness filter button
    const highFilterButton = screen.getByText('High');
    fireEvent.click(highFilterButton);

    // Verify filtered suggestions
    expect(screen.getByText('High text 1')).toBeInTheDocument();
    expect(screen.getByText('High text 2')).toBeInTheDocument();
    expect(screen.queryByText('Medium text')).not.toBeInTheDocument();
    expect(screen.queryByText('Low text')).not.toBeInTheDocument();

    // Click the Medium seriousness filter button
    const mediumFilterButton = screen.getByText('Medium');
    fireEvent.click(mediumFilterButton);

    // Verify filtered suggestions
    expect(screen.getByText('Medium text')).toBeInTheDocument();
    expect(screen.queryByText('High text 1')).not.toBeInTheDocument();
    expect(screen.queryByText('High text 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Low text')).not.toBeInTheDocument();

    // Clear the filter by clicking the active filter button again
    fireEvent.click(mediumFilterButton);

    // Verify all suggestions are back to initial state (only 2 visible)
    expect(screen.getByText('High text 1')).toBeInTheDocument();
    expect(screen.getByText('Medium text')).toBeInTheDocument();
    expect(screen.queryByText('High text 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Low text')).not.toBeInTheDocument();
  });
});
