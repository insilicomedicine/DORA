import React, { Fragment } from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Dialog from 'components/Dialog';
import { CloseRounded } from '@mui/icons-material';
import { format } from 'date-fns';
import CustomDataBlock from '../CustomDataBlock';
import DefaultBlock from '../DefaultBlock';
import InputsBlock from '../InputsBlock';
import CustomBibliographyBlock from '../CustomBibliographyBlock';
import Chatbot from 'components/Chatbot';
import { useParams } from 'react-router';

interface DialogProps {
  open: boolean;
  isDeepResearch?: boolean;
  handleClose: () => void;
  dialogContentData: any;
}

export enum SectionType {
  input = 'Input',
  customBibliography = 'Custom bibliography',
  customData = 'Custom data',
  template = 'Template',
  date = 'Date'
}

const UserInputsDialog = ({
  open,
  handleClose,
  dialogContentData,
  isDeepResearch = false
}: DialogProps) => {
  const { id: documentId } = useParams();
  const inputSections = [
    {
      title: SectionType.template,
      content: dialogContentData.templateName
    },
    {
      title: SectionType.date,
      content:
        dialogContentData.createdAt &&
        format(new Date(dialogContentData.createdAt), 'dd MMM yyyy, HH:mm')
    },
    {
      title: SectionType.input,
      content: dialogContentData.userInputsData
    },
    {
      title: SectionType.customBibliography,
      content: dialogContentData?.customBibliographyFiles
    },
    {
      title: SectionType.customData,
      content: dialogContentData?.customData
    }
  ];

  const renderInputSection = (section) => {
    const { title, content } = section;

    if (!content) return null;

    switch (title) {
      case SectionType.input:
        return <InputsBlock title={title} content={content} />;
      case SectionType.customBibliography:
        return <CustomBibliographyBlock title={title} content={content} />;
      case SectionType.customData:
        return <CustomDataBlock title={title} content={content} />;
      default:
        return <DefaultBlock title={title} content={content} />;
    }
  };

  return (
    <Dialog
      open={open}
      handleClose={handleClose}
      sx={{
        '& .MuiDialog-paper': {
          minWidth: !isDeepResearch ? '744px' : '580px'
        }
      }}
      data-testid="userInputsDialog-wrapper"
    >
      <DialogTitle style={{ display: 'flex' }}>
        <span>Document inputs </span>
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
      <DialogContent sx={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {inputSections.map(
          (section, index) =>
            section?.content && (
              <Fragment key={index}>{renderInputSection(section)}</Fragment>
            )
        )}
        {isDeepResearch && <Chatbot documentId={documentId} readOnly />}
      </DialogContent>
    </Dialog>
  );
};

export default UserInputsDialog;
