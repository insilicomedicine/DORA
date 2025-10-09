import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SuggestionsList from './index';
import {
  ReviewCategorySuggestion,
  ReviewSuggestionSeriousnessLevels
} from 'types/document';
import { getBorderRightColorBySeriousness } from 'utils/reviewInsights';

describe('SuggestionsList', () => {
  const suggestions: ReviewCategorySuggestion[] = [
    {
      seriousness: ReviewSuggestionSeriousnessLevels.high,
      text: 'Simplify complex sentences.'
    },
    {
      seriousness: ReviewSuggestionSeriousnessLevels.medium,
      text: 'Avoid passive voice.'
    },
    {
      seriousness: ReviewSuggestionSeriousnessLevels.high,
      text: 'Remove redundant sections.'
    },
    {
      seriousness: ReviewSuggestionSeriousnessLevels.low,
      text: 'Use shorter paragraphs.'
    }
  ];

  const renderComponent = (
    filteredSuggestions = suggestions,
    totalSuggestionsLength = suggestions.length
  ) => {
    render(
      <SuggestionsList
        filteredSuggestions={filteredSuggestions}
        totalSuggestionsLength={totalSuggestionsLength}
      />
    );
  };

  test('renders the correct number of default suggestions', () => {
    renderComponent();

    // Only 2 suggestions should be visible initially
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-0')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-1')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('suggestionsList-suggestionsWithId-2')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('suggestionsList-suggestionsWithId-3')
    ).not.toBeInTheDocument();
  });

  test('shows all suggestions when "Show More" is clicked', () => {
    renderComponent();

    // Click the "Show More" button
    const showMoreButton = screen.getByTestId('suggestionsList-showMoreButton');
    fireEvent.click(showMoreButton);

    // Verify all suggestions are visible
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-0')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-3')
    ).toBeInTheDocument();
  });

  test('hides suggestions when "Show Less" is clicked', () => {
    renderComponent();

    // Click the "Show More" button
    const showMoreButton = screen.getByTestId('suggestionsList-showMoreButton');
    fireEvent.click(showMoreButton);

    // Click the "Show Less" button
    fireEvent.click(showMoreButton);

    // Verify only 2 suggestions are visible again
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-0')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestionsList-suggestionsWithId-1')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('suggestionsList-suggestionsWithId-2')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('suggestionsList-suggestionsWithId-3')
    ).not.toBeInTheDocument();
  });

  test('does not render "Show More" button if suggestions are less than or equal to the default visible count', () => {
    const fewerSuggestions = [
      {
        seriousness: ReviewSuggestionSeriousnessLevels.high,
        text: 'Simplify complex sentences.'
      },
      {
        seriousness: ReviewSuggestionSeriousnessLevels.medium,
        text: 'Avoid passive voice.'
      }
    ];
    renderComponent(fewerSuggestions, fewerSuggestions.length);

    // Verify "Show More" button is not rendered
    expect(
      screen.queryByTestId('suggestionsList-showMoreButton')
    ).not.toBeInTheDocument();
  });

  test('applies the correct border color based on seriousness', () => {
    renderComponent();

    // Verify the border colors are set correctly
    const firstSuggestion = screen.getByTestId(
      'suggestionsList-suggestionsWithId-0'
    );
    const secondSuggestion = screen.getByTestId(
      'suggestionsList-suggestionsWithId-1'
    );

    expect(firstSuggestion).toHaveStyle(
      `border-right: 2px solid ${getBorderRightColorBySeriousness(
        suggestions[0].seriousness
      )}`
    );
    expect(secondSuggestion).toHaveStyle(
      `border-right: 2px solid ${getBorderRightColorBySeriousness(
        suggestions[1].seriousness
      )}`
    );
  });
});
