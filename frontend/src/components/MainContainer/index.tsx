import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { w3cwebsocket } from 'websocket';
import useMediaQuery from '@mui/material/useMediaQuery';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Router from '../../router';
import Header from '../Header';
import MobileReminder from './mobileReminder';
import { useDocumentStore } from 'contexts/documentsStore';
import useUserStore from 'contexts/useUserStore';
import useSystemStore from 'contexts/useSystemStore';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';
import { useWebsocketStore } from 'contexts/useWebsocketStore';
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
  const [pageInfoLoading, setPageInfoLoading] = useState(true);
  const [
    pathNameIsAllowedForMobileVersion,
    setPathNameIsAllowedForMobileVersion
  ] = useState(false);
  const { setDocumentDetailData } = useDocumentStore();
  const { setUserInfo } = useUserStore();
  const { fetchSystemInfo } = useSystemStore();
  const { updateFromWebSocket } = useReviewInsightsStore();
  const { setCompletedDocument, setLogsData } = useDocumentStore(
    (state) => state
  );
  const { setUploadedFileUpdatesWS } = useWebsocketStore();
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
    currentDocumentIdRef.current = location.pathname.split('/').pop() || null;
  }, [location.pathname]);

  useEffect(() => {
    if (clientRef.current) return;
    const ws = new w3cwebsocket(wsUrl);
    clientRef.current = ws;

    ws.onopen = () => {};
    ws.onmessage = (message: any) => {
      if (!message.data) return;
      const response = JSON.parse(message.data);
      const responseData: WebSocketResponseData = response?.data || {};
      const { id, type = '', data } = responseData;
      const isDocumentActived = currentDocumentIdRef.current === id;

      if (type === 'bibliography_file_processing') {
        setUploadedFileUpdatesWS(responseData.file_data);
        return;
      }
      //handle transparency logs
      if (type === 'generation_log_updated') {
        isDocumentActived && setLogsData(data || {});
        return;
      }

      // handle document review generated
      if (type === 'document_ai_review_generated') {
        if (isDocumentActived) {
          updateFromWebSocket(data, data?.review_status);
        }
        return;
      }

      //handle document updates for both polishing and documentData generation
      const updateDocumentData = async () => {
        //TODO: need to optimize document generation and polishing process
        //updating only the section that has been polished or generated
        //not the whole document (currently the whole document will be updated)
        isDocumentActived &&
          setDocumentDetailData({ sectionStatusUpdated: false });
        const documentData = await getDocument(id);
        if (!documentData) return;
        const { stage = '', status = '' } = documentData;
        const isDocumentGenerated = status === 'completed';
        const isPolishing = stage === 'polishing';
        const sectionStatusUpdated = type === 'section_status_updated';

        if (isDocumentGenerated || (sectionStatusUpdated && isPolishing)) {
          setCompletedDocument({ ...documentData });
        }

        if (isDocumentActived) {
          const bibliographyList = documentData?.bibliographies || [];
          if (isPolishing) {
            setDocumentDetailData({
              documentData: convertToEditorDocument(
                documentData,
                bibliographyList
              ).doc,
              bibliographyList,
              sectionStatusUpdated,
              allSectionsPolished: false
            });

            return;
          }
          setDocumentDetailData({
            documentData: convertToEditorDocument(
              documentData,
              bibliographyList
            ).doc,
            bibliographyList,
            sectionStatusUpdated
          });
          return;
        }
      };
      updateDocumentData();
    };
  }, [wsUrl]);

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
    </Stack>
  );
};

export default MainContainer;
