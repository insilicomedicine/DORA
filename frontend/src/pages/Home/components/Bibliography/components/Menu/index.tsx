import React, { memo, useState, ChangeEvent, useCallback } from 'react';
import { Box, Typography, TextField, Alert } from '@mui/material';
import { DialogContentText } from '@mui/material';
import {
  MoreVert,
  DeleteForeverRounded,
  Edit,
  SaveAltRounded
} from '@mui/icons-material';
import Dialog from 'components/Dialog';
import Snackbar from 'utils/snackbar';
import { openFilePreview } from 'services/files';
import DropdownMenu from 'components/DropdownMenu';

type FileStatus = 'processed' | 'processing' | 'failed';
interface FileTarget {
  id: string;
  title: string;
  status: FileStatus;
}
interface MenuProps {
  target: FileTarget;
  deleteDisabled: boolean;
  handleDeleteFile: (id: string) => Promise<boolean>;
  handleRenameFile: (id: string, newName: string) => Promise<boolean>;
  isDragReject: boolean;
}
interface MenuItem {
  icon: React.ReactElement;
  text: string;
  handleClick: () => void;
  disabled: boolean;
  disableGAEvent?: boolean;
}

const FILE_NAME_MAX_LENGTH = 300;
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

const Menu = ({
  target: { id, title, status } = {
    id: '',
    title: '',
    status: 'processing' as FileStatus
  },
  deleteDisabled,
  handleDeleteFile,
  handleRenameFile,
  isDragReject
}: MenuProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(() =>
    title.replace(FILE_EXTENSION_REGEX, '')
  );
  const [error, setError] = useState('');

  const handleRename = useCallback(async () => {
    const fileExtension = title.match(FILE_EXTENSION_REGEX)?.[0] || '';
    const newFullFileName = `${newFileName}${fileExtension}`;
    const success = await handleRenameFile(id, newFullFileName);

    if (success) {
      setIsRenameDialogOpen(false);
      setNewFileName(newFileName);
    }
  }, [id, title, newFileName, handleRenameFile]);

  const handleFileNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewFileName(value);
      setError(!value.trim() ? 'Filename must be 1-300 characters long.' : '');
    },
    []
  );

  const handleDelete = useCallback(async () => {
    const success = await handleDeleteFile(id);
    if (success) {
      Snackbar.info(
        <Typography
          variant="body2"
          lineHeight={1.45}
          p="8px 0"
          letterSpacing={0.15}
        >
          File deleted permanently
        </Typography>
      );
    }
  }, [id, handleDeleteFile]);

  const handleCloseRenameDialog = useCallback(() => {
    setError('');
    setIsRenameDialogOpen(false);
  }, []);

  const menuItems: MenuItem[] = [
    {
      icon: <Edit fontSize="xsmall" />,
      text: 'Rename',
      handleClick: () => {
        setNewFileName(title.replace(FILE_EXTENSION_REGEX, ''));
        setIsRenameDialogOpen(true);
      },
      disabled: status !== 'processed'
    },
    {
      icon: <SaveAltRounded fontSize="small" />,
      text: 'Download',
      handleClick: () => openFilePreview(id, false),
      disabled: status !== 'processed'
    },
    {
      icon: <DeleteForeverRounded fontSize="small" className="deleteIcon" />,
      text: 'Delete',
      disableGAEvent: true,
      handleClick: () => setIsDeleteDialogOpen(true),
      disabled: deleteDisabled
    }
  ];

  return (
    <>
      <DropdownMenu
        menuIcon={
          <MoreVert
            fontSize="small"
            sx={{ color: isDragReject ? 'grey.200' : 'inherit' }}
          />
        }
        menuItems={menuItems}
      />
      <Dialog
        open={isRenameDialogOpen}
        title="Rename File"
        Content={
          <Box maxWidth={529} mt={2}>
            <TextField
              fullWidth
              variant="outlined"
              label="New File Name"
              slotProps={{ htmlInput: { maxLength: FILE_NAME_MAX_LENGTH } }}
              value={newFileName}
              onChange={handleFileNameChange}
              error={!!error}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        }
        handleClose={handleCloseRenameDialog}
        handleConfirm={handleRename}
        disableConfirmButton={!newFileName.trim()}
        actionBtnTexts={{ confirm: 'Confirm' }}
      />
      <Dialog
        open={isDeleteDialogOpen}
        title="Delete File?"
        Content={
          <Box maxWidth={529}>
            <Typography mb={2}>
              <Typography component="span" fontWeight={500}>
                {title}
              </Typography>
              {' will be permanently deleted.'}
            </Typography>
            <DialogContentText color="text.primary">
              This action cannot be undone.
            </DialogContentText>
          </Box>
        }
        handleClose={() => setIsDeleteDialogOpen(false)}
        actionBtnTexts={{ confirm: 'Delete' }}
        handleConfirm={handleDelete}
      />
    </>
  );
};

export default memo(Menu);
