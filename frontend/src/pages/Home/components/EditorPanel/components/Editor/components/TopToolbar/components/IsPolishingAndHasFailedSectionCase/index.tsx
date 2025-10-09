import React, { memo } from 'react';
import { Alert, Box, Button, IconButton, Stack } from '@mui/material';
import {
  ExpandLessRounded,
  ExpandMoreRounded,
  SpellcheckRounded
} from '@mui/icons-material';

const IsPolishingHasFailedSectionCase = ({
  handlePolish,
  handleScrollToSection
}) => {
  return (
    <Box width="100%">
      <Alert
        severity="warning"
        icon={<SpellcheckRounded />}
        action={
          <Stack direction="row" sx={{ gap: '12px' }}>
            <Button
              sx={{ minWidth: 141, textTransform: 'unset', color: '#8A4908' }}
              onClick={handlePolish}
            >
              Restart Polishing
            </Button>
            <IconButton
              onClick={() => {
                handleScrollToSection('up');
              }}
            >
              <ExpandLessRounded />
            </IconButton>
            <IconButton onClick={() => handleScrollToSection()}>
              <ExpandMoreRounded />
            </IconButton>
          </Stack>
        }
      >
        Some sections were not polished successfully. Please check and either
        refuse polishing or try to restarth polishing the whole document.
      </Alert>
    </Box>
  );
};

export default memo(IsPolishingHasFailedSectionCase);
