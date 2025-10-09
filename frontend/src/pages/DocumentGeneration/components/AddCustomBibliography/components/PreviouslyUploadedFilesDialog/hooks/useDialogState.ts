import { useState, useMemo, useCallback } from 'react';
import { CustomFile } from '../../../types';

export const useDialogState = (
  _filesFromPreviouslyUploadedDialog: CustomFile[],
  setFilesFromPreviouslyUploadedDialog: (files: CustomFile[]) => void,
  handleClose: () => void
) => {
  const [selectedFilesIndexes, setSelectedFilesIndexes] = useState<number[]>(
    []
  );
  const [temporarySelectedCount, setTemporarySelectedCount] = useState(0);
  const [temporarySelectedIndices, setTemporarySelectedIndices] = useState<
    number[]
  >([]);
  const [tableData, setTableData] = useState<CustomFile[]>([]);

  const handleFilesLoaded = useCallback((files: CustomFile[]) => {
    setTableData(files);
  }, []);

  const handleTemporarySelectionChange = useCallback(
    (count: number, indices: number[]) => {
      setTemporarySelectedCount(count);
      setTemporarySelectedIndices(indices);
    },
    []
  );

  const handleClickAttachButton = useCallback(() => {
    // Get selected files using both selectedFilesIndexes and temporarySelectedIndices
    const selectedFileIndexes = Array.from(
      new Set([...selectedFilesIndexes, ...temporarySelectedIndices])
    );

    const newSelectedFiles = tableData.filter((_, index) =>
      selectedFileIndexes.includes(index)
    );

    setFilesFromPreviouslyUploadedDialog(newSelectedFiles);
    setTemporarySelectedCount(0);
    setTemporarySelectedIndices([]);
    handleClose();
  }, [
    tableData,
    selectedFilesIndexes,
    temporarySelectedIndices,
    setFilesFromPreviouslyUploadedDialog,
    handleClose
  ]);

  const disabledAttachButton = useMemo(
    () => !tableData.length || temporarySelectedCount === 0,
    [tableData.length, temporarySelectedCount]
  );

  return {
    selectedFilesIndexes,
    setSelectedFilesIndexes,
    temporarySelectedCount,
    temporarySelectedIndices,
    tableData,
    handleFilesLoaded,
    handleTemporarySelectionChange,
    handleClickAttachButton,
    disabledAttachButton
  };
};
