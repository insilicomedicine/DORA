import { memo, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChatMessage } from './types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CotList from './CotList';
import DoraThinking from 'assets/icons/DoraThinking.gif';
import DoraIcon from 'assets/icons/DoraIcon.svg?react';
import { createAnimationTokens } from './utils';
import './markdown.scss';

// Animation constants
const ANIMATION_PROGRESS_SLOW_THRESHOLD_START = 0.2;
const ANIMATION_PROGRESS_SLOW_THRESHOLD_END = 0.8;
const ANIMATION_DELAY_SLOW = 40;
const ANIMATION_DELAY_FAST = 15;
const ANIMATION_INITIAL_DELAY = 30;

interface MessageItemProps {
  message: ChatMessage;
  readOnly?: boolean;
  animate?: boolean;
  isThinking?: boolean;
}

const MessageItem = ({
  message,
  readOnly = false,
  animate
}: MessageItemProps) => {
  const isUser = message.role === 'user';
  const isCot = message.type === 'cot';
  const [displayedContent, setDisplayedContent] = useState(
    isUser || !animate ? message.content : ''
  );
  const cotContainerRef = useRef<HTMLDivElement | null>(null);

  // Animation effect for typing out assistant messages character by character
  useEffect(() => {
    if (isUser || !animate || !message.content) {
      setDisplayedContent(message.content || '');
      return;
    }

    const tokens = createAnimationTokens(message.content);
    setDisplayedContent('');

    let currentTokenIndex = 0;
    let timeoutId: number;

    const animateNextToken = () => {
      if (currentTokenIndex >= tokens.length) return;

      // Build content from completed tokens
      const content = tokens.slice(0, currentTokenIndex + 1).join('');
      setDisplayedContent(content);

      // Calculate delay based on animation progress
      const progress = currentTokenIndex / tokens.length;
      const baseDelay =
        progress < ANIMATION_PROGRESS_SLOW_THRESHOLD_START ||
        progress > ANIMATION_PROGRESS_SLOW_THRESHOLD_END
          ? ANIMATION_DELAY_SLOW
          : ANIMATION_DELAY_FAST; // Slower at start/end
      const randomDelay = Math.random() * 20 + baseDelay;

      currentTokenIndex++;
      timeoutId = window.setTimeout(animateNextToken, randomDelay);
    };

    // Start animation
    timeoutId = window.setTimeout(animateNextToken, ANIMATION_INITIAL_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [animate, isUser, message.content]);

  useEffect(() => {
    const el = cotContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [message.cot?.length]);

  if (isUser) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'flex-end',
          justifyContent: 'flex-end'
        }}
      >
        <Box
          sx={{
            maxWidth: 512,
            pb: 0.5,
            padding: '12px 20px',
            borderRadius: 4,
            bgcolor: readOnly ? '#D2F7E5' : 'primary.light'
          }}
        >
          <Box sx={{ whiteSpace: 'pre-wrap' }}>{displayedContent}</Box>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack
      sx={{
        ...(!isCot && { flexDirection: 'row' }),
        minWidth: '100%',
        alignItems: 'flex-start'
      }}
    >
      <Stack direction="row" sx={{ pt: 0.25, mr: 1, gap: 1 }}>
        {isCot ? (
          <>
            <img
              src={DoraThinking}
              alt="Dora Thinking"
              width={20}
              height={20}
            />
            <span>
              Thinking
              <span style={{ animation: 'blink 1.4s infinite' }}>...</span>
            </span>
          </>
        ) : (
          <DoraIcon />
        )}
      </Stack>
      <Box
        sx={{
          pb: 0.5,
          color: 'text.primary',
          position: 'relative',
          userSelect: 'text',
          borderRadius: 4
        }}
      >
        {!isCot && (
          <Box sx={{ whiteSpace: 'pre-wrap' }} className="chat-markdown">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <Typography variant="body1" {...props} />
                )
              }}
              remarkPlugins={[remarkGfm]}
            >
              {displayedContent}
            </ReactMarkdown>
          </Box>
        )}

        {!!message.cot?.length && (
          <Stack sx={{ position: 'relative' }}>
            <Box
              sx={{
                background:
                  'linear-gradient(180deg, #FFF 12.5%, rgba(255, 255, 255, 0.00) 100%)',
                height: 8,
                padding: 0.5,
                width: '100%',
                position: 'absolute',
                top: 6,
                left: 0
              }}
            />
            <Box
              sx={{
                marginTop: 1,
                maxHeight: 467,
                overflowY: 'auto',
                scrollbarWidth: 'none'
              }}
              ref={cotContainerRef}
            >
              <CotList list={message.cot!} />
            </Box>
          </Stack>
        )}
      </Box>
    </Stack>
  );
};

export default memo(MessageItem);
