import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import usePlanStatus from '../usePlanStatus';
import { UserInfo, PlanStatus } from 'types/user';
import { useUserStore } from 'contexts/useUserStore';

// Mock the useUserStore
vi.mock('contexts/useUserStore', () => ({
  useUserStore: vi.fn()
}));

const mockUseUserStore = vi.mocked(useUserStore);

// Helper component to test the hook
const TestComponent = () => {
  const planStatus = usePlanStatus();
  return <div data-testid="plan-status">{JSON.stringify(planStatus)}</div>;
};

const mockUserStore = (userInfo: UserInfo) => {
  mockUseUserStore.mockReturnValue({
    userInfo,
    setUserInfo: vi.fn(),
    updateUserInfo: vi.fn(),
    clearUserInfo: vi.fn()
  });
};

describe('usePlanStatus', () => {
  const testUsePlanStatus = (
    userInfo: UserInfo,
    expectedStatus: PlanStatus
  ) => {
    mockUserStore(userInfo);

    render(<TestComponent />);

    const result = JSON.parse(
      screen.getByTestId('plan-status').textContent || '{}'
    );
    expect(result).toEqual({
      ...expectedStatus,
      limitType: expectedStatus.isExpired ? 'expired' : userInfo.plan?.type
    });
  };

  it('should return correct status for free plan', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'active',
          type: 'free',
          remaining_documents: 10,
          cancel_at_period_end: false,
          name: 'Free Plan',
          end_date: '2024-01-01'
        }
      },
      {
        isFree: true,
        isPro: false,
        isPastDue: false,
        isAdvanced: false,
        isCanceled: false,
        isExpired: false,
        isPaidPlanExpired: false,
        isReachedLimit: false,
        isLimited: false,
        isPlanReachedLimit: false,
        subscriptionStatus: 'free',
        endDate: '2024-01-01',
        inProgressDocuments: 0,
        remainingDocuments: 10,
        limitInfos: {
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });

  it('should return correct status for advanced plan with no remaining documents', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'active',
          type: 'advanced',
          remaining_documents: 0,
          cancel_at_period_end: false,
          name: 'Advanced Plan',
          end_date: '2024-01-01'
        }
      },
      {
        isFree: false,
        isPro: false,
        isPastDue: false,
        isAdvanced: true,
        isCanceled: false,
        isExpired: false,
        isPaidPlanExpired: false,
        isReachedLimit: true,
        isLimited: true,
        isPlanReachedLimit: true,
        subscriptionStatus: 'active',
        endDate: '2024-01-01',
        inProgressDocuments: 0,
        remainingDocuments: 0,
        limitInfos: {
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });

  it('should return correct status for canceled (expired) advanced plan', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'canceled',
          type: 'advanced',
          remaining_documents: 0,
          cancel_at_period_end: false,
          name: 'Advanced Plan',
          end_date: '2023-12-01'
        }
      },
      {
        isFree: false,
        isPro: false,
        isPastDue: false,
        isAdvanced: true,
        isCanceled: false,
        isExpired: true,
        isPaidPlanExpired: true,
        isReachedLimit: true,
        isLimited: true,
        isPlanReachedLimit: true,
        subscriptionStatus: 'expired',
        endDate: '2023-12-01',
        inProgressDocuments: 0,
        remainingDocuments: 0,
        limitInfos: {
          expired: {
            document: 'Editing documents is unavailable due to expired plan.',
            export: 'Export is not available due to expired plan.'
          },
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });

  it('should return correct status for professional plan', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'active',
          type: 'professional',
          remaining_documents: 5,
          cancel_at_period_end: false,
          name: 'Professional Plan',
          end_date: '2024-06-01'
        }
      },
      {
        isFree: false,
        isPro: true,
        isAdvanced: false,
        isPastDue: false,
        isCanceled: false,
        isExpired: false,
        isPaidPlanExpired: false,
        isReachedLimit: false,
        isLimited: false,
        isPlanReachedLimit: false,
        subscriptionStatus: 'active',
        endDate: '2024-06-01',
        inProgressDocuments: 0,
        remainingDocuments: 5,
        limitInfos: {
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });

  it('should return correct status for canceled plan', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'active',
          type: 'professional',
          remaining_documents: 5,
          cancel_at_period_end: true,
          name: 'Professional Plan',
          end_date: '2024-01-01'
        }
      },
      {
        isFree: false,
        isPro: true,
        isAdvanced: false,
        isPastDue: false,
        isCanceled: true,
        isExpired: false,
        isPaidPlanExpired: false,
        isReachedLimit: false,
        isLimited: false,
        isPlanReachedLimit: false,
        subscriptionStatus: 'canceled',
        endDate: '2024-01-01',
        inProgressDocuments: 0,
        remainingDocuments: 5,
        limitInfos: {
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });

  it('should return correct status for past due plan', () => {
    testUsePlanStatus(
      {
        email: 'test@example.com',
        plan: {
          status: 'past_due',
          type: 'professional',
          remaining_documents: 5,
          cancel_at_period_end: false,
          name: 'Professional Plan',
          end_date: '2024-01-01'
        }
      },
      {
        isFree: false,
        isAdvanced: false,
        isPro: true,
        isPastDue: true,
        isCanceled: false,
        isExpired: true,
        isPaidPlanExpired: true,
        isReachedLimit: false,
        isLimited: true,
        isPlanReachedLimit: false,
        subscriptionStatus: 'expired',
        endDate: '2024-01-01',
        inProgressDocuments: 0,
        remainingDocuments: 5,
        limitInfos: {
          expired: {
            document: 'Editing documents is unavailable due to expired plan.',
            export: 'Export is not available due to expired plan.'
          },
          free: 'Editing documents is unavailable.'
        }
      }
    );
  });
});
