export const pathnamesArrayAllowedForMobileVersion = [
  'login',
  'signup',
  'accounts',
  'reset-password',
  'password-recovery'
];

// WebSocket message type
export type WebSocketMessageType =
  | 'bibliography_file_processing'
  | 'generation_log_updated'
  | 'document_ai_review_generated'
  | 'section_status_updated'
  | 'document_polish_updated'
  | 'document_generated' // document generation completed
  | 'chat_events' // chat events
  | 'pong';

// WebSocket response data
export interface WebSocketResponseData extends Record<string, any> {
  id: string;
  type: WebSocketMessageType;
  data?: any;
}

export type PaginatedResponse<T> = {
  results: T[];
  next: string | null;
  previous?: string | null;
  count?: number;
};
