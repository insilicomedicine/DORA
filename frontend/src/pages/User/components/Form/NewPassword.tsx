import React, { useEffect, useState, memo } from 'react';
import classNames from 'classnames';
import { CheckRounded, Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, FormControl, Box, TextField, Stack } from '@mui/material';
import { setPassword, validatePassword } from 'services/user';
import { useNavigate, useParams } from 'react-router';
import { useDebounce } from 'hooks/useDebounce';
import {
  FormTitle,
  FormWrapper,
  FormContainer,
  ButtonsContainer,
  ConfirmButton,
  CancelButton,
  ValidationRules,
  ValidationRulesStrength
} from './StyledComponents';

interface NewPasswordProps {
  setStep: (_step: number) => void;
  isResetPassword?: boolean;
}

const NewPassword = ({
  setStep = () => {},
  isResetPassword = false
}: NewPasswordProps) => {
  const nav = useNavigate();
  const queries = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [matchedRules, setMatchedRules] = useState<any>([]);
  const [inputValues, setInputValues] = useState({
    password: '',
    confirmPassword: ''
  });
  const { password, confirmPassword } = inputValues;

  const debouncePassword = useDebounce(password, 600);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const response = await setPassword({ password, ...queries });
    if (response) {
      nav('/login');
      setStep(0);
    }
    setIsProcessing(false);
  };

  const handleInputChange = async (e, key) => {
    const value = e.target.value;
    //replace all spaces
    setInputValues((prev) => ({ ...prev, [key]: value.replace(/\s/g, '') }));
  };

  const clear = (key) => {
    setInputValues((prev) => ({ ...prev, [key]: '' }));
    setMatchedRules([]);
  };

  const matchRules = (key) => {
    return matchedRules.find((rule) => rule.rule === key);
  };

  const passwordValidationRules = [
    {
      rule: 'base',
      text: 'At least 8 characters',
      valid: password && password.length >= 8
    },
    {
      rule: 'differs_with_login',
      text: 'Should not be the same as login',
      valid: matchRules('differs_with_login')?.valid
    },
    {
      rule: 'base',
      text: 'Should contain number(s)',
      valid: password && password.match(/[0-9]/)
    },
    {
      rule: 'base',
      text: 'Should contain letter(s)',
      valid: password && password.match(/[a-zA-Z]/)
    },
    {
      rule: 'not_common_password',
      text: 'Should not be a common password',
      valid: matchRules('not_common_password')?.valid
    }
  ];

  const allMatched = passwordValidationRules.every((rule) => rule.valid);
  const passwordStrength = allMatched ? 'strong' : 'weak';

  const formFields = [
    {
      label: 'Password',
      key: 'password',
      value: password,
      fullWidth: true,
      isRequired: true,
      type: 'password',
      enableRulesCheck: true,
      passwordStrength,
      onChange: (e) => handleInputChange(e, 'password'),
      onClear: () => clear('password')
    },
    {
      label: 'Confirm password',
      key: 'confirmPassword',
      value: confirmPassword,
      fullWidth: true,
      isRequired: true,
      type: 'password',
      error: !!confirmPassword && confirmPassword !== password,
      errorMessage: 'Password doesn’t match',
      onChange: (e) => handleInputChange(e, 'confirmPassword'),
      onClear: () => clear('confirmPassword')
    }
  ];

  useEffect(() => {
    const isPassedBaseValidation = passwordValidationRules
      .filter((item) => item.rule === 'base')
      .every((rule) => rule.valid);
    if (!isPassedBaseValidation) {
      setMatchedRules([]);
      return;
    }
    const validateNewPassword = async () => {
      const response = await validatePassword({
        password: debouncePassword,
        ...queries
      });
      if (response) {
        const matchedRulesData =
          response.validation_rules.filter((rule) => rule.valid) || [];
        setMatchedRules(matchedRulesData);
      }
    };
    validateNewPassword();
  }, [debouncePassword]);

  return (
    <FormWrapper>
      <FormTitle>Enter new password</FormTitle>
      <FormContainer noValidate autoComplete="off" onSubmit={handleConfirm}>
        {formFields.map((field, index) => {
          const {
            label,
            key,
            value,
            error = false,
            errorMessage,
            passwordStrength = 'weak',
            enableRulesCheck = false,
            onChange = () => {}
          } = field;
          return (
            <FormControl fullWidth variant="outlined" key={index}>
              <Stack
                gap={1}
                display="flex"
                flexDirection="row"
                alignItems="center"
              >
                <TextField
                  value={value}
                  onChange={onChange}
                  label={label}
                  slotProps={{
                    htmlInput: {
                      type: showPasswords[key] ? 'text' : 'password'
                    },
                    input: {
                      endAdornment: (
                        <IconButton
                          aria-label="Toggle password visibility"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              [key]: !prev[key]
                            }))
                          }
                        >
                          {showPasswords[key] ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      )
                    }
                  }}
                  error={error}
                  helperText={error ? errorMessage : ''}
                  fullWidth
                />
              </Stack>
              {enableRulesCheck && (
                <Box sx={{ mt: 1, mb: 3 }} gap={1}>
                  {password.length > 0 && (
                    <ValidationRules
                      key={index}
                      className={classNames(allMatched && 'isMatched')}
                      sx={{ ml: 0 }}
                    >
                      <CheckRounded
                        htmlColor="#009152"
                        style={{
                          visibility: allMatched ? 'visible' : 'hidden'
                        }}
                      />
                      <span>
                        Password strength:
                        <ValidationRulesStrength
                          className={classNames(passwordStrength)}
                        >
                          {passwordStrength}
                        </ValidationRulesStrength>
                      </span>
                    </ValidationRules>
                  )}
                  {passwordValidationRules.map((rule, index) => (
                    <ValidationRules
                      key={index}
                      className={classNames(rule.valid && 'isMatched')}
                      sx={{ ml: 0 }}
                    >
                      <CheckRounded
                        htmlColor="#009152"
                        style={{
                          visibility: rule.valid ? 'visible' : 'hidden'
                        }}
                      />
                      <span>{rule.text}</span>
                    </ValidationRules>
                  ))}
                </Box>
              )}
            </FormControl>
          );
        })}

        <ButtonsContainer>
          <ConfirmButton
            disabled={
              !allMatched ||
              !confirmPassword ||
              password !== confirmPassword ||
              isProcessing
            }
            type="submit"
            color="primary"
            variant="contained"
            data-ga-event="activate"
          >
            {isResetPassword ? 'Reset Password' : 'Confirm'}
          </ConfirmButton>
          <CancelButton
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

export default memo(NewPassword);
