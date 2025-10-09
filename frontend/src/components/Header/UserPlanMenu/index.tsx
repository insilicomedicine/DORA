import React, { MouseEvent, useCallback, memo } from 'react';
import {
  Box,
  Button,
  ButtonOwnProps,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import { subscriptionStatusInfo, UserInfo, userPlanInfo } from 'types/user';
import { formatDateWithNewRule } from 'utils/utils';
import { getPaymentsPortal } from 'services/payments';
import usePlanStatus from 'hooks/usePlanStatus';
import { useUserStore } from 'contexts/useUserStore';

const UserPlanMenu = () => {
  const { userInfo, setShowSubscriptionDialog } = useUserStore();
  const { plan } = userInfo as UserInfo;
  const { type = 'free', end_date: endDate = '' } = plan || {};
  const {
    isFree,
    isPaidPlanExpired,
    isExpired,
    isPastDue,
    subscriptionStatus
  } = usePlanStatus();

  const userPlan = {
    ...plan,
    ...userPlanInfo[type],
    endDateInfo: subscriptionStatusInfo[subscriptionStatus],
    button: {
      text: isPaidPlanExpired ? 'Renew' : 'Upgrade',
      variant: (isExpired
        ? 'contained'
        : 'outlined') as ButtonOwnProps['variant']
    }
  };

  const {
    name: planName = '',
    remaining_documents: remainingDocuments,
    remainingDocumentsText = '',
    endDateInfo,
    button
  } = userPlan;

  const handleSubscription = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isPastDue && !isFree) {
        const response = await getPaymentsPortal();
        if (response?.portal_url) {
          window.open(response.portal_url, '_blank');
        }
        return;
      }
      setShowSubscriptionDialog(true);
    },
    [isPastDue, isFree, setShowSubscriptionDialog]
  );

  return (
    <>
      <Box width="100%" pb="20px">
        <Stack direction="row" sx={{ width: '100%', alignItems: 'flex-start' }}>
          <Typography
            color="text.secondary"
            variant="caption"
            lineHeight="137%"
            letterSpacing={0}
          >
            Current plan
          </Typography>
          {endDate && (
            <Chip
              label={
                endDate && (
                  <Typography
                    color={endDateInfo?.color || 'text.secondary'}
                    variant="caption"
                  >
                    {endDateInfo?.text} {formatDateWithNewRule(endDate)}
                  </Typography>
                )
              }
              sx={{
                height: 24,
                backgroundColor: endDateInfo.bgColor,
                ml: 'auto'
              }}
              size="small"
            />
          )}
        </Stack>
        <Typography variant="h6" fontWeight={500} lineHeight="142%" mb={0.5}>
          {planName}
        </Typography>
        <Typography variant="body2" lineHeight="145%" letterSpacing={0.15}>
          {remainingDocumentsText ||
            `Documents left: ${remainingDocuments === null ? 'unlimited' : remainingDocuments}`}
        </Typography>
        {(isPaidPlanExpired || isFree) && (
          <Button
            variant={button.variant}
            sx={{
              marginTop: 2,
              padding: '6px 20px',
              height: 36,
              fontSize: 16,
              textTransform: 'none',
              pointerEvents: 'auto'
            }}
            onClick={handleSubscription}
            fullWidth
          >
            {button.text}
          </Button>
        )}
      </Box>
    </>
  );
};

export default memo(UserPlanMenu);
