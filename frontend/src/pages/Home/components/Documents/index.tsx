import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { AddRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import NoData from './components/NoData';
import Document from './components/Document';
import { getDocuments } from 'services/documents';
import {
  useDeletedDocumentStore,
  useDocumentStore
} from 'contexts/documentsStore';
import DocumentsList from './components/DocumentsList';
import { DocumentViewMods } from 'types/document';
import { sendGA4Event } from 'utils/ga';
import { theme } from 'theme';

const loading = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
      <CircularProgress size={24} />
    </Box>
  );
};

interface DocumentsProps {
  mode: string;
}

const Documents = ({ mode }: DocumentsProps) => {
  const nav = useNavigate();

  const [isDocumentsLoading, setIsDocumentsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const completedDocument = useDocumentStore(
    (state) => state.completedDocument
  );
  const deletedDocumentId = useDeletedDocumentStore(
    (state) => state.deletedDocumentId
  );
  const [documentsData, setDocumentsData] = useState<any>({
    count: 1,
    list: [{ id: 'new', isNew: true }]
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const { list: documentList, cursor: documentCursor = undefined } =
    documentsData;
  const ratio = useMediaQuery(theme.breakpoints.up('xl')) ? 4 : 3;

  const getDocumentHiddenNum = () => {
    const count = Number(documentList.length) % ratio;
    return !!documentCursor || isFetchingMore ? count : 0;
  };

  const fetchDocuments = async (pageSize: number = 20) => {
    if (!documentCursor && documentCursor !== undefined) return;
    setIsFetchingMore(true);
    const response = await getDocuments(documentCursor, pageSize);
    setIsFetchingMore(false);
    if (!response) return;
    const { results = [], next: cursor = '' } = response;
    if (response.results?.length > 0) {
      setDocumentsData((prevData) => ({
        cursor,
        list: [...prevData.list, ...results]
      }));
    } else {
      setHasMore(false);
    }
  };

  useEffect(() => {
    const initialFetch = async () => {
      await fetchDocuments();
      setIsDocumentsLoading(false);
    };
    initialFetch();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const bottom =
        containerRef.current.scrollHeight - containerRef.current.scrollTop <=
        containerRef.current.clientHeight + 1;
      if (bottom && !isFetchingMore && hasMore) {
        setPageNumber((prevPage) => prevPage + 1);
      }
    }
  }, [isFetchingMore, hasMore]);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (currentRef) {
      currentRef.addEventListener('wheel', handleScroll);
      return () => currentRef.removeEventListener('wheel', handleScroll);
    }
  }, [containerRef, handleScroll]);

  useEffect(() => {
    if (pageNumber > 1) {
      fetchDocuments();
    }
  }, [pageNumber]);

  // Update the document list when document is completed or polished
  useEffect(() => {
    if (!completedDocument?.id) return;
    const newDocumentList = documentList.map((doc) => {
      if (completedDocument.id === doc.id) {
        return { ...doc, ...completedDocument };
      }
      return doc;
    });
    setDocumentsData((prevData) => ({
      count: prevData.count,
      list: newDocumentList
    }));
  }, [completedDocument?.id]);

  // Remove the deleted document from the list
  useEffect(() => {
    if (!deletedDocumentId) return;
    const newDocumentList = documentList.filter(
      (doc) => doc.id !== deletedDocumentId
    );
    setDocumentsData((prevData) => ({
      ...prevData,
      count: prevData.count - 1,
      list: newDocumentList
    }));
  }, [deletedDocumentId]);

  if (isDocumentsLoading) {
    return loading();
  }

  if (documentList.length <= 1)
    return (
      <NoData
        Actions={
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddRounded style={{ fontSize: 20, marginRight: -4 }} />}
            onClick={() => {
              sendGA4Event('new_document');
              nav(`/templates`);
            }}
            sx={{
              textTransform: 'none',
              fontSize: 16,
              p: ' 6px 20px 6px 16px'
            }}
          >
            New Document
          </Button>
        }
      />
    );

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        pb: 8,
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        gap: 2,
        marginTop: '30px'
      }}
    >
      {mode === DocumentViewMods.card && (
        <Grid
          container
          spacing={2}
          sx={{
            [`&>.MuiGrid-item:nth-last-of-type(-n+${getDocumentHiddenNum()})`]:
              {
                display: 'none'
              }
          }}
        >
          {documentList.map((doc) => (
            <Document key={doc.id} {...doc} />
          ))}
        </Grid>
      )}
      {mode === DocumentViewMods.column && (
        <DocumentsList documentList={documentList} />
      )}
      {isFetchingMore && loading()}
    </Box>
  );
};

export default memo(Documents);
