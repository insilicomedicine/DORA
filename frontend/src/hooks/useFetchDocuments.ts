import {
  useDeletedDocumentStore,
  useDocumentStore
} from 'contexts/documentsStore';
import { useState, useEffect, useCallback } from 'react';
import { getDocuments } from 'services/documents';

const useFetchDocuments = (loadInitial = true): any => {
  const [isDocumentsLoading, setIsDocumentsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [documentsData, setDocumentsData] = useState<any>({
    count: 0,
    list: [],
    cursor: null
  });
  const [polishingDocument, setPolishingDocument] = useState<any>(null);

  const { list: documentList, cursor: documentCursor = null } = documentsData;

  const {
    completedDocument,
    clearCompletedDocument,
    updatedDocument,
    clearUpdatedDocument
  } = useDocumentStore((state) => state);

  const { deletedDocumentId, clearDeletedDocumentId } = useDeletedDocumentStore(
    (state) => state
  );

  // Initial data fetch
  const initialFetch = useCallback(async () => {
    setIsDocumentsLoading(true);

    const response = await getDocuments();
    setIsDocumentsLoading(false);
    if (!response) return;

    const { results = [], next: cursor = '' } = response;
    setDocumentsData({
      cursor,
      list: results
    });

    setHasMore(cursor !== '');
  }, []);

  // Load more function for pagination
  const loadMore = useCallback(async () => {
    // Safety checks
    if (isLoadingMore || !hasMore || !documentCursor) return Promise.resolve();

    setIsLoadingMore(true);

    const response = await getDocuments(documentCursor);
    setIsLoadingMore(false);

    if (!response) return Promise.resolve();
    const { results = [], next: cursor = '' } = response;
    if (results.length > 0) {
      setDocumentsData((prevData) => ({
        cursor,
        list: [...prevData.list, ...results]
      }));
    }

    setHasMore(cursor !== '');
    return Promise.resolve();
  }, [documentCursor, hasMore, isLoadingMore]);

  // Initial load
  useEffect(() => {
    if (loadInitial) {
      initialFetch();
    }
  }, [loadInitial, initialFetch]);

  // Handle document status updates
  useEffect(() => {
    if (!completedDocument?.id && !updatedDocument?.id) return;

    const processDocument = (docToProcess) => {
      const { id, stage, status } = docToProcess;
      const isPaperGenerated = status === 'completed';
      const isPolishing = stage === 'polishing';

      if (isPaperGenerated && isPolishing) {
        setPolishingDocument(docToProcess);
      }

      return documentList.map((doc) =>
        doc.id === id ? { ...doc, ...docToProcess } : doc
      );
    };

    let newDocumentList = documentList;

    if (completedDocument?.id) {
      newDocumentList = processDocument(completedDocument);
      clearCompletedDocument();
    }

    if (updatedDocument?.id) {
      newDocumentList = processDocument(updatedDocument);
      clearUpdatedDocument();
    }

    setDocumentsData((prevData) => ({
      ...prevData,
      list: newDocumentList
    }));
  }, [completedDocument?.id, updatedDocument?.id]);

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
    clearDeletedDocumentId();
  }, [deletedDocumentId]);

  return {
    documentList,
    setDocumentsData,
    isDocumentsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    polishingDocument,
    setPolishingDocument
  };
};

export default useFetchDocuments;
