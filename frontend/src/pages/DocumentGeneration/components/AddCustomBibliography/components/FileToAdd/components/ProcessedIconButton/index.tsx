import React, { memo } from 'react';
import { IconButton } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { CustomTooltip } from '../../../StyledComponents';

const ProcessedIconButton = ({ handleRemoveFile }) => {
  return (
    <CustomTooltip title="Exclude from this document">
      <IconButton
        size="small"
        sx={{
          p: 0,
          ml: 2,
          color: 'grey.600',
          '&:hover': {
            color: 'error.main',
            backgroundColor: 'transparent'
          }
        }}
        onClick={handleRemoveFile}
      >
        <CloseRounded fontSize="small" />
      </IconButton>
    </CustomTooltip>
  );
};

export default memo(ProcessedIconButton);
