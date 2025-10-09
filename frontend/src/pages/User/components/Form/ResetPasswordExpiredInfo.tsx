import React, { memo } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import { InfoOutlined } from '@mui/icons-material';

interface ResetPasswordExpiredInfoProps {
  setStep: (_step: number) => void;
}

const ResetPasswordExpiredInfo = ({
  setStep = () => {}
}: ResetPasswordExpiredInfoProps) => {
  const nav = useNavigate();

  return (
    <Stack sx={{ gap: 5 }}>
      <Stack
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: 298,
          textAlign: 'center'
        }}
      >
        <InfoOutlined color="secondary" sx={{ fontSize: 40 }} />
        <p style={{ lineHeight: '24px', color: '#666666' }}>
          To reset your password, return to the login page and select "Forgot
          Password" to send a new email.
        </p>
      </Stack>
      <Button
        type="submit"
        color="primary"
        variant="contained"
        onClick={() => {
          setStep(0);
          nav('/login');
        }}
      >
        Back to login
      </Button>
    </Stack>
  );
};

export default memo(ResetPasswordExpiredInfo);
