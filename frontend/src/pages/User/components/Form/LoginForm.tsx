import React, { useState, useRef, memo, useEffect } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { getCsrfToken, getUserInfo, login, googleLogin } from 'services/user';
import { useNavigate } from 'react-router';
import { sendGA4Event } from 'utils/ga';
import GoogleLoginButton from './GoogleLoginButton';
import { theme } from 'theme';
import {
  ButtonsContainer,
  FormContainer,
  FormFooter,
  FormLink,
  FormTitle,
  FormWrapper,
  ConfirmButton
} from './StyledComponents';
import { EmailPattern } from 'types/user';
import { useUserStore } from 'contexts/useUserStore';
import useSystemStore from 'contexts/useSystemStore';
import { getSocialAccountProviders } from 'services/system';

interface LoginFormProps {
  setStep: (_step: number) => void;
}

const LoginForm = ({ setStep = () => {} }: LoginFormProps) => {
  const nav = useNavigate();
  const { setUserInfo } = useUserStore();
  const { fetchSystemInfo } = useSystemStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setError] = useState<any>({});
  const [inputError, setInputError] = useState({});
  const [socialAccountProviders, setSocialAccountProviders] = useState<
    string[]
  >([]);
  const inputValues = useRef({ email: '', password: '' });

  const handleInputChange = (e, key) => {
    inputValues.current[key] = e.target.value;
  };

  const handleVaildation = () => {
    const { email, password } = inputValues.current;
    setInputError({
      email: !EmailPattern.test(email),
      password: !password
    });
    return !EmailPattern.test(email) || !password;
  };

  const handleSignCommon = async (callback) => {
    setIsProcessing(true);
    await getCsrfToken();
    const result = await callback();
    if (result?.status === 200) {
      const userInfo = await getUserInfo();
      setUserInfo(userInfo);
      if (!userInfo.terms_and_privacy_accepted) {
        setStep(6);
        return;
      }
      fetchSystemInfo();
      nav('/templates');
    } else {
      setError(result || {});
      setIsProcessing(false);
    }
  };

  const handleSignInForm = async (e) => {
    e.preventDefault();
    if (handleVaildation()) return;
    sendGA4Event('login', { button_type: 'Sign in', location: 'form' });
    handleSignCommon(() => login(inputValues.current));
  };

  const handleSignInGoogle = async (response) => {
    sendGA4Event('login', { button_type: 'Google sign in', location: 'form' });
    handleSignCommon(() => googleLogin(response.credential));
  };

  const formFields = [
    {
      label: 'Email',
      key: 'email',
      onChange: (e) => handleInputChange(e, 'email'),
      fullWidth: true,
      type: 'text',
      autoComplete: 'current-email',
      error: inputError['email'],
      errorMessage: 'Please enter a valid email',
      sx: {
        marginBottom: 3,
        [theme.breakpoints.down('md')]: {
          marginBottom: 4
        }
      }
    },
    {
      label: 'Password',
      key: 'password',
      fullWidth: true,
      type: showPassword ? 'text' : 'password',
      autoComplete: 'current-password',
      onChange: (e) => handleInputChange(e, 'password'),
      error: inputError['password'],
      errorMessage: 'Please enter your password',
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            aria-label="Toggle password visibility"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      )
    }
  ];

  // Fetch the social account providers
  useEffect(() => {
    const fetchSocialAccountProviders = async () => {
      const socialAccountProviders = await getSocialAccountProviders();
      setSocialAccountProviders(socialAccountProviders);
    };
    fetchSocialAccountProviders();
  }, []);

  return (
    <FormWrapper>
      {errors.detail && <Alert severity="error">{errors.detail}</Alert>}
      <FormTitle>Sign in</FormTitle>
      {socialAccountProviders?.includes('google') && (
        <GoogleLoginButton
          handleSuccess={handleSignInGoogle}
          wrapperSx={{ mt: 3 }}
        />
      )}
      <FormContainer noValidate autoComplete="off" onSubmit={handleSignInForm}>
        {formFields.map((field, index) => {
          const {
            label,
            error = false,
            errorMessage = '',
            fullWidth = false,
            type = 'text',
            autoComplete = 'off',
            sx = {},
            onChange = () => {},
            endAdornment = null
          } = field;
          return (
            <TextField
              autoFocus={index === 0}
              autoComplete={autoComplete}
              key={index}
              label={label}
              variant="outlined"
              fullWidth={fullWidth}
              type={type}
              onChange={onChange}
              error={error}
              helperText={error ? errorMessage : ''}
              sx={sx}
              slotProps={{
                input: { endAdornment },
                inputLabel: { shrink: true }
              }}
            />
          );
        })}
        <FormLink
          onClick={() => {
            setStep(3);
            nav('/reset-password');
          }}
          style={{ marginTop: 28 }}
        >
          Forgot password?
        </FormLink>
        <ButtonsContainer>
          <ConfirmButton
            disabled={isProcessing}
            type="submit"
            color="primary"
            variant="contained"
            size="large"
            data-testid="LoginForm-loginButton"
          >
            {isProcessing ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Sign in'
            )}
          </ConfirmButton>
        </ButtonsContainer>
        <FormFooter>
          <span>New here?&nbsp;</span>
          <FormLink
            data-ga-tracking
            onClick={() => {
              setStep(1);
              nav('/signup');
            }}
          >
            Create an account
          </FormLink>
        </FormFooter>
      </FormContainer>
    </FormWrapper>
  );
};

export default memo(LoginForm);
