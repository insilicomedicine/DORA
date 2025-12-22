import { memo } from 'react';
import { Typography, SxProps, Stack } from '@mui/material';
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
    <Stack gap={0.5} sx={sx}>
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
          fontWeight={title ? 500 : 400}
          sx={{ '&:hover': { textDecorationLine: 'underline' } }}
        >
          {title || file_name}
        </Typography>
      </Link>
      <Typography variant="body2" color="textSecondary">
        {url?.replace(/^(?:https?:\/\/)?(?:www\.)?([^\/]+).*/, '$1')}
      </Typography>
    </Stack>
  );
};

export default memo(BibliographyCustomItem);
