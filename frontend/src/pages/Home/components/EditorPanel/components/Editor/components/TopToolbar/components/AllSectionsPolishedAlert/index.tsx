import React, { memo } from 'react';
import { Alert, Box } from '@mui/material';
import { CheckCircleOutlineRounded } from '@mui/icons-material';

const AllSectionsPolishedAlert = () => {
  return (
    <Box width="100%">
      <Alert
        severity="success"
        icon={<CheckCircleOutlineRounded />}
        sx={{ m: 1 }}
      >
        All sections are consistent now!
      </Alert>
    </Box>
  );
};

export default memo(AllSectionsPolishedAlert);
