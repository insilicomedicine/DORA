import React from 'react';
import { Typography, Button, Stack } from '@mui/material';

interface NoDataProps {
  handleGenerateReview: () => void;
  generateReviewButtonIsDisabled: boolean;
}

const NoData = ({
  handleGenerateReview,
  generateReviewButtonIsDisabled
}: NoDataProps) => {
  return (
    <Stack
      textAlign="center"
      height="100%"
      justifyContent="center"
      alignItems="center"
      pr={1.5}
    >
      <Typography
        variant="body2"
        fontWeight={500}
        lineHeight="145%"
        letterSpacing="0.1px"
        color="text.main"
        fontStyle="normal"
      >
        This document hasn’t been reviewed yet
      </Typography>
      <Typography
        variant="body2"
        fontWeight={400}
        lineHeight="145%"
        letterSpacing="0.15px"
        color="text.secondary"
        fontStyle="normal"
        sx={{ mt: 1 }}
      >
        Apply AI Reviewer to evaluate Language, Structure, Argumentation, and
        Relevance.
      </Typography>
      <Button
        data-testid="generatingReviewInsightsButton"
        variant="outlined"
        disabled={generateReviewButtonIsDisabled}
        color="primary"
        size="small"
        onClick={handleGenerateReview}
        sx={{ mt: 4, textTransform: 'capitalize' }}
      >
        Generate Review
      </Button>
    </Stack>
  );
};

export default NoData;
