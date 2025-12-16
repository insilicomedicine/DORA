import React, { memo, useEffect, useState } from 'react';
import {
  Dialog as MUIDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton
} from '@mui/material';
import Logs from '../../../Logs';
import CotList from 'components/Chatbot/CotList';
import { getChatCotLogs } from 'services/chat';
import { useParams } from 'react-router';
import { ChatCot } from 'components/Chatbot/types';
import CloseRounded from '@mui/icons-material/CloseRounded';

interface DialogProps {
  isDeepResearch?: boolean;
  open: boolean;
  handleClose: () => void;
}

const Dialog = ({
  open,
  handleClose = () => {},
  isDeepResearch = false
}: DialogProps) => {
  const { id: documentId } = useParams();
  const [cotLogs, setCotLogs] = useState<ChatCot[]>([]);

  useEffect(() => {
    if (!documentId || !isDeepResearch) return;
    const fetchCotLogs = async () => {
      const data = await getChatCotLogs(documentId);
      if (!data) return;
      setCotLogs(data);
    };
    fetchCotLogs();
  }, []);

  return (
    <MUIDialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      sx={{
        '& .MuiDialog-paper': {
          minWidth: !isDeepResearch ? 800 : 600,
          minHeight: 360,
          scrollbarWidth: 'none',
          borderRadius: 4
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.42,
          ...(isDeepResearch && { pb: 0.25 })
        }}
      >
        Document generation {!isDeepResearch ? 'logs' : 'CoT'}
        <IconButton
          data-testid="userInputsDialog-closeButton"
          onClick={handleClose}
          style={{
            padding: 4,
            margin: '0 -10px 0 auto'
          }}
        >
          <CloseRounded sx={{ color: 'grey.500' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: 600,
          overflow: 'auto',
          ...(isDeepResearch && { border: 'none' })
        }}
      >
        {isDeepResearch ? (
          <CotList list={cotLogs} />
        ) : (
          <Logs titleIsVisible={false} />
        )}
      </DialogContent>
      {!isDeepResearch && (
        <DialogActions>
          <Button
            onClick={handleClose}
            sx={{ p: '8px 20px', maxHeight: 36, m: 1 }}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      )}
    </MUIDialog>
  );
};

export default memo(Dialog);
