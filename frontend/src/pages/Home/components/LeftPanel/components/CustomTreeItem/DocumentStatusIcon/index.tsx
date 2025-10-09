import React from 'react';
import { CircularProgress } from '@mui/material';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import DraftIcon from 'assets/icons/draft.svg?react';

const documentStatusIcon = {
  draft: () => <DraftIcon />,
  in_progress: () => <CircularProgress size={12} sx={{ minWidth: 12 }} />,
  polishing: (style) => (
    <span
      className="polishing"
      style={{
        width: 6,
        height: 6,
        minWidth: 6,
        minHeight: 6,
        borderRadius: '50%',
        backgroundColor: '#9FDBBB',
        display: 'inline-block',
        marginLeft: -26,
        ...style
      }}
    ></span>
  ),
  completed: () => <DescriptionRounded htmlColor="#21965F" fontSize="xsmall" />,
  failed: () => <ErrorOutlineRounded htmlColor="#F44336" fontSize="xsmall" />
};

export default documentStatusIcon;
