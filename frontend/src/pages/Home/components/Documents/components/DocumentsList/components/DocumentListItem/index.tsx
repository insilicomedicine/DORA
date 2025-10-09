import React from 'react';
import { CircularProgress } from '@mui/material';
import { InfoOutlined, InsertDriveFileOutlined } from '@mui/icons-material';
import { ListItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router';
import Menu from 'pages/Home/components/LeftPanel/components/Menu';
import { formatDateWithNewRule } from 'utils/utils';
import { DocumentItem } from 'types/document';

const NameWrapper = styled('div')(() => ({
  flex: 1,
  width: '100%',
  paddingRight: 40,
  boxSizing: 'border-box',
  overflow: 'hidden'
}));

const TemplateWrapper = styled('div')(({ theme }) => ({
  width: 280,
  marginRight: 40,
  color: theme.palette.text.secondary
}));

const CreatedDateWrapper = styled('div')(({ theme }) => ({
  width: 90,
  marginRight: 40,
  color: theme.palette.text.secondary
}));

const StatusWrapper = styled('div')(() => ({
  width: 100,
  marginRight: 40
}));

const ActionsWrapper = styled('div')(() => ({
  marginRight: 24
}));

const DraftStatusWrapper = styled('div')(() => ({
  color: '#666',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 16px 5px 12px',
  width: 'fit-content',
  borderRadius: 32,
  backgroundColor: '#F5F5F5',
  fontSize: 12
}));

const FailedStatusWrapper = styled('div')(() => ({
  color: '#AB2F26',
  display: 'flex',
  alignItems: 'center'
}));

const inProgressAnimation = {
  '@keyframes blink': {
    from: {
      opacity: 0.4
    },
    to: {
      opacity: 1
    }
  },
  animation: 'blink 0.5s ease-out 600ms infinite alternate'
};

interface DocumentListItemProps extends Partial<DocumentItem> {
  templateName?: string;
  createdAt?: string;
}

const DocumentListItem = ({
  id,
  title,
  templateName,
  status,
  stage,
  createdAt,
  isNew
}: DocumentListItemProps) => {
  const isDraft = stage === 'draft';
  const isFailed = status === 'failed';
  const isInProgress = status === 'in_progress';

  if (isNew) return null;

  const linkTo = isFailed
    ? ''
    : isDraft
      ? `/documents/generation/${id}`
      : `/documents/${id}`;

  return (
    <ListItem
      component={Link}
      to={linkTo}
      sx={{
        padding: '14px 16px',
        boxSizing: 'border-box',
        borderBottom: `1px solid #F2F2F2`,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 400,
        '&:hover': {
          backgroundColor: (theme) => theme.palette.grey[50]
        }
      }}
      data-testid="documentListItem-containerWrapper"
    >
      <NameWrapper
        sx={isInProgress ? inProgressAnimation : {}}
        data-testid="documentListItem-documentTitleWrapper"
      >
        {isInProgress ? 'Generating...' : title}
      </NameWrapper>
      <TemplateWrapper
        sx={isInProgress ? inProgressAnimation : {}}
        data-testid="documentListItem-templateWrapper"
      >
        {templateName}
      </TemplateWrapper>
      <CreatedDateWrapper
        sx={isInProgress ? inProgressAnimation : {}}
        data-testid="documentListItem-createdDateWrapper"
      >
        {formatDateWithNewRule(createdAt)}
      </CreatedDateWrapper>
      <StatusWrapper data-testid="documentListItem-statusWrapper">
        {isDraft ? (
          <DraftStatusWrapper data-testid="documentListItem-draftStatusWrapper">
            <InsertDriveFileOutlined sx={{ mr: 1, width: 16, height: 16 }} />
            Draft
          </DraftStatusWrapper>
        ) : isFailed ? (
          <FailedStatusWrapper data-testid="documentListItem-failedStatus">
            Failed
            <InfoOutlined fontSize={'small'} style={{ marginLeft: '8px' }} />
          </FailedStatusWrapper>
        ) : isInProgress ? (
          <CircularProgress
            size={16}
            data-testid="documentListItem-inProgressStatus"
          />
        ) : null}
      </StatusWrapper>
      <ActionsWrapper
        data-testid="documentListItem-actionsWrapper"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
      >
        <Menu target={{ id, status, stage, title }} />
      </ActionsWrapper>
    </ListItem>
  );
};

export default DocumentListItem;
