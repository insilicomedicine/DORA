import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { w3cwebsocket } from 'websocket';
import useMediaQuery from '@mui/material/useMediaQuery';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Router from '../../router';
import Header from '../Header';
import MobileReminder from './mobileReminder';
import ReconnectSnackbar from './ReconnectSnackbar';
import { useDocumentStore } from 'contexts/documentsStore';
import useUserStore from 'contexts/useUserStore';
import useSystemStore from 'contexts/useSystemStore';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';
import { useWebsocketStore } from 'contexts/useWebsocketStore';
import { useChatstore } from 'contexts/useChatstore';
import useGoogleTagManager from 'hooks/useGoogleTagManager';
import { useGATrackEvents } from 'hooks/useGATrackEvents';
import { getUserInfo } from 'services/user';
import { getDocument } from 'services/documents';
import { WebSocketResponseData } from 'types/constants';
import { checkMobileReminderVisibilityByPathname } from 'utils/utils';
import { convertToEditorDocument } from 'utils/document';
import { WS_PORT } from 'config/env';
import { theme } from 'theme';
interface MainContainerProps {
  children?: ReactNode;
}

const MainContainer = ({ children }: MainContainerProps) => {
  const location = useLocation();
  const nav = useNavigate();
  const [pageInfoLoading, setPageInfoLoading] = useState(true);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const retryCountRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const hasDismissedReconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const missedPongsRef = useRef(0);
  const [
    pathNameIsAllowedForMobileVersion,
    setPathNameIsAllowedForMobileVersion
  ] = useState(false);
  const { setCompletedDocument, setLogsData } = useDocumentStore();
  const { setIsChatHistoryReload, handleStreamEvent } = useChatstore();
  const { setUploadedFileUpdatesWS } = useWebsocketStore();
  const { setDocumentDetailData, setNewDocument } = useDocumentStore();
  const { setUserInfo } = useUserStore();
  const { fetchSystemInfo } = useSystemStore();
  const { updateFromWebSocket, setIsReload: isReviewInsightsReload } =
    useReviewInsightsStore();

  const mobileVersion = useMediaQuery(theme.breakpoints.down('md'));
  const clientRef = useRef<w3cwebsocket | null>(null);
  const currentDocumentIdRef = useRef<string | null>(null);

  const wsUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const hostname = window.location.hostname;
    const portValue = window.location.port;
    const port = portValue ? `:${WS_PORT || portValue}` : '';
    return `${protocol}://${hostname}${port}/ws/notifications/`;
  }, []);

  useEffect(() => {
    setPageInfoLoading(true);
    const fetchData = async () => {
      const userInfo = await getUserInfo();
      setUserInfo(userInfo);
      // If the user has logged in, fetch the user display preferences and system info
      if (userInfo.terms_and_privacy_accepted) {
        // Fetch system info using the new store
        fetchSystemInfo();
      }
      setPageInfoLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const rootPath = location.pathname.split('/')[1];
    setPathNameIsAllowedForMobileVersion(
      checkMobileReminderVisibilityByPathname(rootPath)
    );
    // Check if the pathname is a valid websocket path
    if (location.pathname.includes('/templates')) return;
    currentDocumentIdRef.current = location.pathname.split('/').pop() || null;
  }, [location.pathname]);

  const fetchAndSyncDocument = useCallback(
    async (id: string, type?: string, callback?: () => void) => {
      // TODO: need to optimize document generation and polishing process
      // updating only the section that has been polished or generated
      // not the whole document (currently the whole document will be updated)
      const isDocumentActived = currentDocumentIdRef.current === id;
      if (isDocumentActived) {
        setDocumentDetailData({ sectionStatusUpdated: false });
      }

      const documentData = await getDocument(id);
      if (!documentData) return;

      const { stage = '', status = '' } = documentData;
      const isDocumentGenerated = status === 'completed';
      const isPolishing = stage === 'polishing';
      const sectionStatusUpdated = type === 'section_status_updated';

      if (isDocumentGenerated || (sectionStatusUpdated && isPolishing)) {
        setCompletedDocument({ ...documentData });
      }

      if (!isDocumentActived) return;

      const bibliographyList = documentData?.bibliographies || [];
      // when document generation is completed, update the document data
      if (type === 'document_generated') {
        setDocumentDetailData({
          documentData: convertToEditorDocument(documentData, bibliographyList)
            .doc,
          bibliographyList,
          sectionStatusUpdated,
          isDocumentLoading: false
        });
        nav(`/documents/${id}`);
        return;
      }
      if (isPolishing) {
        setDocumentDetailData({
          documentData: convertToEditorDocument(documentData, bibliographyList)
            .doc,
          bibliographyList,
          sectionStatusUpdated,
          allSectionsPolished: false
        });

        return;
      }

      if (callback) {
        callback();
      }

      setDocumentDetailData({
        documentData: convertToEditorDocument(documentData, bibliographyList)
          .doc,
        bibliographyList,
        sectionStatusUpdated
      });
    },
    [setDocumentDetailData, setCompletedDocument, nav, setDocumentDetailData]
  );

  const sendPing = useCallback(
    (ws: w3cwebsocket, onPingTimeout?: () => void) => {
      if (ws.readyState === ws.OPEN) {
        try {
          // Send ping message
          ws.send(JSON.stringify({ type: 'ping' }));

          // Set timeout for pong response
          const PONG_TIMEOUT_MS = 10000; // Wait 10 seconds for pong
          pingTimeoutRef.current = setTimeout(() => {
            missedPongsRef.current += 1;

            // If we missed 3 consecutive pongs, close the connection to trigger retry
            const MAX_MISSED_PONGS = 3;
            if (missedPongsRef.current >= MAX_MISSED_PONGS) {
              ws.onclose = () => {};
              ws.close();
              if (onPingTimeout) {
                console.warn(
                  'No pong received after 3 pings, closing connection to retry'
                );
                onPingTimeout();
              }
            }
          }, PONG_TIMEOUT_MS);
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      }
    },
    []
  );

  const connectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Clear existing ping timeout
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (clientRef.current) {
      // Remove listener to prevent triggering onclose during intentional close
      clientRef.current.onclose = () => {};
      clientRef.current.close();
    }

    const ws = new w3cwebsocket(wsUrl);
    clientRef.current = ws;

    const handleClose = () => {
      // Clear heartbeat on close
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Clear ping timeout on close
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }

      // Retry delays in milliseconds (10s, 20s, 40s)
      const RETRY_DELAY_MS_1 = 10000;
      const RETRY_DELAY_MS_2 = 20000;
      const RETRY_DELAY_MS_3 = 40000;
      const RETRY_DELAYS = [
        RETRY_DELAY_MS_1,
        RETRY_DELAY_MS_2,
        RETRY_DELAY_MS_3
      ];
      // Retry connection
      if (retryCountRef.current < 3) {
        isReconnectingRef.current = true;
        const delay = RETRY_DELAYS[retryCountRef.current];

        reconnectTimeoutRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          connectWebSocket();
        }, delay);
      } else if (!hasDismissedReconnectRef.current) {
        setShowReconnectBanner(true);
      }

      // Reset missed pongs counter after handling retry logic
      missedPongsRef.current = 0;
    };

    ws.onopen = () => {
      // Reset last message time and missed pongs
      lastMessageTimeRef.current = Date.now();
      missedPongsRef.current = 0;

      // Start ping-pong heartbeat
      const PING_INTERVAL_MS = 30000; // Send ping every 30 seconds

      heartbeatIntervalRef.current = setInterval(() => {
        sendPing(ws, handleClose);
      }, PING_INTERVAL_MS);

      // Send initial ping
      sendPing(ws, handleClose);

      // If we are reconnecting, fetch the latest status
      if (isReconnectingRef.current) {
        // Update bibliography file list
        if (location.pathname === '/bibliography') {
          setUploadedFileUpdatesWS({
            pk: '',
            status: 'uploading',
            reload: true
          });
          return;
        }

        // Update review insights
        if (/^\/documents\/[^/]+$/.test(location.pathname)) {
          isReviewInsightsReload(true);
          return;
        }

        const currentId = currentDocumentIdRef.current;
        if (currentId) {
          fetchAndSyncDocument(currentId, undefined, () => {
            // Update chat history
            if (!/^\/documents\/generation\/[^/]+$/.test(location.pathname))
              return;
            setIsChatHistoryReload(true);
          });
        }
        isReconnectingRef.current = false;
      }
      // Reset retry count on successful connection
      retryCountRef.current = 0;
      setShowReconnectBanner(false);
    };

    ws.onmessage = (message: any) => {
      // Update last message time whenever we receive any message
      lastMessageTimeRef.current = Date.now();

      if (!message.data) return;
      const response = JSON.parse(message.data);

      // Handle pong response
      if (response?.type === 'pong') {
        // Clear the ping timeout and reset missed pongs counter
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        missedPongsRef.current = 0;
        return;
      }

      const responseData: WebSocketResponseData = response?.data || {};
      const { id, type = '', data } = responseData;
      const isDocumentActived = currentDocumentIdRef.current === id;

      // handle bibliography file processing
      if (type === 'bibliography_file_processing') {
        setUploadedFileUpdatesWS(responseData.file_data);
        return;
      }

      if (isDocumentActived) {
        // handle transparency logs
        if (type === 'generation_log_updated') {
          setLogsData(data || {});
          return;
        }

        // handle document review generated
        if (type === 'document_ai_review_generated') {
          updateFromWebSocket(data, data?.review_status);
          return;
        }

        // handle chat events
        if (type === 'chat_events') {
          if (!data) return;
          if (Array.isArray(data)) {
            data.forEach((evt: any) => handleStreamEvent(evt));
          } else {
            handleStreamEvent(data);
            // when the cot is generated, update the document status to in_progress
            data.type === 'cot' &&
              setNewDocument({
                id,
                status: 'in_progress'
              });
          }
          return;
        }
      }

      // handle document updates for both polishing and documentData generation
      fetchAndSyncDocument(id, type);
    };

    ws.onclose = handleClose;

    ws.onerror = (error: any) => {
      console.error('WebSocket error: ', error);
    };
  }, [wsUrl, sendPing]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.onclose = () => {};
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [connectWebSocket]);

  //Enable Google Analytics
  useGoogleTagManager();
  useGATrackEvents();

  const mobileReminderVisibilityCondition =
    mobileVersion && pathNameIsAllowedForMobileVersion;

  if (pageInfoLoading) {
    return null;
  }

  return (
    <Stack
      sx={{
        width: '100%',
        height: '100%',
        maxWidth: 1920,
        padding: { xs: 0, md: '0 8px 12px', bp1800: '0 40px 12px' },
        margin: '0 auto',
        backgroundColor: { xs: theme.palette?.common.white, md: '#FAFAFA' }
      }}
    >
      <Header />
      {mobileReminderVisibilityCondition ? (
        <MobileReminder />
      ) : (
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
          <Router />
          {children}
        </Box>
      )}
      <ReconnectSnackbar
        open={showReconnectBanner}
        onClose={() => {
          hasDismissedReconnectRef.current = true;
          setShowReconnectBanner(false);
        }}
      />
    </Stack>
  );
};

export default MainContainer;
