import * as React from 'react';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

const PageSkeleton = (props: any) => {
  return (
    <Stack
      spacing={2}
      sx={{
        height: '85%',
        justifyContent: 'center',
        flexDirection: 'column',
        margin: '48px 15%'
      }}
      {...props}
    >
      <Skeleton variant="text" height={'6%'} />
      <Skeleton variant="circular" width={80} height={80} />
      <Skeleton variant="rectangular" height={'13%'} />
      <Skeleton variant="rounded" height={'67%'} />
    </Stack>
  );
};

export default React.memo(PageSkeleton);
