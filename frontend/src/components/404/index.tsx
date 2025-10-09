import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const NotFound = () => {
  const handleBackToHomeClick = () => {
    window.location.href = '/templates';
  };

  return (
    <Box
      sx={{
        paddingTop: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 500,
        minHeight: '100%'
      }}
    >
      <Typography variant="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" align="center" paragraph>
        Oops! The document you are looking for does not exist. It might have
        been moved or deleted.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleBackToHomeClick}
        sx={{ mt: 3 }}
      >
        Back to Home
      </Button>
    </Box>
  );
};

export default NotFound;
