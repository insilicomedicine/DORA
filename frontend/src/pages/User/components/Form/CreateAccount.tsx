import React, { FormEvent, useState, memo } from 'react';
import { TextField, CircularProgress } from '@mui/material';
import { register } from 'services/user';
import { useNavigate } from 'react-router';
import {
  FormContainer,
  FormTitle,
  FormWrapper,
  ButtonsContainer,
  ConfirmButton,
  FormFooter,
  FormLink
} from './StyledComponents';
import { EmailPattern } from 'types/user';

interface CreateAccountProps {
  setStep: (_step: number) => void;
  setStepInfo?: (_info: any) => void;
}

const CreateAccount = ({
  setStep = () => {},
  setStepInfo = () => {}
}: CreateAccountProps) => {
  const nav = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [inputError, setInputError] = useState({});
  const [inputValues, setInputValues] = useState({ email: '' });

  const handleInputChange = (e, key) => {
    setInputValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const reponse = await register({ email: inputValues.email });
    setIsProcessing(false);
    if (reponse.error) {
      return;
    }
    setStep(4);
    setStepInfo({ from: 'createAccount' });
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
      <FormTitle>Create your account</FormTitle>
      <FormContainer
        noValidate
        autoComplete="off"
        onSubmit={handleCreateAccount}
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
            data-ga-event="sign_up"
          >
            {isProcessing ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Create account'
            )}
          </ConfirmButton>
        </ButtonsContainer>
        <FormFooter>
          <span>Already have an account?&nbsp;</span>
          <FormLink
            onClick={() => {
              nav('/login');
              setStep(0);
            }}
          >
            Sign in
          </FormLink>
        </FormFooter>
      </FormContainer>
    </FormWrapper>
  );
};

export default memo(CreateAccount);
