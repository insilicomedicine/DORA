import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import { vi, Mock } from 'vitest';
import UserPlanMenu from '.';
import { getPaymentsPortal } from 'services/payments';
import { useUserStore } from 'contexts/useUserStore';

// Mock the useUserStore
vi.mock('contexts/useUserStore', () => ({
  useUserStore: vi.fn()
}));

const mockUseUserStore = vi.mocked(useUserStore);

// Mock the getPaymentsPortal service
vi.mock('services/payments', () => ({
  getPaymentsPortal: vi.fn()
}));

describe('UserPlanMenu Tests', () => {
  it('should render UserPlanMenu component for Free trial', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          type: 'free',
          end_date: '2022-12-31',
          remaining_documents: 1,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <UserPlanMenu />
      </ThemeProvider>
    );

    expect(getByText('Free trial')).toBeInTheDocument();
    expect(getByText('Ends 31 Dec 2022')).toBeInTheDocument();
    expect(getByText('Documents left: 1')).toBeInTheDocument();
  });

  it('should render UserPlanMenu component for Advanced plan', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          type: 'advanced',
          name: 'Advanced',
          end_date: '2023-12-31',
          remaining_documents: 10,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <UserPlanMenu />
      </ThemeProvider>
    );
    expect(getByText('Advanced')).toBeInTheDocument();
    expect(getByText('Renews 31 Dec 2023')).toBeInTheDocument();
    expect(getByText('Documents left: 10')).toBeInTheDocument();
  });

  it('should render UserPlanMenu component for Professional plan', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          type: 'professional',
          name: 'Professional',
          end_date: '2023-12-31',
          remaining_documents: 20,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <UserPlanMenu />
      </ThemeProvider>
    );
    expect(getByText('Professional')).toBeInTheDocument();
    expect(getByText('Renews 31 Dec 2023')).toBeInTheDocument();
    expect(getByText('Unlimited documents')).toBeInTheDocument();
  });

  it('should open the subscription dialog on button click', () => {
    const mockSetShowSubscriptionDialog = vi.fn();

    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'active',
          type: 'free',
          end_date: '2022-12-31',
          remaining_documents: 1,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn(),
      setShowSubscriptionDialog: mockSetShowSubscriptionDialog
    });

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <UserPlanMenu />
      </ThemeProvider>
    );

    const button = getByText('Upgrade');
    fireEvent.click(button);

    expect(mockSetShowSubscriptionDialog).toHaveBeenCalledWith(true);
  });

  it('should handle external payments portal for past_due status', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    mockUseUserStore.mockReturnValue({
      userInfo: {
        is_internal: false,
        plan: {
          status: 'past_due',
          type: 'professional',
          end_date: '2023-12-31',
          remaining_documents: 20,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    (getPaymentsPortal as Mock).mockResolvedValue({
      portal_url: 'http://test-portal.com'
    });

    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <UserPlanMenu />
      </ThemeProvider>
    );

    const button = getByText('Renew');
    fireEvent.click(button);

    // Wait for the asynchronous function to resolve
    //@ts-ignore
    const paymentPortalCallArgs = await getPaymentsPortal.mock.results[0].value;
    expect(paymentPortalCallArgs).not.toBeNull();
    expect(openSpy).toHaveBeenCalledWith('http://test-portal.com', '_blank');
  });
});
