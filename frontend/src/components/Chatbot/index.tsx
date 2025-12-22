import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MessageItem from './MessageItem';
import Composer from './Composer';
import { useChatstore } from 'contexts/useChatstore';
import { getChatHistory } from 'services/chat';
import { sendMessageToChatbot } from 'services/documents';
import { useNavigate } from 'react-router';
import Title from 'pages/Home/components/EditorPanel/components/Logs/components/Title';
import DoraThinking from 'assets/icons/DoraThinking.gif';
import { useDocumentStore } from 'contexts/documentsStore';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { theme } from 'theme';

type ChatbotProps = {
  documentId?: string;
  templateId?: string;
  readOnly?: boolean;
};

function AnimatedDots() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        '& span': { animation: 'blink 1.4s infinite both' },
        '& span:nth-of-type(2)': { animationDelay: '0.2s' },
        '& span:nth-of-type(3)': { animationDelay: '0.4s' },
        '@keyframes blink': {
          '0%': { opacity: 0.2 },
          '20%': { opacity: 1 },
          '100%': { opacity: 0.2 }
        }
      }}
    >
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </Box>
  );
}

function DocumentGeneratingLoading() {
  return (
    <Stack
      sx={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 12,
        padding: '20px',
        width: '99%',
        bgcolor: 'common.white',
        borderBottom: '1px solid #EEE',
        borderRadius: 4,
        background: '#FFF',
        boxShadow: '0 1px 4px 1px rgba(0, 0, 0, 0.06)',
        gap: 1,
        zIndex: 100
      }}
    >
      <CircularProgress size={16} />
      <Typography variant="body2" color="text.secondary">
        Generating document...
      </Typography>
    </Stack>
  );
}

function DocumentGeneratingFailedAlert() {
  return (
    <Alert
      severity="error"
      sx={{
        position: 'absolute',
        bottom: 12,
        width: '100%',
        color: '#B71B1C',
        padding: '20px',
        borderRadius: 4,
        '& .MuiAlert-icon': {
          color: '#D32F2F',
          padding: 0,
          '& svg': {
            fontSize: 14
          }
        }
      }}
    >
      <Typography variant="body2">
        We couldn't create the file. Please try making a different document.
      </Typography>
    </Alert>
  );
}

