import React, { CSSProperties, memo, ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import NoDataImg from 'assets/rightPanel/NoData.svg';

interface NoDataProps {
  imgSrc?: string;
  content?: ReactNode;
  styles?: CSSProperties;
}

const NoData = ({ imgSrc, content, styles }: NoDataProps) => {
  return (
    <Stack
      justifyContent="center"
      alignItems="center"
      sx={{
        height: '100%',
        padding: 1,
        textAlign: 'center',
        bgcolor: 'common.white',
        borderRadius: 3,
        userSelect: 'none'
      }}
    >
      <img src={imgSrc || NoDataImg} style={styles} />
      {content || (
        <Typography
          variant="body2"
          color="text.secondary"
          lineHeight={1.5}
          letterSpacing={0.15}
        >
          Evidence for the information can be found here. Click any link in the
          text to view it.
        </Typography>
      )}
    </Stack>
  );
};

export default memo(NoData);
