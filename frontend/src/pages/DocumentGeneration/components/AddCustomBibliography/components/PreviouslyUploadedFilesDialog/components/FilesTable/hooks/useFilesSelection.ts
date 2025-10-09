import { useState, useCallback, useEffect, useMemo } from 'react';
import { BibliographyFile } from '../../../types';

interface UseFilesSelectionProps {
  data: BibliographyFile[];
  selectedFilesIndexes: number[];
  setSelectedFilesIndexes: (indexes: number[]) => void;
  filesToAdd: BibliographyFile[];
  filesFromPreviouslyUploadedDialog: BibliographyFile[];
}

interface UseFilesSelectionReturn {
  temporarySelectedFilesIndexes: number[];
  handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxClick: (index: number) => void;
  isSelected: (index: number) => boolean;
  isPreviouslyAdded: (index: number) => boolean;
  isPageSelected: boolean;
  currentPageIndexes: number[];
  hasSelectedItems: boolean;
  getTemporarySelectedCount: () => number;
}

const useFilesSelection = ({
  data,
  selectedFilesIndexes,
  setSelectedFilesIndexes,
  filesToAdd,
  filesFromPreviouslyUploadedDialog
}: UseFilesSelectionProps): UseFilesSelectionReturn => {
  const [temporarySelectedFilesIndexes, setTemporarySelectedFilesIndexes] =
    useState<number[]>([]);

  // Calculate indexes for currently displayed rows
  const currentPageIndexes = useMemo(
    () => Array.from({ length: data.length }, (_, i) => i),
    [data.length]
  );

  // Check if all elements on current page are selected
  const isPageSelected = useMemo(
    () =>
      currentPageIndexes.length > 0 &&
      currentPageIndexes.every(
        (index) =>
          selectedFilesIndexes.includes(index) ||
          temporarySelectedFilesIndexes.includes(index)
      ),
    [currentPageIndexes, selectedFilesIndexes, temporarySelectedFilesIndexes]
  );

  const hasSelectedItems = useMemo(
    () =>
      temporarySelectedFilesIndexes.length > 0 ||
      currentPageIndexes.some((index) => selectedFilesIndexes.includes(index)),
    [temporarySelectedFilesIndexes, currentPageIndexes, selectedFilesIndexes]
  );

  // Get temporary selected count
  const getTemporarySelectedCount = useCallback(() => {
    return temporarySelectedFilesIndexes.length;
  }, [temporarySelectedFilesIndexes]);

  // Initialize selection based on filesToAdd and filesFromPreviouslyUploadedDialog
  useEffect(() => {
    if (!data.length) return;

    const getFilePKSet = (files: BibliographyFile[]) =>
      new Set(files.map((obj) => obj.pk));

    const filesToAddPKs = getFilePKSet(filesToAdd);
    const filesFromDialogPKs = getFilePKSet(filesFromPreviouslyUploadedDialog);

    const selectedIndexes = data.reduce<number[]>((indexes, item, index) => {
      if (filesToAddPKs.has(item.pk) || filesFromDialogPKs.has(item.pk)) {
        indexes.push(index);
      }
      return indexes;
    }, []);

    setSelectedFilesIndexes(selectedIndexes);
  }, [
    data,
    filesToAdd,
    filesFromPreviouslyUploadedDialog,
    setSelectedFilesIndexes
  ]);

  const handleSelectAllClick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const newSelectedIndexes = Array.from(
          { length: data.length },
          (_, i) => i
        ).filter((index) => !selectedFilesIndexes.includes(index));

        setTemporarySelectedFilesIndexes(newSelectedIndexes);
      } else {
        setTemporarySelectedFilesIndexes([]);
      }
    },
    [data.length, selectedFilesIndexes]
  );

  const handleCheckboxClick = useCallback(
    (index: number) => {
      // Skip if this index is already in selectedFilesIndexes (previously added)
      if (selectedFilesIndexes.includes(index)) {
        return;
      }

      setTemporarySelectedFilesIndexes((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    },
    [selectedFilesIndexes]
  );

  const isSelected = useCallback(
    (index: number) =>
      selectedFilesIndexes.includes(index) ||
      temporarySelectedFilesIndexes.includes(index),
    [selectedFilesIndexes, temporarySelectedFilesIndexes]
  );

  const isPreviouslyAdded = useCallback(
    (index: number) => selectedFilesIndexes.includes(index),
    [selectedFilesIndexes]
  );

  return {
    temporarySelectedFilesIndexes,
    handleSelectAllClick,
    handleCheckboxClick,
    isSelected,
    isPreviouslyAdded,
    isPageSelected,
    currentPageIndexes,
    hasSelectedItems,
    getTemporarySelectedCount
  };
};

export default useFilesSelection;
