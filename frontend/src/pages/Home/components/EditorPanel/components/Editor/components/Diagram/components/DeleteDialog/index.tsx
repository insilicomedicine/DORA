import React, { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  handleRemoveDiagramFromDocument: () => void;
}

const DeleteDialog = ({
  open,
  onClose,
  handleRemoveDiagramFromDocument
}: DeleteDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1,
            width: 420
          }
        }
      }}
    >
      <DialogTitle>Delete diagram</DialogTitle>
      <DialogContent sx={{ lineHeight: '150%', letterSpacing: '0.15px' }}>
        Are you sure you want to delete this diagram?
      </DialogContent>
      <DialogActions sx={{ padding: '16px 24px 24px' }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'capitalize',
            fontSize: 16,
            padding: '4px 18px',
            marginRight: 1
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleRemoveDiagramFromDocument}
          variant="contained"
          color="primary"
          sx={{
            textTransform: 'capitalize',
            fontSize: 16,
            padding: '4px 18px'
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(DeleteDialog);
