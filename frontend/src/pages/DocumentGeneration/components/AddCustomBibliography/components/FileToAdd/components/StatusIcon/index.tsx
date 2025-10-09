import React, { memo } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { DoneRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { FileUploadStatuses } from 'types/file';

const StatusIcon = ({ status }) => {
  switch (status) {
    case FileUploadStatuses.loading:
      return <CircularProgress size={18} />;
    case FileUploadStatuses.processed:
      return <DoneRounded fontSize="small" color="primary" />;
    case FileUploadStatuses.failed:
      return (
        <Box
          sx={{
            color: '#AB2F26',
            minWidth: 60,
            display: 'flex',
            alignItems: 'center'
          }}
          gap={1}
        >
          <Typography variant="caption">Failed</Typography>
          <ErrorOutlineRounded fontSize="small" />
        </Box>
      );
  }
};

export default memo(StatusIcon);
