import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
  memo
} from 'react';
import {
  Table,
  TableBody,
  TableContainer,
  Box,
  CircularProgress,
  Stack
} from '@mui/material';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import { Column, BibliographyFile } from '../../types';
import useFilesTableData from './hooks/useFilesTableData';
import useFilesSelection from './hooks/useFilesSelection';
import useSortedData from './hooks/useSortedData';
import CustomTableHead from './TableHead';
import FileRow from './TableRow';
import LoadingRow from './LoadingRow';
import SentinelRow from './SentinelRow';
import NoFiles from './NoFiles';

interface FilesTableProps {
  selectedFilesIndexes: number[];
  setSelectedFilesIndexes: (indexes: number[]) => void;
  onFilesLoaded?: (files: BibliographyFile[]) => void;
  onTemporarySelectionChange?: (count: number, indexes: number[]) => void;
  filesToAdd?: BibliographyFile[];
  filesFromPreviouslyUploadedDialog?: BibliographyFile[];
  isDialogOpen: boolean;
}

const FilesTable = ({
  selectedFilesIndexes,
  setSelectedFilesIndexes,
  onFilesLoaded,
  onTemporarySelectionChange,
  filesToAdd = [],
  filesFromPreviouslyUploadedDialog = [],
  isDialogOpen
}: FilesTableProps) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreInvokedRef = useRef(false);
  const [scrollTriggeredState, setScrollTriggeredState] = useState(false);
  const [ordering, setOrdering] = useState('-created_at');

  // Define table columns
  const columns = useMemo<Column[]>(
    () => [
      {
        id: 'name',
        label: 'Name',
        sortable: true
      },
      {
        id: 'created_at',
        label: 'Added',
        sortable: true
      }
    ],
    []
  );

  // Handle changes to ordering for server-side sorting
  const handleOrderingChange = useCallback((newOrdering: string) => {
    setOrdering(newOrdering);
  }, []);

  // Use custom hooks for data management
  const { data, loadingData, loadingMore, hasMoreData, nextCursor, loadFiles } =
    useFilesTableData({
      onFilesLoaded,
      isDialogOpen,
      ordering
    });

  const { sortedData, orderBy, order, handleSort } = useSortedData({
    data,
    onOrderChange: handleOrderingChange
  });

  const {
    temporarySelectedFilesIndexes,
    handleSelectAllClick,
    handleCheckboxClick,
    isSelected,
    isPreviouslyAdded,
    isPageSelected,
    hasSelectedItems,
    getTemporarySelectedCount
  } = useFilesSelection({
    data,
    selectedFilesIndexes,
    setSelectedFilesIndexes,
    filesToAdd,
    filesFromPreviouslyUploadedDialog
  });

  // Notify parent component when temporary selection changes
  useEffect(() => {
    if (onTemporarySelectionChange) {
      onTemporarySelectionChange(
        getTemporarySelectedCount(),
        temporarySelectedFilesIndexes
      );
    }
  }, [
    temporarySelectedFilesIndexes,
    getTemporarySelectedCount,
    onTemporarySelectionChange
  ]);

  // Implement server-side infinite scrolling with custom hook
  const handleLoadMore = useCallback(() => {
    // Only load more if we have more data
    if (
      hasMoreData &&
      !loadingData &&
      !loadingMore &&
      nextCursor &&
      !scrollTriggeredState
    ) {
      setScrollTriggeredState(true);
      loadMoreInvokedRef.current = true;

      return loadFiles(nextCursor).catch((error) => {
        console.error('Error loading more files:', error);
      });
    }
    // Return a resolved promise to satisfy the useInfiniteScroll hook
    return Promise.resolve();
  }, [
    hasMoreData,
    loadingData,
    loadingMore,
    nextCursor,
    loadFiles,
    scrollTriggeredState
  ]);

  // Reset the scroll trigger when loading states change
  useEffect(() => {
    if (!loadingMore && !loadingData && scrollTriggeredState) {
      // Only reset once loading is complete
      setScrollTriggeredState(false);
    }
  }, [loadingMore, loadingData, scrollTriggeredState]);

  // Use the hook with proper options
  const { targetRef } = useInfiniteScroll(handleLoadMore, {
    enabled:
      hasMoreData &&
      !loadingData &&
      !loadingMore &&
      isDialogOpen &&
      !scrollTriggeredState,
    rootMargin: '300px',
    root: null // Use viewport as root
  });

  // Reset loadMoreInvoked when dialog opens or closes
  useEffect(() => {
    loadMoreInvokedRef.current = false;
    setScrollTriggeredState(false);
  }, [isDialogOpen]);

  if (loadingData) {
    return (
      <Stack
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 700,
          height: 256
        }}
      >
        <CircularProgress size={26} />
      </Stack>
    );
  }

  if (!data.length) {
    return <NoFiles />;
  }

  return (
    <TableContainer
      component={Box}
      ref={tableContainerRef}
      sx={{
        width: '100%',
        maxHeight: '68vh',
        pr: 3,
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label="files table">
        <CustomTableHead
          columns={columns}
          orderBy={orderBy}
          order={order}
          handleSort={handleSort}
          isPageSelected={isPageSelected}
          handleSelectAllClick={handleSelectAllClick}
          hasSelectedItems={hasSelectedItems}
        />
        <TableBody>
          {sortedData.map((row, index) => (
            <FileRow
              key={`${row.pk}-${index}`}
              row={row}
              index={index}
              isSelected={isSelected(index)}
              isPreviouslyAdded={isPreviouslyAdded(index)}
              onRowClick={handleCheckboxClick}
            />
          ))}
          {loadingMore && <LoadingRow />}
          <SentinelRow targetRef={targetRef} />
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default memo(FilesTable);
