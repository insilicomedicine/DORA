import React, { memo } from 'react';
import { Typography, Box } from '@mui/material';
import { ReviewSuggestionSeriousnessLevels } from 'types/document';

interface SortButtonProps {
  level: ReviewSuggestionSeriousnessLevels;
  color: string;
  borderColor: string;
  activeColor: string;
  count: number;
  activeFilter: ReviewSuggestionSeriousnessLevels | null;
  handleFilterClick: (filter: ReviewSuggestionSeriousnessLevels) => void;
}

const SortButton = ({
  level,
  color,
  borderColor,
  activeColor,
  count,
  activeFilter,
  handleFilterClick
}: SortButtonProps) => {
  return (
    <Box
      data-testid="sortButton-wrapper"
      sx={{
        display: 'flex',
        alignItems: 'center',
        marginLeft: 2,
        paddingLeft: 1,
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: activeFilter === level ? activeColor : undefined,
        border: `1px solid ${borderColor}`,
        color: color
      }}
      onClick={() => handleFilterClick(level)}
    >
      <Typography
        data-testid="sortButton-level"
        fontSize={10}
        fontWeight={600}
        color={color}
        sx={{ margin: '0 6px 0 2px' }}
        lineHeight={'156%'}
      >
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1px 6px',
          borderRadius: 4,
          backgroundColor: borderColor
        }}
      >
        <Typography
          data-testid="sortButton-count"
          fontSize={12}
          fontWeight={700}
          color={color}
          lineHeight={'137%'}
        >
          {count}
        </Typography>
      </Box>
    </Box>
  );
};

export default memo(SortButton);
