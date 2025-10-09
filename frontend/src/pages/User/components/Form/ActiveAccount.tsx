import React, { useEffect, useState, memo } from 'react';
import { CircularProgress } from '@mui/material';
import { useParams } from 'react-router';
import { validateToken } from 'services/user';
import ExpiredInfo from './ExpiredInfo';
import ResetPasswordExpiredInfo from './ResetPasswordExpiredInfo';
import NewPassword from './NewPassword';

interface ActiveAccountProps {
  setStep?: (_step: number) => void;
  isResetPassword?: boolean;
}

const ActiveAccount = ({
  setStep = () => {},
  isResetPassword = false
}: ActiveAccountProps) => {
  const queries = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const ActivedComponents = !isResetPassword
    ? [ExpiredInfo, NewPassword]
    : [ResetPasswordExpiredInfo, NewPassword];
  const ActivedComponent = ActivedComponents[activeStep];

  useEffect(() => {
    const checkToken = async () => {
      const response: any = await validateToken({ ...queries });
      if (response?.error) {
        setActiveStep(0);
        if (response?.isInvalidToken) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }
      setIsLoading(false);
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <div>
        <CircularProgress size={48} />
      </div>
    );
  }

  return (
    <ActivedComponent setStep={setStep} isResetPassword={isResetPassword} />
  );
};

export default memo(ActiveAccount);
