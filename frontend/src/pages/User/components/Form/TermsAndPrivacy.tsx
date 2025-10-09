import React, { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { acceptTermsAndPrivacy } from 'services/user';
import {
  FormWrapper,
  ConfirmButton,
  FormExternalLink,
  TermsAndConditions
} from './StyledComponents';

const TermsAndPrivacy = ({}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAcceptTermsAndPrivacy = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const reponse = await acceptTermsAndPrivacy();
    if (!reponse) return;
    window.location.href = '/templates';
  };

  return (
    <FormWrapper>
      <Box>
        <TermsAndConditions>
          Please accept our&nbsp;
          <FormExternalLink
            href="https://insilico.com/science42/dora/terms"
            target="_blank"
          >
            Terms & Conditions
          </FormExternalLink>
          <br />
          and&nbsp;
          <FormExternalLink
            href="https://insilico.com/science42/dora/privacy"
            target="_blank"
          >
            Privacy Policy
          </FormExternalLink>
        </TermsAndConditions>
      </Box>
      <ConfirmButton
        disabled={isProcessing}
        color="primary"
        variant="contained"
        fullWidth
        onClick={handleAcceptTermsAndPrivacy}
      >
        {isProcessing ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          'accept'
        )}
      </ConfirmButton>
    </FormWrapper>
  );
};

export default TermsAndPrivacy;
