import React, { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Typography, Button, DialogContentText } from '@mui/material';
import { SaveAltRounded, DeleteForeverRounded } from '@mui/icons-material';
import ExportPaperSuccessfully from '../ExportPaper/Success';
import { deleteDocument } from 'services/documents';
import Dialog from 'components/Dialog';
import {
  useDeletedDocumentStore,
  useDocumentStore
} from 'contexts/documentsStore';
import DropdownMenu from 'components/DropdownMenu';
import { sendGA4Event } from 'utils/ga';
import Snackbar from 'utils/snackbar';
import usePlanStatus from 'hooks/usePlanStatus';
import { handleExportDocument } from 'utils/editor';

interface MenuProps {
  target: any;
  className?: string;
  hanleMenuClick?: (isOpen: boolean) => void;
}

const Menu = ({
  target: { id: itemId, status = '', stage = '', title = '' } = {},
  hanleMenuClick
}: MenuProps) => {
  const nav = useNavigate();
  const { id: documentId } = useParams();
  const { isExpired, limitInfos = {} } = usePlanStatus();
  const { setNewDocument } = useDocumentStore();
  const setDeletedDocumentId = useDeletedDocumentStore(
    (state) => state.setDeletedDocumentId
  );
  const [isExportSuccessfullyDialogOpen, setIsExportSuccessfullyDialogOpen] =
    useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const isPolishing = stage === 'polishing';

  const handleDeleteDocument = async () => {
    const response = await deleteDocument(itemId);
    if (!response) return;
    sendGA4Event('delete_document');
    setDeletedDocumentId(itemId);
    Snackbar.info(
      <Typography variant="body2" p="8px 0">
        Document deleted permanently
      </Typography>
    );
    if (itemId === documentId) {
      nav('/');
      setNewDocument(null);
    }
  };

  const menuItems = [
    {
      icon: <SaveAltRounded fontSize="small" />,
      text: 'Export PDF',
      tooltipTitle: (
        <label>
          {limitInfos.expired?.export ||
            `Export is not available because the 
          document contains unapplied changes.`}
        </label>
      ),
      isHidden: status !== 'completed',
      disabled: isPolishing || isExpired,
      handleClick: () =>
        handleExportDocument('pdf', {
          documentId: itemId,
          title,
          callback: () => setIsExportSuccessfullyDialogOpen(true)
        })
    },
    {
      icon: <SaveAltRounded fontSize="small" />,
      text: 'Export DOCX',
      tooltipTitle: (
        <label>
          {limitInfos.expired?.export ||
            `Export is not available because the 
          document contains unapplied changes.`}
        </label>
      ),
      isHidden: status !== 'completed',
      disabled: isPolishing || isExpired,
      handleClick: () =>
        handleExportDocument('docx', {
          documentId: itemId,
          title,
          callback: () => setIsExportSuccessfullyDialogOpen(true)
        })
    },
    {
      icon: <DeleteForeverRounded fontSize="small" className="deleteIcon" />,
      text: 'Delete',
      disableGAEvent: true,
      handleClick: async () => setIsDeleteDialogOpen(true)
    }
  ];

  return (
    <>
      <DropdownMenu
        menuItems={menuItems}
        handleMenuOpenCallback={hanleMenuClick}
      />
      <Dialog
        open={isDeleteDialogOpen}
        title="Delete Document?"
        Content={
          <Box maxWidth={529}>
            <Typography mb={2}>
              <span style={{ fontWeight: 500 }}>{title}</span> will be
              permanently deleted.
            </Typography>
            <DialogContentText color="text.primary">
              This action cannot be undone.
            </DialogContentText>
          </Box>
        }
        handleClose={() => setIsDeleteDialogOpen(false)}
        actionBtnTexts={{ confirm: 'Delete' }}
        handleConfirm={handleDeleteDocument}
      />

      <Dialog
        open={isExportSuccessfullyDialogOpen}
        handleClose={() => setIsExportSuccessfullyDialogOpen(false)}
        title="Successfully exported!"
        Content={<ExportPaperSuccessfully />}
        Actions={
          <Button
            onClick={() => setIsExportSuccessfullyDialogOpen(false)}
            variant="contained"
            size="small"
          >
            Ok
          </Button>
        }
      />
    </>
  );
};
export default memo(Menu);
