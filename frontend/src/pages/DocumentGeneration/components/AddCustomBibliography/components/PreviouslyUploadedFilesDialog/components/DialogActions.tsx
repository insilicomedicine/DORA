import React from 'react';
import { Button } from '@mui/material';

interface DialogActionsProps {
  handleClose: () => void;
  handleClickAttachButton: () => void;
  disabledAttachButton: boolean;
  temporarySelectedCount: number;
}

const DialogActions = ({
  handleClose,
  handleClickAttachButton,
  disabledAttachButton,
  temporarySelectedCount
}: DialogActionsProps) => {
  return (
    <>
      <Button
        onClick={handleClose}
        color="primary"
        sx={{
          p: '8px 20px',
          maxHeight: 36,
          textTransform: 'initial'
        }}
        data-ga-event="Cancel Custom Bibliography"
        data-ga-event-location="model"
      >
        Cancel
      </Button>
      <Button
        onClick={handleClickAttachButton}
        color="primary"
        sx={{
          p: '8px 20px',
          maxHeight: 36,
          textTransform: 'initial'
        }}
        variant="contained"
        disabled={disabledAttachButton}
        data-ga-event="Attach Custom Bibliography"
        data-ga-event-location="model"
      >
        Attach {temporarySelectedCount > 0 && ` (${temporarySelectedCount})`}
      </Button>
    </>
  );
};

export default DialogActions;
