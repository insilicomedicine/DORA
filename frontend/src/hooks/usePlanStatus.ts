import { useMemo } from 'react';
import { SubscriptionStatus, PlanStatus, UserInfo } from 'types/user';
import { useUserStore } from 'contexts/useUserStore';

const usePlanStatus = (): PlanStatus => {
  const { userInfo } = useUserStore();
  const {
    is_internal: isUserInternal = false,
    in_progress_documents: inProgressDocuments = 0,
    plan
  } = userInfo as UserInfo;
  const {
    status = 'active',
    type = '',
    end_date: endDate = '',
    remaining_documents: remainingDocuments,
    cancel_at_period_end: cancelAtPeriodEnd = false
  } = plan || {};

  const isFree = type === 'free';
  const isAdvanced = type === 'advanced';
  const isPro = type === 'professional';
  const isPastDue = status === 'past_due';
  const isExpired = status === 'canceled' || isPastDue;
  const isPaidPlanExpired = !isFree && isExpired;
  const isCanceled = status === 'active' && cancelAtPeriodEnd;
  const hasNoRemainingDocuments = remainingDocuments === 0;
  const isReachedLimit = !isPro && hasNoRemainingDocuments;
  const limitType = isExpired ? 'expired' : type;

  const subscriptionStatus: SubscriptionStatus = useMemo(() => {
    if (isCanceled) return 'canceled';
    if (isExpired) return 'expired';
    if (isFree) return 'free';
    return status;
  }, [isCanceled, isExpired, isFree, status]);

  return {
    isFree,
    isAdvanced,
    isPro,
    isPastDue,
    isCanceled,
    isExpired,
    isPaidPlanExpired,
    isReachedLimit,
    isLimited: !isUserInternal && (isPastDue || isReachedLimit),
    isPlanReachedLimit: isAdvanced && hasNoRemainingDocuments,
    subscriptionStatus,
    remainingDocuments,
    inProgressDocuments,
    endDate,
    limitType,
    limitInfos: {
      free: 'Editing documents is unavailable.',
      ...(isExpired && {
        expired: {
          document: 'Editing documents is unavailable due to expired plan.',
          export: 'Export is not available due to expired plan.'
        }
      })
    }
  };
};

export default usePlanStatus;
