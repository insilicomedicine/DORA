import React, { memo } from 'react';
import { Alert, Box, IconButton, Stack } from '@mui/material';
import {
  ExpandLessRounded,
  ExpandMoreRounded,
  SpellcheckRounded
} from '@mui/icons-material';

const IsDocumentCompletedCase = ({ handleScrollToSection }) => {
  return (
    <Box width="100%">
      <Alert
        severity="success"
        icon={<SpellcheckRounded />}
        action={
          <Stack direction="row" sx={{ gap: '12px', display: 'flex' }}>
            <IconButton
              onClick={() => {
                handleScrollToSection('up');
              }}
            >
              <ExpandLessRounded htmlColor="#1C8554" />
            </IconButton>
            <IconButton
              onClick={() => {
                handleScrollToSection();
              }}
            >
              <ExpandMoreRounded htmlColor="#1C8554" />
            </IconButton>
          </Stack>
        }
      >
        Please review the refined sections and choose whether to apply changes
        or keep the original text
      </Alert>
    </Box>
  );
};

export default memo(IsDocumentCompletedCase);
