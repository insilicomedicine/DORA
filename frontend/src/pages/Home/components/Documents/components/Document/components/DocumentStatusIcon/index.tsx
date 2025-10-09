import React from 'react';
import { Typography, Stack, CircularProgress, Tooltip } from '@mui/material';
import {
  AssignmentLateRounded,
  CheckCircleRounded,
  ErrorOutlineRounded
} from '@mui/icons-material';
import DraftIcon from 'assets/icons/draft.svg?react';

const documentStatusIcon = {
  draft: () => (
    <>
      <DraftIcon />
      <Typography
        color="text.secondary"
        variant="caption"
        sx={{ ml: 0.5, verticalAlign: 'bottom' }}
      >
        Draft
      </Typography>
    </>
  ),
  completed: () => <CheckCircleRounded htmlColor="#29A96D" />,
  limited: () => (
    <Tooltip title="You have reached your plan’s limit" placement="right" arrow>
      <AssignmentLateRounded htmlColor="#E8A728" sx={{ cursor: 'pointer' }} />
    </Tooltip>
  ),
  in_progress: () => <CircularProgress size={16} />,
  polishing: () => (
    <Stack
      sx={{
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#9FDBBB'
        }}
      ></span>
    </Stack>
  ),
  failed: () => (
    <ErrorOutlineRounded htmlColor="#F44336" style={{ fontSize: 16 }} />
  )
};

export default documentStatusIcon;