function Chatbot({ documentId, templateId, readOnly = false }: ChatbotProps) {
  const nav = useNavigate();
  const [input, setInput] = useState('');
  const [isDraftGenerating, setIsDraftGenerating] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { newDocument, setIsNewDocument, setNewDocument } = useDocumentStore();
  const { messages, addUserMessage } = useChatstore();
  const [history, setHistory] = useState<any[]>([]);
  const isChatHistoryReload = useChatstore((s) => s.isChatHistoryReload);
  const hydrateHistory = useChatstore((s) => s.hydrateHistory);
  const clearHistory = useChatstore((s) => s.clearHistory);

  const {
    hasMessages,
    isChatCompleted,
    isCotProcessing,
    isDocumentGeneratingFailed,
    lastAssistantId,
    isThinking
  } = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    const hasMsgs = messages.length > 0 && !!documentId;
    const completed =
      !!lastMessage && lastMessage.role === 'assistant' && !!lastMessage.done;
    const cotProcessing = messages.some((m) => m.type === 'cot' && !m.done);
    const docGenFailed = messages.some((m) => m.type === 'error');
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    const thinking = !readOnly && !!lastMessage && lastMessage.role === 'user';
    return {
      hasMessages: hasMsgs,
      isChatCompleted: completed,
      isCotProcessing: cotProcessing,
      isDocumentGeneratingFailed: docGenFailed,
      lastAssistantId: lastAssistant?.id,
      isThinking: thinking
    };
  }, [messages, documentId, readOnly]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    addUserMessage(text);
    setIsDraftGenerating(true);
    const payload = {
      ...(templateId && { template_id: templateId }),
      ...(documentId && { document_id: documentId }),
      message: text
    } as const;

    const response = await sendMessageToChatbot(payload);
    if (!response) {
      setIsDraftGenerating(false);
      return;
    }
    if (templateId) {
      nav(`/documents/generation/${response.document_id}`);
      setNewDocument({
        ...newDocument,
        id: response.document_id,
        template_type: 'deepresearch',
        status: 'initialized'
      });
      setIsNewDocument(true);
    }
    if (!documentId) return;
    setInput('');
    setIsDraftGenerating(false);
  }, [
    input,
    addUserMessage,
    documentId,
    templateId,
    nav,
    setNewDocument,
    setIsNewDocument
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (isThinking) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isThinking]
  );

  const composerProps = {
    value: input,
    isDraftGenerating,
    onChange: setInput,
    onSend: handleSend,
    onKeyDown: handleKeyDown
  };

  useEffect(() => {
    if (readOnly || !hasMessages) return;
    endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, readOnly]);

  useEffect(() => {
    if (!documentId) return;
    const fetchHistory = async () => {
      const history = await getChatHistory(documentId);
      if (history && history.length > 0) {
        const historyData = readOnly ? history.slice(0, -1) : history;
        hydrateHistory(historyData);
        setHistory(historyData);
      }
    };
    setIsLoading(true);
    fetchHistory();
    setIsLoading(false);
    return () => {
      clearHistory();
    };
  }, [documentId, isChatHistoryReload, hydrateHistory]);

  useEffect(() => {
    if (!documentId) return;
    setInput('');
    setIsDraftGenerating(false);
  }, [documentId]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <>
      {isCotProcessing && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            bgcolor: 'common.white',
            borderBottom: '1px solid #EEE',
            zIndex: 100
          }}
        >
          <Title name={'Deep research'} generatingTime={15} variant="caption" />
        </Box>
      )}
      <Box
        sx={{
          position: 'relative',
          ...(!readOnly && {
            width: 768
          }),
          pb: 1.5,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          bgcolor: 'common.white',
          [theme.breakpoints.down('lg')]: {
            width: 'auto'
          }
        }}
      >
        {readOnly && (
          <Typography fontWeight={500} sx={{ mb: 1 }}>
            Chat History
          </Typography>
        )}
        <Stack
          sx={{
            flex: 1,
            gap: 4,
            justifyContent: hasMessages ? 'flex-start' : 'center',
            alignItems: hasMessages ? 'stretch' : 'center',
            scrollbarWidth: 'none',
            ...(hasMessages && {
              px: 2,
              pt: isCotProcessing ? 5 : 3,
              overflow: 'auto'
            }),
            ...(readOnly
              ? { border: '1px solid #eee', borderRadius: 2 }
              : { pb: '60px' })
          }}
        >
          {hasMessages ? (
            <>
              {messages.map((m) => (
                <MessageItem
                  key={m.id + m.role}
                  message={m}
                  readOnly={readOnly}
                  isThinking={isThinking}
                  animate={
                    m.id === lastAssistantId &&
                    !history.find((h) => h.id === m.id)
                  }
                />
              ))}
              {isThinking && (
                <>
                  <Typography
                    fontWeight={500}
                    sx={{
                      px: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <img
                      src={DoraThinking}
                      alt="Dora Thinking"
                      width={20}
                      height={20}
                    />
                    <span>
                      Thinking
                      <AnimatedDots />
                    </span>
                  </Typography>
                </>
              )}
              <div ref={endRef} />
            </>
          ) : (
            !readOnly &&
            !documentId && (
              <Box sx={{ width: '100%', maxWidth: 768, textAlign: 'center' }}>
                <Typography variant="h5" lineHeight={1.5} mb={7}>
                  What are you writing about?
                </Typography>
                <Composer {...composerProps} isChatCompleted={true} />
              </Box>
            )
          )}
          {isDocumentGeneratingFailed && <DocumentGeneratingFailedAlert />}
        </Stack>
        {isCotProcessing && <DocumentGeneratingLoading />}
        {hasMessages &&
          !readOnly &&
          !isCotProcessing &&
          !isDocumentGeneratingFailed && (
            <Composer {...composerProps} isChatCompleted={isChatCompleted} />
          )}
      </Box>
    </>
  );
}

export default Chatbot;
