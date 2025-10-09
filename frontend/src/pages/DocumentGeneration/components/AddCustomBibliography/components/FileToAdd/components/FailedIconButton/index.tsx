import React, { memo } from 'react';
import { IconButton, Box, Typography } from '@mui/material';
import { DeleteForeverRounded } from '@mui/icons-material';
import { CustomTooltip } from '../../../StyledComponents';

const FailedIconButton = ({ handleRemoveFile }) => {
  return (
    <Box
      sx={{
        minWidth: 60,
        display: 'flex',
        alignItems: 'center',
        ml: 2
      }}
      gap={1}
    >
      <Typography variant="caption" color="#AB2F26">
        Failed
      </Typography>
      <CustomTooltip title="Delete">
        <IconButton
          size="small"
          sx={{
            p: 0,
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }}
          onClick={handleRemoveFile}
        >
          <DeleteForeverRounded fontSize="small" color="error" />
        </IconButton>
      </CustomTooltip>
    </Box>
  );
};

export default memo(FailedIconButton);
