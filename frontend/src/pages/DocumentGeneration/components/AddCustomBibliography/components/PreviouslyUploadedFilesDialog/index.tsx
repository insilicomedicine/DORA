import React, { memo } from 'react';
import Dialog from 'components/Dialog';
import FilesTable from './components/FilesTable';
import DialogActions from './components/DialogActions';
import { useDialogState } from './hooks/useDialogState';
import { CustomFile } from '../../types';

interface PreviouslyUploadedFilesDialogProps {
  open: boolean;
  handleClose: () => void;
  filesFromPreviouslyUploadedDialog: CustomFile[];
  setFilesFromPreviouslyUploadedDialog: (files: CustomFile[]) => void;
  filesToAdd: CustomFile[];
}

const PreviouslyUploadedFilesDialog = ({
  open,
  handleClose,
  filesFromPreviouslyUploadedDialog,
  setFilesFromPreviouslyUploadedDialog,
  filesToAdd
}: PreviouslyUploadedFilesDialogProps) => {
  const {
    selectedFilesIndexes,
    setSelectedFilesIndexes,
    temporarySelectedCount,
    handleFilesLoaded,
    handleTemporarySelectionChange,
    handleClickAttachButton,
    disabledAttachButton
  } = useDialogState(
    filesFromPreviouslyUploadedDialog,
    setFilesFromPreviouslyUploadedDialog,
    handleClose
  );

  const dialogContent = (
    <FilesTable
      selectedFilesIndexes={selectedFilesIndexes}
      setSelectedFilesIndexes={setSelectedFilesIndexes}
      onFilesLoaded={handleFilesLoaded}
      onTemporarySelectionChange={handleTemporarySelectionChange}
      filesToAdd={filesToAdd}
      filesFromPreviouslyUploadedDialog={filesFromPreviouslyUploadedDialog}
      isDialogOpen={open}
    />
  );

  return (
    <Dialog
      open={open}
      title="Previously uploaded"
      handleClose={handleClose}
      Content={dialogContent}
      Actions={
        <DialogActions
          handleClose={handleClose}
          handleClickAttachButton={handleClickAttachButton}
          disabledAttachButton={disabledAttachButton}
          temporarySelectedCount={temporarySelectedCount}
        />
      }
      enableActions
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: 744
        },
        '& .MuiDialogContent-root': {
          mr: -3
        }
      }}
    />
  );
};

export default memo(PreviouslyUploadedFilesDialog);
