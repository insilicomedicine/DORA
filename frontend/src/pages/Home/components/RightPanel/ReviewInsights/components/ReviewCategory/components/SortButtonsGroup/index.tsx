import React, { memo } from 'react';
import { Box, styled } from '@mui/material';

import { seriousnessLevels } from 'utils/reviewInsights';
import SortButton from '../SortButton';
import { ReviewSuggestionSeriousnessLevels } from 'types/document';

const SortButtonsWrapper = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '8px 0 0 auto',
  '& > div:first-of-type': {
    marginLeft: 0
  }
}));

interface SortButtonsGroupProps {
  activeFilter: ReviewSuggestionSeriousnessLevels | null;
  handleFilterClick: (filter: ReviewSuggestionSeriousnessLevels) => void;
  seriousnessCounts: Record<ReviewSuggestionSeriousnessLevels, number> | {};
}

const SortButtonsGroup = ({
  activeFilter,
  handleFilterClick,
  seriousnessCounts
}: SortButtonsGroupProps) => {
  return (
    <SortButtonsWrapper>
      {seriousnessLevels().map(({ level, color, borderColor, activeColor }) => {
        return !!seriousnessCounts[level] ? (
          <SortButton
            key={level}
            level={level}
            color={color}
            borderColor={borderColor}
            activeColor={activeColor}
            count={seriousnessCounts[level]}
            activeFilter={activeFilter}
            handleFilterClick={handleFilterClick}
          />
        ) : null;
      })}
    </SortButtonsWrapper>
  );
};

export default memo(SortButtonsGroup);
