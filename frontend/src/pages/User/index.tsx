import React, { memo } from 'react';
import { Stack } from '@mui/material';
import UserForm from './components/Form';
import InfoPanel from './components/InfoPanel';
import { theme } from 'theme';

interface UserProps {
  step?: number;
  isResetPassword?: boolean;
}

const User = (props: UserProps) => {
  return (
    <Stack
      direction="row"
      sx={{
        height: '100%',
        backgroundColor: 'transparent',
        [theme.breakpoints.down('md')]: {
          backgroundColor: 'white',
          padding: '0 20px'
        }
      }}
    >
      <UserForm {...props} />
      <InfoPanel />
    </Stack>
  );
};

export default memo(User);
