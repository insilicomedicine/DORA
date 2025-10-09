import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getLandingPageURL } from 'utils/router';

const MobileReminder = () => {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        padding: '167px 32px 0'
      }}
    >
      <Typography fontWeight={700} fontSize={20} mb="12px" lineHeight="142%">
        Welcome to Science42: DORA!
      </Typography>
      <Typography fontSize={18} mb={8} lineHeight="142%">
        For the best experience, we recommend visiting us on a desktop.
      </Typography>
      <Button
        variant="outlined"
        color="primary"
        size="large"
        sx={{ width: 181 }}
        onClick={() => window.open(getLandingPageURL())}
      >
        LEARN MORE
      </Button>
    </Stack>
  );
};

export default MobileReminder;
