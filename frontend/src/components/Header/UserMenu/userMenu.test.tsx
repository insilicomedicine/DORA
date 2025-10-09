import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';

import { vi } from 'vitest';
import UserMenu from '.';
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
// Mock the logout service
vi.mock('services/user', () => ({
  logout: vi.fn()
}));

describe('UserMenu Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock for useUserStore - can be overridden in individual tests
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'default@test.com',
        is_internal: false,
        plan: {
          type: 'free',
          status: 'active',
          remaining_documents: 1
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });
  });

  it('should render UserMenu component with user details', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'test email',
        plan: {
          type: 'advanced'
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('test email')).toBeInTheDocument();
    // manage subscription button
    expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
    // log out button
    expect(screen.getByLabelText('Sign Out')).toBeInTheDocument();
  });

  it('should render UserPlanMenu component', () => {
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'test email',
        plan: {
          type: 'free',
          status: 'active',
          remaining_documents: 1
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Documents left: 1')).toBeInTheDocument();
  });

  it('should call getPaymentsPortal on manage subscription click for active plan', async () => {
    const mockGetPaymentsPortal = vi.mocked(
      await import('services/payments')
    ).getPaymentsPortal;
    mockGetPaymentsPortal.mockResolvedValue({
      portal_url: 'http://test-portal.com'
    });

    // Override the default mock for this specific test
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'test email',
        is_internal: false,
        plan: {
          type: 'advanced',
          status: 'active'
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );

    const manageSubscriptionButton = screen.getByText('Manage Subscription');
    fireEvent.click(manageSubscriptionButton);

    // simulate async behavior
    await screen.findByRole('progressbar');
    expect(mockGetPaymentsPortal).toHaveBeenCalled();
  });

  it('should call logout on log out button click', async () => {
    const mockLogout = vi.mocked(await import('services/user')).logout;

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );

    const logoutButton = screen.getByLabelText('Sign Out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should not render user plan menu if the user is internal', () => {
    // Override the default mock for this specific test
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'internal@test.com',
        is_internal: true,
        plan: {
          status: 'active',
          type: 'free',
          name: 'Free Plan',
          end_date: '2022-12-31',
          remaining_documents: 1,
          cancel_at_period_end: false
        }
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );
    expect(screen.queryByText('Free Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Documents left: 1')).not.toBeInTheDocument();
  });

  it('should not render manage subscription button if the user is internal', () => {
    // Override the default mock for this specific test
    mockUseUserStore.mockReturnValue({
      userInfo: {
        email: 'internal@test.com',
        is_internal: true
      },
      setUserInfo: vi.fn(),
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    });

    render(
      <ThemeProvider theme={theme}>
        <UserMenu
          anchorEl={null}
          isMenuOpen={true}
          handleMenuClose={() => {}}
        />
      </ThemeProvider>
    );
    expect(screen.queryByText('Manage Subscription')).not.toBeInTheDocument();
  });
});
