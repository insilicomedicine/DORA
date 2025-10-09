import React, { useEffect, memo } from 'react';
import { Box, Typography } from '@mui/material';
import { postBibliographyFileName } from 'services/files';
import FailedIconButton from './components/FailedIconButton';
import StatusIcon from './components/StatusIcon';
import ProcessedIconButton from './components/ProcessedIconButton';
import { FileUploadStatuses } from 'types/file';
import { sendGA4Event } from 'utils/ga';
import { CustomFile } from '../../types';

interface FileToAddProps {
  file: CustomFile;
  filesToAdd: CustomFile[];
  setFilesToAdd: (files: CustomFile[]) => void;
}

const FileToAdd = ({ file, filesToAdd, setFilesToAdd }: FileToAddProps) => {
  const currentFile = filesToAdd.find(
    (findedFile) => findedFile.pk === file.pk
  );
  const currentFileStatus = file.status;
  const currentFileId = file.pk;

  useEffect(() => {
    if (!currentFile || currentFile.status !== FileUploadStatuses.loading)
      return;

    postBibliographyFileName(
      currentFile?.name || '',
      currentFile,
      (pk: string | number) => {
        if (currentFile) {
          currentFile.pk = pk;
        }
      },
      () => {
        if (currentFile) {
          currentFile.status = FileUploadStatuses.failed;
        }
      }
    );
    sendGA4Event('upload_files', {
      file_count: filesToAdd.length
    });
  }, []);

  const handleRemoveFile = () => {
    const filteredFiles = filesToAdd.filter(
      (file) => file.pk !== currentFileId
    );
    setFilesToAdd([...filteredFiles]);
  };

  const fileIsUploading = currentFileStatus === FileUploadStatuses.loading;
  const failedUpload = currentFileStatus === FileUploadStatuses.failed;
  const processedUpload = currentFileStatus === FileUploadStatuses.processed;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        padding: '12px 16px 12px 4px',
        borderBottom: '1px solid #f2f2f2',
        position: 'relative',
        ...(!fileIsUploading && {
          '&:hover': {
            '& .processed-icon-button, .failed-icon-button': {
              display: 'inline-flex'
            },
            '& .status-icon': {
              display: 'none'
            }
          }
        })
      }}
      key={file.path}
      onClick={(e) => e.stopPropagation()}
    >
      <Typography variant="body2">{file.name || file.path || ''}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!fileIsUploading && (
          <>
            {processedUpload && (
              <Box className="processed-icon-button" display="none">
                <ProcessedIconButton handleRemoveFile={handleRemoveFile} />
              </Box>
            )}
            {failedUpload && (
              <Box className="failed-icon-button" display="none">
                <FailedIconButton handleRemoveFile={handleRemoveFile} />
              </Box>
            )}
          </>
        )}
        <Box className="status-icon" display="inline-flex" ml={2}>
          <StatusIcon status={currentFileStatus} />
        </Box>
      </Box>
    </Box>
  );
};

export default memo(FileToAdd);
