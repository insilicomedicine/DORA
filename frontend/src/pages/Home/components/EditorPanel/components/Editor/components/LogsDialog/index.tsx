import React, { memo } from 'react';
import {
  Dialog as MUIDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button
} from '@mui/material';
import Logs from '../../../Logs';

interface DialogProps {
  open: boolean;
  handleClose: () => void;
}

const Dialog = ({ open, handleClose = () => {} }: DialogProps) => {
  return (
    <MUIDialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      sx={{
        '& .MuiDialog-paper': {
          minWidth: 800,
          scrollbarWidth: 'none',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle
        sx={{
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.42
        }}
      >
        Document generation logs
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: 600,
          overflow: 'auto'
        }}
      >
        <Logs titleIsVisible={false} />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          sx={{ p: '8px 20px', maxHeight: 36, m: 1 }}
          variant="outlined"
        >
          Close
        </Button>
      </DialogActions>
    </MUIDialog>
  );
};

export default memo(Dialog);
