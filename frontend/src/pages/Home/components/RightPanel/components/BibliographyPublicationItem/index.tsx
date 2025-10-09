import React, { useMemo, memo, useRef } from 'react';
import Typography from '@mui/material/Typography';
import Citations, { CitationsRef } from '../Citations';
import { PublicationsViewModel } from 'types/bibliography';
import { chunksAuthorFormatter } from 'utils/chunksAuthorFormatter';
import { useDocumentStore } from 'contexts/documentsStore';
import { Stack } from '@mui/material';

export interface BibliographyPublicationItemProps
  extends PublicationsViewModel {}

const BibliographyPublicationItem = (
  props: BibliographyPublicationItemProps
) => {
  const { documentData } = useDocumentStore();
  const publication_settings = documentData?.publication_settings || {};

  const citationsRef = useRef<CitationsRef>(null);
  const {
    title,
    journal_name,
    pub_type = [],
    pubmed_id,
    pub_year,
    authors,
    isNew = false
  } = props;

  const defaultPubType = useMemo(
    () =>
      publication_settings?.article_types?.length
        ? pub_type?.filter((type) =>
            publication_settings?.article_types?.includes(type)
          )?.[0] || pub_type?.[0]
        : pub_type?.[0],
    [pub_type, publication_settings?.article_types]
  );

  const authorInfo = useMemo(() => {
    const items = [
      chunksAuthorFormatter({ authors, pub_year }),
      journal_name,
      defaultPubType
    ].filter(Boolean);

    return (
      <>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span> • </span>}
            <span {...(index === 0 && { className: 'default' })}>{item}</span>
          </React.Fragment>
        ))}
      </>
    );
  }, [authors, pub_year, journal_name, defaultPubType]);

  return (
    <>
      <Stack
        data-ga-tracking
        data-ga-event-type="Publication preview"
        data-ga-event-location="modal"
        sx={{
          padding: '8px 12px',
          marginRight: 0.5,
          gap: 0.5,
          cursor: 'pointer',
          '& .authorInfo': {
            '& :not(.default)': {
              display: 'none'
            }
          },
          ...(isNew && {
            backgroundColor: 'primary.light',
            borderRadius: 3,
            transition: 'background-color 0.8s linear',
            WebkitAnimation: 'bgAnimation 1.8s linear forwards',
            animation: 'bgAnimation 1.8s linear forwards'
          }),
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderRadius: 3,
            '& .authorInfo': {
              '& :not(.default)': {
                display: 'inline'
              }
            }
          }
        }}
        onClick={() => {
          citationsRef.current?.handleOpenDialog();
        }}
        id={`bibliographyPublicationItem_${pubmed_id}`}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          className="authorInfo"
        >
          {authorInfo}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {title}
        </Typography>
        <Citations ref={citationsRef} {...props} disableViewAbstract />
      </Stack>
    </>
  );
};

export default memo(BibliographyPublicationItem);
