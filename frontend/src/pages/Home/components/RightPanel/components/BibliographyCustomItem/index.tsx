import React, { memo } from 'react';
import { Typography, SxProps } from '@mui/material';
import { Link } from 'react-router';
import { openFilePreview } from 'services/files';
import { Metadata } from 'types/document';

interface BibliographyCustomItemProps extends Partial<Metadata> {
  sx?: SxProps;
}

const BibliographyCustomItem = ({
  title,
  file_name,
  object_id,
  url,
  sx
}: BibliographyCustomItemProps) => {
  return (
    <Link
      to={url || ''}
      target="_blank"
      {...(file_name &&
        object_id && {
          onClick: (e) => {
            e.preventDefault();
            openFilePreview(object_id);
          }
        })}
    >
      <Typography
        variant="body2"
        letterSpacing={0.1}
        sx={{ ...sx, '&:hover': { textDecorationLine: 'underline' } }}
      >
        {title || file_name || url?.replace(/^https?:\/\//, '')}
      </Typography>
    </Link>
  );
};

export default memo(BibliographyCustomItem);
