import React, { MouseEvent } from 'react';
import { Typography, Button, Stack } from '@mui/material';
import { getPaymentsPortal } from 'services/payments';
import usePlanStatus from 'hooks/usePlanStatus';
import { useUserStore } from 'contexts/useUserStore';

const PlanExpired = () => {
  const { setShowSubscriptionDialog } = useUserStore();
  const { isFree, isPastDue } = usePlanStatus();

  const handleSubscription = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isPastDue && !isFree) {
      const response = await getPaymentsPortal();
      if (response?.portal_url) {
        window.open(response.portal_url, '_blank');
      }
      return;
    }
    setShowSubscriptionDialog(true);
  };

  return (
    <Stack
      textAlign="center"
      height="100%"
      justifyContent="center"
      alignItems="center"
      pr={1.5}
      maxWidth={348}
      margin="auto"
    >
      <Typography
        variant="body2"
        fontWeight={500}
        lineHeight={1.45}
        letterSpacing={0.1}
      >
        Plan expired
      </Typography>
      <Typography
        mt={1}
        mb={4}
        variant="body2"
        lineHeight={1.45}
        letterSpacing={0.15}
        color="text.secondary"
      >
        AI Review is temporarily unavailable. Upgrade your plan to unlock smart
        analysis and insights.
      </Typography>

      <Button variant="contained" onClick={handleSubscription}>
        Upgrade
      </Button>
    </Stack>
  );
};

export default PlanExpired;
