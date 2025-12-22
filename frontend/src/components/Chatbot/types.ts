export type ChatRole = 'user' | 'assistant';
export type ChatCot = {
  title: string;
  content: string;
};

// Chat message data
export type ChatMessage = {
  id?: string; // optional, for tracking
  type: 'message' | 'cot' | 'error';
  content: string; // the message content
  done?: boolean; // true if the message is done
  role: ChatRole;
  cot?: ChatCot[]; // when type is 'cot', the cot message
  error?: string; // if encountered an error, e.g., 'xxxxxxxx'
};
