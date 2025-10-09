import React from 'react';
import { Skeleton, Stack } from '@mui/material';

const TextSkeleton = () => {
  return (
    <Stack>
      <Skeleton width="76%" height={24} />
      <Skeleton animation="wave" height={24} />
      <Skeleton animation={false} width="87%" height={24} />
    </Stack>
  );
};

export default TextSkeleton;
