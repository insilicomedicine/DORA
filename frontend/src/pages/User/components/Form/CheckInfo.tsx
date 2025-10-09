import React, { memo } from 'react';
import { Stack } from '@mui/material';
import EmailSentIcon from 'assets/login/email_sent.gif';
import { FormTitle } from './StyledComponents';
interface CheckInfoProps {
  stepInfo: Record<string, any>;
}

const CheckInfo = ({
  stepInfo: { from = 'resetPassword' }
}: CheckInfoProps) => {
  const isResetPassword = from === 'resetPassword';
  const isCreateAccount = from === 'createAccount';
  const checkInfoTitles = {
    resetPassword: 'Check your email for a reset link',
    createAccount: 'Check your email for a verification link'
  };
  const title = checkInfoTitles[from];

  return (
    <Stack
      justifyContent="center"
      alignItems="center"
      sx={{ textAlign: 'center' }}
    >
      {isCreateAccount && (
        <FormTitle sx={{ mt: { sm: '170px', md: 1.5 }, mb: 4 }}>
          {title}
        </FormTitle>
      )}
      <img src={EmailSentIcon} width={94} height={94} />
      {isResetPassword && <FormTitle mt={1}>{title}</FormTitle>}
    </Stack>
  );
};

export default memo(CheckInfo);
