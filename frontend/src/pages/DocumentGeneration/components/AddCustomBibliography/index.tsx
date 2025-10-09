import {
  useEffect,
  useState,
  ReactNode,
  CSSProperties,
  memo,
  useMemo
} from 'react';
import { useDropzone } from 'react-dropzone';
import { useWebsocketStore } from 'contexts/useWebsocketStore';
import FileToAdd from './components/FileToAdd';
import { generateNewId } from 'utils/generateNewId';
import DragNDrop from './components/DragNDrop';
import Header from './components/Header';
import PreviouslyUploadedFilesDialog from './components/PreviouslyUploadedFilesDialog';
import { FileUploadStatuses } from 'types/file';
import { Box, Stack, Typography } from '@mui/material';
import { CustomFile } from './types';

interface AddCustomBibliographyProps {
  style?: CSSProperties;
  isDisabled?: boolean;
  headerTitle?: string;
  customHeader?: ReactNode;
  filesToAdd: CustomFile[];
  fileList?: CustomFile[];
  setFilesToAdd: (files: CustomFile[]) => void;
  filesFromPreviouslyUploadedDialog: CustomFile[];
  setFilesFromPreviouslyUploadedDialog: (files: CustomFile[]) => void;
}

const AddCustomBibliography = ({
  style,
  isDisabled = false,
  headerTitle,
  customHeader,
  filesToAdd,
  setFilesToAdd,
  filesFromPreviouslyUploadedDialog,
  setFilesFromPreviouslyUploadedDialog
}: AddCustomBibliographyProps) => {
  const { uploadedFileUpdatesWS } = useWebsocketStore();

  const [previouslyUploadedDialogIsOpen, setPreviouslyUploadedDialogIsOpen] =
    useState(false);

  const { acceptedFiles, getRootProps, getInputProps, isDragAccept } =
    useDropzone({
      accept: {
        'application/pdf': ['.pdf']
      },
      maxFiles: 20,
      maxSize: 20000000
    });

  useEffect(() => {
    if (acceptedFiles.length) {
      const enhancedFiles = acceptedFiles.map((file) => {
        // Create an enhanced file object that extends the original
        const enhancedFile = Object.defineProperties(file, {
          pk: { value: generateNewId(), writable: true },
          status: { value: FileUploadStatuses.loading, writable: true },
          created_at: { value: new Date().toISOString(), writable: true },
          updated_at: { value: new Date().toISOString(), writable: true }
        });

        return enhancedFile as unknown as CustomFile;
      });

      setFilesToAdd([...filesToAdd, ...enhancedFiles]);
    }
  }, [acceptedFiles]);

  useEffect(() => {
    if (uploadedFileUpdatesWS?.pk) {
      const fileToUpdate = filesToAdd.find(
        (addedFile) => addedFile?.pk === uploadedFileUpdatesWS?.pk
      );
      if (fileToUpdate) {
        fileToUpdate.status = uploadedFileUpdatesWS?.status;
        setFilesToAdd([
          ...filesToAdd.filter((i) => i.pk !== uploadedFileUpdatesWS?.pk),
          fileToUpdate
        ]);
      }
    }
  }, [uploadedFileUpdatesWS?.pk]);

  const handleOpenPreviouslyUploadedDialog = () => {
    setPreviouslyUploadedDialogIsOpen(true);
  };

  const handleClosePreviouslyUploadedDialog = () => {
    setPreviouslyUploadedDialogIsOpen(false);
  };

  const files = filesToAdd.map((file: CustomFile, index: number) => {
    return (
      <FileToAdd
        key={index}
        file={file}
        filesToAdd={filesToAdd}
        setFilesToAdd={setFilesToAdd}
      />
    );
  });

  const filesUploaded = filesFromPreviouslyUploadedDialog.map(
    (file: CustomFile, index: number) => {
      return (
        <FileToAdd
          key={index}
          file={file}
          filesToAdd={filesFromPreviouslyUploadedDialog}
          setFilesToAdd={setFilesFromPreviouslyUploadedDialog}
        />
      );
    }
  );

  const filesCount = useMemo(
    () => filesToAdd.length + filesFromPreviouslyUploadedDialog.length,
    [filesToAdd.length, filesFromPreviouslyUploadedDialog.length]
  );

  return (
    <>
      <Stack
        style={style}
        sx={{
          width: '100%',
          borderRadius: 4,
          padding: '20px',
          backgroundColor: '#ffffff',
          marginBottom: 4,
          border: '1px solid #ffffff'
        }}
      >
        <Header
          customHeader={customHeader}
          title={headerTitle}
          isDragAccept={isDragAccept}
          handleOpenPreviouslyUploadedDialog={
            handleOpenPreviouslyUploadedDialog
          }
        />

        <Box
          {...(!isDisabled && getRootProps())}
          sx={{
            ...(isDisabled && {
              '& span, & button': {
                color: '#9E9E9E'
              },
              '& button': {
                pointerEvents: 'none'
              }
            })
          }}
        >
          <DragNDrop
            isDragAccept={isDragAccept}
            getInputProps={getInputProps}
          />
        </Box>
        {!!filesCount && (
          <Stack sx={{ alignItems: 'flex-start', mt: 2, mr: -2 }}>
            <Typography variant="body2" my={1} fontWeight={500}>
              Attached {filesCount} files
            </Typography>
            <Stack
              sx={{
                width: '100%',
                maxHeight: 220,
                overflow: 'auto',
                pr: 0.5,
                scrollbarGutter: 'stable'
              }}
            >
              {files}
              {filesUploaded}
            </Stack>
          </Stack>
        )}
      </Stack>
      {previouslyUploadedDialogIsOpen && (
        <PreviouslyUploadedFilesDialog
          open={previouslyUploadedDialogIsOpen}
          handleClose={handleClosePreviouslyUploadedDialog}
          filesFromPreviouslyUploadedDialog={filesFromPreviouslyUploadedDialog}
          setFilesFromPreviouslyUploadedDialog={
            setFilesFromPreviouslyUploadedDialog
          }
          filesToAdd={filesToAdd}
        />
      )}
    </>
  );
};

export default memo(AddCustomBibliography);
