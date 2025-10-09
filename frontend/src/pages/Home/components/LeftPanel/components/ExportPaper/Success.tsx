import React from 'react';
import ExportSuccessfully from 'assets/editor/export_successfully.svg';
import { Box, Typography } from '@mui/material';

const ExportPaperSuccessfully = () => {
  return (
    <Box
      mt={1}
      minHeight={157}
      sx={{
        '& img': {
          display: 'block',
          margin: '34px auto 18px'
        }
      }}
    >
      <Typography m={0}>Your paper has been exported successfully.</Typography>
      <img src={ExportSuccessfully} />
    </Box>
  );
};

export default ExportPaperSuccessfully;
