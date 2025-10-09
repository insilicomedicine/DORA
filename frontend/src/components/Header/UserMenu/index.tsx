import React, { memo, useState } from 'react';
import {
  Menu,
  MenuItem,
  CircularProgress,
  Typography,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  TooltipProps,
  tooltipClasses
} from '@mui/material';
import Dialog from 'components/Dialog';
import PricingTable from 'components/Payment/PricingTable';
import { LogoutRounded } from '@mui/icons-material';
import UserPlanMenu from '../UserPlanMenu';
import { getPaymentsPortal } from 'services/payments';
import { logout } from 'services/user';
import styled from '@emotion/styled';
import usePlanStatus from 'hooks/usePlanStatus';
import { useUserStore } from 'contexts/useUserStore';

const CustomMenuItem = styled(MenuItem)(({}) => ({
  display: 'block',
  padding: '0 8px',
  cursor: 'default',
  '&:hover': {
    backgroundColor: 'transparent'
  }
}));

const CustomTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    marginBottom: '2px !important'
  }
}));

interface UserMenuProps {
  anchorEl: HTMLElement | null;
  isMenuOpen: boolean;
  handleMenuClose: () => void;
}

const UserMenu = ({ anchorEl, isMenuOpen, handleMenuClose }: UserMenuProps) => {
  const [isLoadingPaymentsPortal, setIsLoadingPaymentsPortal] =
    useState<boolean>(false);

  const { userInfo, showSubscriptionDialog, setShowSubscriptionDialog } =
    useUserStore();

  const { is_internal: isUserInternal = false, email: userEmail = '' } =
    userInfo || {};
  const { isCanceled, isPaidPlanExpired, isFree } = usePlanStatus();

  const handleManageSubscription = async () => {
    if (isCanceled) {
      setShowSubscriptionDialog(true);
      return;
    }
    setIsLoadingPaymentsPortal(true);
    const response = await getPaymentsPortal();
    setIsLoadingPaymentsPortal(false);
    if (!response?.portal_url) return;
    window.open(response?.portal_url, '_blank');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          '& .MuiMenu-paper': {
            minWidth: 332,
            padding: '20px 16px',
            borderRadius: 4,
            boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
          },
          '& .MuiList-padding': {
            padding: 0
          }
        }}
      >
        {!isUserInternal && (
          <div>
            <CustomMenuItem
              disableRipple
              sx={{
                mb: 1
              }}
            >
              <UserPlanMenu />
              <Divider />
            </CustomMenuItem>
            {!isPaidPlanExpired && !isFree && (
              <CustomMenuItem
                disableRipple
                sx={{
                  mb: 1
                }}
              >
                {isLoadingPaymentsPortal ? (
                  <Stack
                    direction="row"
                    sx={{
                      width: '100%',
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CircularProgress size={20} />
                  </Stack>
                ) : (
                  <Stack
                    sx={{
                      maxHeight: 40,
                      padding: '10px 8px',
                      margin: '0 -8px',
                      borderRadius: '10px',
                      fontSize: 14,
                      lineHeight: '145%',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.50'
                      }
                    }}
                    onClick={handleManageSubscription}
                  >
                    Manage Subscription
                  </Stack>
                )}
                <Divider sx={{ mt: 1 }} />
              </CustomMenuItem>
            )}
          </div>
        )}
        <CustomMenuItem disableRipple>
          <Typography
            variant="body2"
            color="text.secondary"
            display="flex"
            alignItems="center"
            width="100%"
            lineHeight="145%"
          >
            {userEmail}
            <CustomTooltip title="Sign Out" placement="top">
              <IconButton
                disableRipple
                size="small"
                onClick={handleLogout}
                sx={{
                  marginLeft: 'auto',
                  color: 'grey.600',
                  padding: '3px',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: 'primary.main'
                  }
                }}
              >
                <LogoutRounded />
              </IconButton>
            </CustomTooltip>
          </Typography>
        </CustomMenuItem>
      </Menu>
      <Dialog
        open={showSubscriptionDialog}
        handleClose={() => setShowSubscriptionDialog(false)}
        title="Upgrade your subscription"
        Content={<PricingTable />}
        sx={{
          '& .MuiDialog-paper': {
            maxWidth: '100%',
            minWidth: 1100,
            minHeight: 620
          }
        }}
        disableConfirmButton
        enableHeaderCloseIcon
        enableScrolableContent
        enableActions={false}
      />
    </>
  );
};

export default memo(UserMenu);
