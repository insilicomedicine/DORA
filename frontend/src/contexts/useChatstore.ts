import { create } from 'zustand';
import { ID_RADIX } from 'components/Chatbot/utils';
import type {
  ChatMessage as UIChatMessage,
  ChatRole,
  ChatMessage
} from 'components/Chatbot/types';

type ChatState = {
  conversationId: string;
  messages: UIChatMessage[];
  isChatHistoryReload: boolean;

  // Actions
  reset: () => void;
  setIsChatHistoryReload: (isChatHistoryReload: boolean) => void;
  addUserMessage: (content: string) => string; // returns message id
  handleStreamEvent: (evt: ChatMessage) => void;
  hydrateHistory: (history: Array<UIChatMessage | ChatMessage>) => void;
  clearHistory: () => void;
};

export const useChatstore = create<ChatState>((set, get) => ({
  conversationId: Math.random().toString(ID_RADIX).slice(2),
  messages: [],
  isChatHistoryReload: false,
  reset: () => {
    set({
      messages: [],
      conversationId: Math.random().toString(ID_RADIX).slice(2)
    });
  },
  setIsChatHistoryReload: (isChatHistoryReload: boolean) => {
    set({ isChatHistoryReload });
  },
  addUserMessage: (content: string) => {
    const id = Math.random().toString(ID_RADIX).slice(2);
    const userMsg: UIChatMessage = {
      id,
      role: 'user',
      content,
      type: 'message',
      done: true
    };
    set((state) => ({ messages: [...state.messages, userMsg] }));
    return id;
  },

  handleStreamEvent: (evt: ChatMessage) => {
    const { id: messageId, content = '', done = false, role, cot, type } = evt;
    const assistantRole: ChatRole = role || 'assistant';
    const id = messageId || get().conversationId;

    set((state) => {
      const list = [...state.messages];
      const last = list[list.length - 1];

      // Append or create assistant streaming message
      if (!last || last.role !== 'assistant' || last.done || last.id !== id) {
        return {
          messages: [
            ...list,
            {
              id,
              role: assistantRole,
              content,
              done,
              type: type || 'message',
              cot: cot as UIChatMessage['cot']
            } as UIChatMessage
          ]
        };
      }

      // Update existing assistant message
      const updated = {
        ...last,
        content: last.content + content,
        done,
        cot: (cot as UIChatMessage['cot']) ?? last.cot
      } as UIChatMessage;

      return {
        messages: [...list.slice(0, -1), updated]
      };
    });
  },

  hydrateHistory: (history: Array<UIChatMessage | ChatMessage>) => {
    if (!Array.isArray(history) || history.length === 0) return;

    const mapToUI = (item: UIChatMessage | ChatMessage): UIChatMessage => {
      const fallbackId = Math.random().toString(ID_RADIX).slice(2);
      return {
        id: item.id || fallbackId,
        role: item.role || 'assistant',
        content: item.content || '',
        type: (item as ChatMessage).type ?? 'message',
        done: item.done ?? true,
        cot: item.cot as UIChatMessage['cot']
      };
    };

    const mapped = history.map(mapToUI);
    set({
      messages: mapped
    });
  },
  clearHistory: () => {
    set({
      messages: []
    });
  }
}));

export default useChatstore;
