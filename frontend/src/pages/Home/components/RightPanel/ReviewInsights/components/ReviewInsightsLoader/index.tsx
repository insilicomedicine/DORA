import React from 'react';
import { CircularProgress, Stack, Typography } from '@mui/material';

const ReviewInsightsLoader = () => {
  return (
    <Stack
      justifyContent="center"
      alignItems="center"
      height="100%"
      pr={1.5}
      textAlign="center"
    >
      <Typography
        variant="body2"
        fontWeight={500}
        lineHeight="145%"
        letterSpacing="0.1px"
        color="text.main"
        fontStyle="normal"
      >
        The review is currently being generated...
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
        This process may take up to one minute. You can close this window
        without losing your progress.
      </Typography>
      <CircularProgress size={24} sx={{ mt: 5 }} />
    </Stack>
  );
};

export default ReviewInsightsLoader;
