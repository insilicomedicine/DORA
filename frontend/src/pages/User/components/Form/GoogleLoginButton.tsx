import React, { memo, useEffect, useState, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Divider, Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { CredentialResponse } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from 'config/env';

interface GoogleLoginButtonProps {
  handleSuccess: (response: CredentialResponse) => void;
  wrapperSx?: SxProps<Theme>;
}

const GoogleLoginButton = ({
  handleSuccess,
  wrapperSx
}: GoogleLoginButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setButtonWidth(containerWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    console.error('VITE_GOOGLE_CLIENT_ID is not set');
    return null;
  }

  return (
    <Stack
      ref={containerRef}
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        ...wrapperSx
      }}
    >
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => {
            console.error('Google Login Failed');
          }}
          useOneTap
          shape="rectangular"
          size="large"
          width={buttonWidth}
        />
      </GoogleOAuthProvider>
      <Divider sx={{ borderColor: 'grey.200', mt: 4 }} />
    </Stack>
  );
};

export default memo(GoogleLoginButton);
