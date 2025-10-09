import React, { FormEvent, useState, memo } from 'react';
import { TextField } from '@mui/material';
import { resetPassword } from 'services/user';
import { useNavigate } from 'react-router';
import {
  FormTitle,
  FormWrapper,
  FormContainer,
  ButtonsContainer,
  ConfirmButton,
  CancelButton
} from './StyledComponents';
import { EmailPattern } from 'types/user';

interface ResetPasswordProps {
  setStep: (_step: number) => void;
  setStepInfo?: (_info: any) => void;
}

const ResetPassword = ({
  setStep = () => {},
  setStepInfo = () => {}
}: ResetPasswordProps) => {
  const nav = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputError, setInputError] = useState({});
  const [inputValues, setInputValues] = useState({ email: '' });

  const handleInputChange = (e, key) => {
    setInputValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const response = await resetPassword({ email: inputValues.email });
    if (!response) {
      return;
    }
    setStep(4);
    setStepInfo({ from: 'resetPassword' });
  };

  const formFields = [
    {
      label: 'Email',
      value: inputValues['email'],
      onChange: (e) => handleInputChange(e, 'email'),
      handleVaildation: (e) => {
        if (EmailPattern.test(e.target.value)) {
          setInputError((prev) => ({ ...prev, email: false }));
        } else {
          setInputError((prev) => ({ ...prev, email: true }));
        }
      },
      fullWidth: true,
      isRequired: true,
      type: 'email',
      error: inputError['email'],
      errorMessage: 'Please enter a valid email'
    }
  ];

  const disableSubmit =
    Object.values(inputError).some((error) => error) ||
    !inputValues['email'] ||
    isProcessing;

  return (
    <FormWrapper>
      <FormTitle>Enter your email to reset password</FormTitle>
      <FormContainer
        noValidate
        autoComplete="off"
        onSubmit={handleResetPassword}
      >
        {formFields.map((field, index) => (
          <TextField
            key={index}
            label={field.label}
            variant="outlined"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.handleVaildation}
            fullWidth={field.fullWidth}
            error={field.error}
            helperText={field.error ? field.errorMessage : ''}
            slotProps={{
              htmlInput: {
                type: field.type || 'text'
              }
            }}
          />
        ))}

        <ButtonsContainer>
          <ConfirmButton
            disabled={disableSubmit}
            type="submit"
            color="primary"
            variant="contained"
            data-ga-tracking
          >
            Reset
          </ConfirmButton>
          <CancelButton
            color="primary"
            onClick={() => {
              nav('/login');
              setStep(0);
            }}
          >
            Cancel
          </CancelButton>
        </ButtonsContainer>
      </FormContainer>
    </FormWrapper>
  );
};

export default memo(ResetPassword);
