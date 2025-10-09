import { setGADimensions } from 'utils/ga';
import { useEffect } from 'react';
import { GAUserPlan, GAUserType } from 'types/user';
import { useUserStore } from 'contexts/useUserStore';

const useGAUserDimensions = () => {
  const { userInfo } = useUserStore();
  const { type: planType = '', status: planStatus = '' } = userInfo?.plan || {};
  const { is_internal: isInternal = false } = userInfo;

  useEffect(() => {
    const determineUserType = (): GAUserType => {
      if (!userInfo || !Object.keys(userInfo).length) {
        return 'unknown';
      }
      if (isInternal) {
        return 'internal';
      }
      return planType === 'free' ? 'external_trial' : 'external_paid';
    };

    const determineUserPlan = (): GAUserPlan => {
      if (!planType) {
        return 'null';
      }
      const isExpired = ['past_due', 'canceled'].includes(planStatus);
      return isExpired ? 'expired' : (planType as GAUserPlan);
    };

    const userType = determineUserType();
    const userPlan = determineUserPlan();

    setGADimensions('user_properties', {
      user_type: userType,
      user_plan: userPlan
    });
  }, [userInfo, planType, planStatus, isInternal]);

  return null;
};

export default useGAUserDimensions;
