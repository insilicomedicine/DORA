import React, { memo } from 'react';
import { Box, Button } from '@mui/material';
import { AddRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { Stack, List, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { DocumentItem } from 'types/document';
import DocumentListItem from './components/DocumentListItem';

const DocumentsListContainer = styled(Box)(({ theme }) => ({
  height: 'calc(100% - 16px)',
  borderRadius: 24,
  backgroundColor: theme.palette.common.white,
  padding: '16px 24px 24px',
  boxSizing: 'border-box',
  '& .MuiButton-textSizeMedium:hover': {
    backgroundColor: theme.palette.primary.light
  }
}));

const ListWrapper = styled(Stack)(() => ({
  height: '100%',
  overflow: 'auto',
  borderRadius: 16
}));

const NameWrapper = styled('div')(() => ({
  flex: 1,
  width: '100%',
  paddingRight: 40,
  boxSizing: 'border-box',
  overflow: 'hidden'
}));

const TemplateWrapper = styled('div')(() => ({
  width: 280,
  marginRight: 40
}));

const CreatedDateWrapper = styled('div')(() => ({
  width: 90,
  marginRight: 40
}));

const StatusWrapper = styled('div')(() => ({
  width: 100,
  marginRight: 40
}));

const ActionsWrapper = styled('div')(() => ({
  width: 30,
  marginRight: 24
}));

interface DocumentsListProps {
  documentList: DocumentItem[];
}

const DocumentsList = ({ documentList }: DocumentsListProps) => {
  const nav = useNavigate();

  return (
    <DocumentsListContainer data-testid="documentList-containerWrapper">
      <ListWrapper>
        <Stack direction="row" sx={{ mt: 1, justifyContent: 'space-between' }}>
          <Typography fontSize={18} fontWeight={500}>
            Your Documents
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddRounded />}
            onClick={() => nav(`/templates`)}
            sx={{
              textTransform: 'none',
              fontSize: 14,
              pl: 2,
              pr: 2
            }}
          >
            New Document
          </Button>
        </Stack>
        <Stack
          direction="row"
          sx={{
            padding: '14px 16px',
            borderBottom: '1px solid #f2f2f2',
            boxSizing: 'border-box',
            fontSize: 14,
            fontWeight: 500,
            mr: 2
          }}
          data-testid="documentList-headerRowWrapper"
        >
          <NameWrapper>Name</NameWrapper>
          <TemplateWrapper>Template</TemplateWrapper>
          <CreatedDateWrapper>Created</CreatedDateWrapper>
          <StatusWrapper />
          <ActionsWrapper />
        </Stack>
        <List
          sx={{
            flex: 1,
            overflow: 'auto',
            paddingTop: 0,
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable'
          }}
          data-testid="documentList-itemsListWrapper"
        >
          {documentList.map(
            ({
              id,
              title,
              template_name,
              status,
              stage,
              created_at,
              isNew = false
            }) => {
              return (
                <DocumentListItem
                  id={id}
                  key={id}
                  title={title}
                  templateName={template_name}
                  status={status}
                  stage={stage}
                  createdAt={created_at}
                  isNew={isNew}
                />
              );
            }
          )}
        </List>
      </ListWrapper>
    </DocumentsListContainer>
  );
};
export default memo(DocumentsList);
