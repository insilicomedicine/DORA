import React, { ComponentType, useState } from 'react';
import { Stack } from '@mui/material';
import LoginForm from './LoginForm';
import CreateAccount from './CreateAccount';
import NewPassword from './NewPassword';
import ResetPassword from './ResetPassword';
import CheckInfo from './CheckInfo';
import ActiveAccount from './ActiveAccount';
import TermsAndPrivacy from './TermsAndPrivacy';
import { theme } from 'theme';

// Define form steps
export enum FormStep {
  LOGIN,
  CREATE_ACCOUNT,
  NEW_PASSWORD,
  RESET_PASSWORD,
  CHECK_INFO,
  ACTIVE_ACCOUNT,
  TERMS_AND_CONDITIONS
}

// Define common props interface for form components
interface FormComponentProps {
  setStep: (step: FormStep) => void;
  setStepInfo: (info: Record<string, any>) => void;
  stepInfo: Record<string, any>;
  isResetPassword?: boolean;
}

interface MainContainerProps {
  step?: FormStep;
  isResetPassword?: boolean;
}

// Lazy load components for each form step
const components = {
  [FormStep.LOGIN]: LoginForm,
  [FormStep.CREATE_ACCOUNT]: CreateAccount,
  [FormStep.NEW_PASSWORD]: NewPassword,
  [FormStep.RESET_PASSWORD]: ResetPassword,
  [FormStep.CHECK_INFO]: CheckInfo,
  [FormStep.ACTIVE_ACCOUNT]: ActiveAccount,
  [FormStep.TERMS_AND_CONDITIONS]: TermsAndPrivacy
} as const;

const Login = ({
  step: initialStep = FormStep.LOGIN,
  ...props
}: MainContainerProps) => {
  const [step, setStep] = useState<FormStep>(initialStep);
  const [stepInfo, setStepInfo] = useState<Record<string, any>>({});

  const ActiveComponent = components[step] as ComponentType<FormComponentProps>;

  return (
    <Stack
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        width: '33%',
        marginRight: 2,
        padding: '20px 40px',
        backgroundColor: 'white',
        borderRadius: 4,
        [theme.breakpoints.down('md')]: {
          width: '100%',
          padding: 0,
          justifyContent: 'start',
          marginRight: 0
        }
      }}
    >
      <ActiveComponent
        setStep={setStep}
        setStepInfo={setStepInfo}
        stepInfo={stepInfo}
        {...props}
      />
    </Stack>
  );
};

export default Login;
