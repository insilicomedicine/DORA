import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';

const Tag = ({ name, content }) => {
  let text = content;

  if (content && Array.isArray(content)) {
    //remove unvalid elements (empty, null or undefined)
    text = text.filter((item) => item || item === 0);
    text = text.join(', ');
  }

  return (
    <Box sx={{ padding: '2px 0' }}>
      <Typography
        variant="caption"
        data-testid="tag-tagName"
        color="text.secondary"
        sx={{
          fontSize: 16,
          lineHeight: '19px',
          letterSpacing: '0.02em',
          paddingRight: 0
        }}
      >
        {`${name}: `}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: 16,
          lineHeight: '19px',
          letterSpacing: '0.02em'
        }}
      >
        {text !== '' ? text : '—'}
      </Typography>
    </Box>
  );
};

export default memo(Tag);
