import React from 'react';
import { Typography, Stack } from '@mui/material';

const NoFiles = () => {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 256,
        borderRadius: '12px',
        backgroundColor: '#F7F7F7',
        textAlign: 'center'
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontSize: 24,
          height: 36,
          mb: 1
        }}
      >
        📂
      </Typography>
      <Typography color="text.secondary" variant="body2" lineHeight={1.37}>
        Uploaded files will be displayed here,
        <br /> but you haven't added any yet.
      </Typography>
    </Stack>
  );
};

export default NoFiles;
