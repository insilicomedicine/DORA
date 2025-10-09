import React, { useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { register } from 'services/user';
import { useSearchParams } from 'react-router';
import { InfoOutlined } from '@mui/icons-material';
import { FormTitle } from './StyledComponents';

const ExpiredInfo = () => {
  const [searchParams] = useSearchParams();
  const [success, setSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const email = searchParams.get('email');

  const handleRequestNewLink = async () => {
    if (!email) return;
    const reponse = await register({ email });
    if (reponse.error) {
      reponse.isAccountExists && setShowError(true);
      return;
    }
    setSuccess(true);
  };

  return (
    <Stack sx={{ gap: 5, maxWidth: 414 }}>
      <Stack
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <InfoOutlined color="secondary" sx={{ fontSize: 40 }} />
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Please check your email for a validation link.
          </Alert>
        )}
        {showError && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Account with email ${email} alreadly exists, please
            <a
              href="/login"
              style={{ color: '#212121', textDecoration: 'underline' }}
            >
              &nbsp;sign in
            </a>
            .
          </Alert>
        )}
        <FormTitle mt={2}>Your activation link has expired.</FormTitle>
        <span style={{ color: '#666666' }}>
          Please request a new activation link below
        </span>
      </Stack>

      <Button
        type="submit"
        color="primary"
        variant="contained"
        onClick={handleRequestNewLink}
        data-ga-tracking
      >
        Request new activation link
      </Button>
    </Stack>
  );
};

export default ExpiredInfo;
