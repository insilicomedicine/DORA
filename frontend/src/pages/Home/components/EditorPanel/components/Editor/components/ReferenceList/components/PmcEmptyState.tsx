import React, { memo } from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';

interface PmcEmptyStateProps {
  onSearch: () => void;
  isSearching?: boolean;
  isDisabled: boolean;
}

const PmcEmptyState = ({
  onSearch,
  isSearching,
  isDisabled
}: PmcEmptyStateProps) => {
  return (
    <Stack
      minHeight={342}
      justifyContent="center"
      alignItems="center"
      width="100%"
    >
      {isSearching ? (
        <Typography variant="body2">Searching full-text articles...</Typography>
      ) : (
        <>
          <Typography variant="body2" mt={0.5}>
            No articles yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click below to start a full-text search in PubMed
          </Typography>
        </>
      )}
      <Button
        size="small"
        variant="outlined"
        color="primary"
        onClick={onSearch}
        disabled={isDisabled || isSearching}
        sx={{
          minWidth: 153,
          mt: 3,
          textTransform: 'none'
        }}
        data-ga-tracking
        data-ga-event-type="Search PMC"
        data-ga-event-location="modal"
      >
        {isSearching ? (
          <CircularProgress size={16} />
        ) : (
          'Search Full-Text Articles'
        )}
      </Button>
    </Stack>
  );
};

export default memo(PmcEmptyState);
