import React from 'react';
import { Box, Typography } from '@mui/material';

interface UserInputDefaultBlockProps {
  title: string;
  content: string;
}

const DefaultBlock = ({ title, content }: UserInputDefaultBlockProps) => {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography fontWeight={500} mb={1}>
        {title}
      </Typography>
      <Box
        sx={{
          backgroundColor: '#F5F5F5',
          padding: '12px 24px 12px 16px',
          borderRadius: 2
        }}
      >
        <Typography variant="body2">{content}</Typography>
      </Box>
    </Box>
  );
};

export default DefaultBlock;
