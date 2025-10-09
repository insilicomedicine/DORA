import React from 'react';
import Templates from './Templates';
import { Box, Stack, Typography } from '@mui/material';

const CreateDocumentView = () => {
  return (
    <Stack
      sx={{
        position: 'relative',
        flex: 1,
        alignItems: 'center',
        pt: 1,
        height: '100%',
        minHeight: '100%',
        transition: 'all 200ms ease-out'
      }}
    >
      <Stack
        width="100%"
        alignItems="center"
        minHeight="100%"
        sx={{
          overflowY: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        <Typography
          variant="h5"
          sx={{
            lineHeight: 1.5,
            textAlign: 'center',
            mb: 5
          }}
        >
          What would you like to write today?
        </Typography>
        <Box width="93%" minHeight="100%" maxWidth={1200}>
          <Templates />
        </Box>
      </Stack>
    </Stack>
  );
};

export default CreateDocumentView;
