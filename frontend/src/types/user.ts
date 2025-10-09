export const EmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export type UserPlanStatus = 'active' | 'past_due' | 'canceled';
export type SubscriptionStatus = 'free' | 'expired' | UserPlanStatus;
export interface UserPlan {
  name: string;
  type: string;
  status: UserPlanStatus;
  end_date: string;
  remaining_documents: number | null;
  cancel_at_period_end?: boolean;
}

export interface UserInfo {
  email: string;
  is_internal?: boolean;
  customerPortal?: string;
  terms_and_privacy_accepted?: boolean;
  in_progress_documents?: number;
  total_documents?: number;
  plan?: UserPlan;
}

export interface PlanStatus {
  isFree: boolean;
  isAdvanced: boolean;
  isPro: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  isExpired: boolean;
  isPaidPlanExpired: boolean;
  isReachedLimit: boolean;
  isLimited: boolean;
  isPlanReachedLimit: boolean;
  subscriptionStatus: string;
  remainingDocuments?: number | null;
  inProgressDocuments?: number;
  endDate?: string;
  limitType?: string;
  limitInfos?: Record<string, any>;
}

export type SubscriptionStatusInfo = {
  text: string;
  color: string;
  bgColor: string;
};

const subscriptionStatusInfo: Record<string, SubscriptionStatusInfo> = {
  active: { text: 'Renews', color: '#005231', bgColor: '#DAF5EA' },
  free: { text: 'Ends', color: '#8A4908', bgColor: '#FFEBC2' },
  expired: { text: 'Expired', color: '#621B16', bgColor: '#FEECEB' },
  canceled: { text: 'Expires', color: '#8A4908', bgColor: '#FFEBC2' }
};

const userPlanInfo: Record<
  string,
  { name?: string; remainingDocumentsText?: string }
> = {
  free: { name: 'Free trial' },
  professional: { remainingDocumentsText: 'Unlimited documents' }
};

export { subscriptionStatusInfo, userPlanInfo };
export type GAUserType =
  | 'unknown'
  | 'internal'
  | 'external_trial'
  | 'external_paid';

export type GAUserPlan =
  | 'advanced'
  | 'professional'
  | 'free'
  | 'expired'
  | 'null';

export type CitationSettings = {
  article_types: string[];
  publication_date?: string;
  top_cited?: boolean;
};
