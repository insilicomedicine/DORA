import { useState, useEffect, useCallback, useRef } from 'react';
import { getBibliographyFiles } from 'services/files';
import { BibliographyFile } from '../../../types';

interface UseFilesTableDataProps {
  onFilesLoaded?: (files: BibliographyFile[]) => void;
  isDialogOpen: boolean;
  ordering?: string;
}

interface UseFilesTableDataReturn {
  data: BibliographyFile[];
  loadingData: boolean;
  loadingMore: boolean;
  hasMoreData: boolean;
  nextCursor: string;
  loadFiles: (cursor?: string) => Promise<void>;
  setLoadingMore: (loading: boolean) => void;
}

const useFilesTableData = ({
  onFilesLoaded,
  isDialogOpen,
  ordering = '-created_at'
}: UseFilesTableDataProps): UseFilesTableDataReturn => {
  const [data, setData] = useState<BibliographyFile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [nextCursor, setNextCursor] = useState<string>('');
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialLoadPerformedRef = useRef(false);
  const orderingRef = useRef(ordering);
  const filesLoadedRef = useRef(false);

  // Update the ref when ordering changes
  useEffect(() => {
    orderingRef.current = ordering;
  }, [ordering]);

  const loadFiles = useCallback(async (cursor: string = '') => {
    const isInitialLoad = cursor === '';
    // If it's an initial load and we've already done it, don't do it again
    if (isInitialLoad && initialLoadPerformedRef.current && !cursor) {
      return;
    }

    if (isInitialLoad) {
      setLoadingData(true);
    } else {
      setLoadingMore(true);
    }

    const response = await getBibliographyFiles({
      pageSize: 50,
      cursor,
      status: 'processed',
      ordering: orderingRef.current
    });

    const { results = [], next } = response?.data || {};

    setLoadingData(false);
    setLoadingMore(false);

    if (!results) {
      setHasMoreData(false);
      return;
    }

    if (isInitialLoad) {
      initialLoadPerformedRef.current = true;
      setData(results);
      filesLoadedRef.current = true;
    } else {
      setData((prevData) => {
        const newData = [...prevData, ...results];
        filesLoadedRef.current = true;
        return newData;
      });
    }

    // Update cursor state for next load
    setNextCursor(next || '');
    setHasMoreData(!!next);
  }, []);

  // Use useEffect to notify parent about loaded files
  useEffect(() => {
    if (onFilesLoaded && data.length > 0 && filesLoadedRef.current) {
      onFilesLoaded(data);
      filesLoadedRef.current = false;
    }
  }, [data, onFilesLoaded]);

  useEffect(() => {
    // Only reset and load when dialog opens
    if (isDialogOpen) {
      // Reset pagination state and initial load flag
      initialLoadPerformedRef.current = false;
      setData([]);
      setNextCursor('');
      setHasMoreData(true);
      loadFiles();
    }

    return () => {
      // Cleanup when dialog closes
      setData([]);
    };
  }, [isDialogOpen, loadFiles]);

  // Add a separate effect for ordering changes
  useEffect(() => {
    // Only reload data when ordering changes and dialog is already open
    if (isDialogOpen && initialLoadPerformedRef.current) {
      // Reset pagination state but keep the dialog open flag
      setData([]);
      setNextCursor('');
      setHasMoreData(true);
      initialLoadPerformedRef.current = false;
      loadFiles();
    }
  }, [ordering, isDialogOpen, loadFiles]);

  return {
    data,
    loadingData,
    loadingMore,
    hasMoreData,
    nextCursor,
    loadFiles,
    setLoadingMore
  };
};

export default useFilesTableData;
