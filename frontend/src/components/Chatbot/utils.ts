import { ChatMessage } from './types';

export const ID_RADIX = 36;
export const STREAMING_DELAY_MS = 50; // Increased for better visibility

export function generateMockResponseText(userContent: string): string {
  const trimmed = userContent.trim().toLowerCase();
  if (!trimmed) return 'Hello! Ask me anything about your documents.';

  if (/^(hi|hello|hey|greetings)/.test(trimmed)) {
    return "Hello! I'm your AI assistant. How can I help you today? I can help you with document generation, research, templates, and more.";
  }
  if (/what can you|help me|your capabilities|what do you do/.test(trimmed)) {
    return 'I can assist you with:\n\n1. Document generation and research\n2. Finding and using templates\n3. Managing bibliographies and references\n4. Answering questions about your documents\n5. General research and information queries\n\nWhat would you like help with?';
  }
  if (/template|layout|format/.test(trimmed)) {
    return 'I can help you with templates! We have various templates for different types of documents including academic papers, reports, presentations, and more. You can browse available templates in the Templates section. Would you like me to suggest a template for a specific type of document?';
  }
  if (/generate|create|write|document|paper/.test(trimmed)) {
    return 'I can help you generate documents! To get started, you can:\n\n1. Choose a template from our library\n2. Provide your research topic or requirements\n3. Add custom bibliographies if needed\n\nThe system will generate a well-structured document based on your inputs. What type of document would you like to create?';
  }
  if (/research|study|investigate|analyze/.test(trimmed)) {
    return 'I can assist with your research! I can help you:\n\n• Find relevant sources and references\n• Analyze research topics\n• Organize your findings\n• Generate literature reviews\n\nWhat research topic are you working on?';
  }
  if (/bibliography|reference|citation|source/.test(trimmed)) {
    return 'For bibliographies and references, I can help you:\n\n• Add custom bibliography files\n• Manage previously uploaded files\n• Format citations properly\n• Organize your references\n\nYou can upload bibliography files in various formats including BibTeX, RIS, and more. Would you like guidance on adding references?';
  }
  if (/thank|thanks|appreciate/.test(trimmed)) {
    return "You're welcome! If you have any other questions or need further assistance, feel free to ask. I'm here to help!";
  }
  if (/how to|how do|how can/.test(trimmed)) {
    return `Great question! Regarding "${userContent}", here's what I can tell you:\n\nThe process typically involves a few key steps. First, you'll want to gather your requirements and understand what you're trying to achieve. Then, you can use the appropriate tools and features available in the system.\n\nWould you like me to provide more specific guidance on this topic?`;
  }
  const responses = [
    `That's an interesting point about "${userContent}". Let me provide some insights.\n\nBased on my understanding, this relates to several key aspects of document management and generation. I can help you explore this further and provide more detailed information.\n\nWould you like me to elaborate on any specific aspect?`,
    `I understand you're asking about "${userContent}".\n\nThis is a great topic! In the context of our document generation system, there are several ways to approach this. I can guide you through the process step by step.\n\nWhat specific aspect would you like to focus on?`,
    `Regarding "${userContent}", here's what I can help you with:\n\nThere are multiple factors to consider here. The system is designed to handle various scenarios efficiently, and I can provide guidance tailored to your specific needs.\n\nFeel free to ask follow-up questions if you need more details!`,
    `Let me help you with "${userContent}".\n\nThis is a common query, and I'm glad you asked! The best approach depends on your specific requirements. I can walk you through the available options and help you choose the most suitable one.\n\nWhat's your use case or goal here?`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function tokenizeTextToChunks(text: string): string[] {
  const words: string[] = [];
  const parts = text.split(' ');
  parts.forEach((part, index) => {
    if (part) {
      words.push(part);
      if (index < parts.length - 1) {
        words.push(' ');
      }
    }
  });
  return words;
}

export function buildChunkEvent(messageId: string, chunk: string): ChatMessage {
  return {
    type: 'message',
    role: 'assistant',
    id: messageId,
    content: chunk,
    done: false,
    cot: [
      {
        title: '',
        content: ''
      }
    ]
  };
}

export function buildDoneEvent(
  messageId: string,
  finishReason: string = 'stop'
): ChatMessage {
  return {
    type: 'message',
    role: 'assistant',
    id: messageId,
    done: true,
    content: finishReason
  };
}

// Clean tokenization for smooth markdown animation
export function createAnimationTokens(text: string): string[] {
  const tokens: string[] = [];
  let currentIndex = 0;

  // Markdown patterns that should be consumed as complete units
  const markdownPatterns = [
    /^#{1,6}\s[^\n]*/, // Headers
    /^\*\*[^*]+\*\*/, // Bold
    /^\*[^*\n]+\*/, // Italic
    /^`[^`\n]+`/, // Inline code
    /^```[\s\S]*?```/, // Code blocks
    /^\[[^\]]+\]\([^)]+\)/, // Links
    /^!\[[^\]]*\]\([^)]+\)/, // Images
    /^>\s[^\n]*/, // Blockquotes
    /^[-*+]\s[^\n]*/, // List items
    /^\d+\.\s[^\n]*/ // Numbered lists
  ];

  while (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    let matched = false;

    // Check for markdown patterns first
    for (const pattern of markdownPatterns) {
      const match = remainingText.match(pattern);
      if (match) {
        tokens.push(match[0]);
        currentIndex += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Extract next word or whitespace
      const wordMatch = remainingText.match(/^\S+|\s+/);
      if (wordMatch) {
        tokens.push(wordMatch[0]);
        currentIndex += wordMatch[0].length;
      } else {
        // Fallback: single character
        tokens.push(remainingText[0]);
        currentIndex++;
      }
    }
  }

  return tokens;
}
