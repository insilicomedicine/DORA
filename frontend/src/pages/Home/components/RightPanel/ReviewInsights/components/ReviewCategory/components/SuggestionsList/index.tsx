import React, { useState, memo } from 'react';
import { Typography } from '@mui/material';
import { ReviewCategorySuggestion } from 'types/document';
import { getBorderRightColorBySeriousness } from 'utils/reviewInsights';
import { Box } from '@mui/system';

interface SuggestionsListProps {
  filteredSuggestions: ReviewCategorySuggestion[];
  totalSuggestionsLength: number;
}

const SuggestionsList = ({
  filteredSuggestions,
  totalSuggestionsLength
}: SuggestionsListProps) => {
  const [showAllList, setShowAllList] = useState(false);

  const defaultVisibleSuggestionsCount = 2;
  const visibleSuggestionsCount = showAllList
    ? totalSuggestionsLength
    : defaultVisibleSuggestionsCount;

  const toggleShowAll = () => {
    setShowAllList(!showAllList);
  };

  return (
    <>
      {filteredSuggestions
        .slice(0, visibleSuggestionsCount)
        .map((suggestion, index) => (
          <Box
            key={index}
            data-testid={`suggestionsList-suggestionsWithId-${index}`}
            sx={{
              mb: 3,
              pr: 2,
              borderRight: `2px solid ${getBorderRightColorBySeriousness(suggestion.seriousness)}`
            }}
          >
            <Typography variant="body2">{suggestion.text}</Typography>
          </Box>
        ))}
      {filteredSuggestions.length > defaultVisibleSuggestionsCount && (
        <Typography
          onClick={toggleShowAll}
          variant="caption"
          fontWeight={700}
          data-testid="suggestionsList-showMoreButton"
          color="primary"
          sx={{
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {showAllList ? 'Show Less' : 'Show More'}
        </Typography>
      )}
    </>
  );
};

export default memo(SuggestionsList);
