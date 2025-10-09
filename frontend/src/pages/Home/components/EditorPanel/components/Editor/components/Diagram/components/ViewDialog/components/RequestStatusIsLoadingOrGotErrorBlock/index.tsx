import React from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

interface RequestStatusIsLoadingOrGotErrorBlockProps {
  loading: boolean;
  error: boolean;
  onCloseErrorAlert: () => void;
}

const RequestStatusIsLoadingOrGotErrorBlock = ({
  loading,
  error,
  onCloseErrorAlert
}: RequestStatusIsLoadingOrGotErrorBlockProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 65,
        display: 'none',
        alignItems: 'center',
        ...((loading || error) && {
          display: 'flex'
        })
      }}
    >
      {loading ? (
        <>
          <CircularProgress size={16} style={{ marginRight: 8 }} />
          <Typography variant="caption" color="#666666">
            Applying...
          </Typography>
        </>
      ) : error ? (
        <Alert
          severity="error"
          style={{ width: 484 }}
          onClose={onCloseErrorAlert}
        >
          Sorry, the diagram could not be generated. Try again later.
        </Alert>
      ) : null}
    </Box>
  );
};

export default RequestStatusIsLoadingOrGotErrorBlock;
