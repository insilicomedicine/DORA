import React, { memo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { Skeleton } from '@mui/material';
import { useDocumentStore } from 'contexts/documentsStore';
import Tag from './Tag';

const DialogTitle = (props) => {
  const { children, onClose, ...other } = props;
  return (
    <Stack
      {...other}
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      p="12px 24px"
    >
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton aria-label="close" onClick={onClose}>
          <Close />
        </IconButton>
      ) : null}
    </Stack>
  );
};

const DialogSkeleton = () => {
  return (
    <div style={{ padding: '4px 8px' }}>
      <Skeleton animation="wave" style={{ margin: 8, width: 728 }} />
      <Skeleton animation="wave" style={{ margin: 8, width: 608 }} />
      <Skeleton animation="wave" style={{ margin: 8, width: 296 }} />
      <Skeleton animation="wave" style={{ margin: 8, width: 232 }} />
    </div>
  );
};

const PublicationTab = (props) => {
  const { documentData } = useDocumentStore();
  const publication_settings = documentData?.publication_settings || {};

  const {
    citation_count,
    pub_type,
    journal_name,
    authors,
    pub_year,
    enableTypeFilter = false
  } = props;

  const pubTypes =
    enableTypeFilter && publication_settings?.article_types?.length
      ? pub_type?.filter((type) =>
          publication_settings?.article_types?.includes(type)
        )
      : pub_type;

  return (
    <Stack sx={{ py: 2 }}>
      <Tag name="Journal" content={journal_name} />
      <Tag name="Authors" content={authors} />
      <Tag name="Type" content={pubTypes} />
      <Tag
        name="Citations"
        content={
          typeof citation_count === 'number'
            ? citation_count.toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1 ')
            : 'no information'
        }
      />
      <Tag name="Year" content={pub_year} />
    </Stack>
  );
};

const PublicationContent = (props) => {
  const { title, text, enableTypeFilter } = props;

  return (
    <Stack sx={{ gap: 2 }}>
      {title && (
        <Typography variant="h5" fontWeight={500}>
          {title}
        </Typography>
      )}
      {text && <Typography variant="body1">{text}</Typography>}
      <PublicationTab {...props} enableTypeFilter={enableTypeFilter} />
    </Stack>
  );
};

const SourceLinkButton = ({ label, link }) => {
  const handleClick = () => {
    window.open(link, '_blank');
  };

  return (
    <Button
      onClick={handleClick}
      endIcon={<OpenInNew style={{ fontSize: 18 }} />}
    >
      {label}
    </Button>
  );
};

interface PublicationDialogProps {
  open: boolean;
  handleClose: (e: any) => void;
  enableTypeFilter?: boolean;
  data: any;
}

const PublicationDialog = ({
  open = false,
  handleClose = () => {},
  enableTypeFilter = false,
  data: publicationData = {}
}: PublicationDialogProps) => {
  return (
    <Dialog
      fullWidth={true}
      open={open}
      onClose={handleClose}
      sx={{
        '& .MuiPaper-rounded': {
          minWidth: 760,
          borderRadius: 4
        }
      }}
    >
      <DialogTitle onClose={handleClose}>Publication preview</DialogTitle>
      <DialogContent dividers>
        {publicationData ? (
          <PublicationContent
            {...publicationData}
            enableTypeFilter={enableTypeFilter}
          />
        ) : (
          <DialogSkeleton />
        )}
      </DialogContent>
      <DialogActions
        sx={{
          padding: '12px 24px',
          justifyContent: Object.keys(
            publicationData?.publicationSourcesMap || {}
          ).length
            ? 'space-between'
            : 'flex-end'
        }}
      >
        <div>
          {publicationData?.publicationSourcesMap?.pubmed?.id && (
            <SourceLinkButton
              label="PUBMED"
              link={publicationData.publicationSourcesMap.pubmed.link}
            />
          )}
          {publicationData?.publicationSourcesMap?.doi?.id && (
            <SourceLinkButton
              label="DOI"
              link={publicationData.publicationSourcesMap.doi.link}
            />
          )}
          {publicationData?.publicationSourcesMap?.pmc?.id && (
            <SourceLinkButton
              label="PMC"
              link={publicationData.publicationSourcesMap.pmc.link}
            />
          )}
        </div>
        <Button onClick={handleClose}>CLOSE</Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(PublicationDialog);
