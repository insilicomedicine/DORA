import React from 'react';
import { Stack, Typography } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';

export interface SectionCustomData {
  slug: string;
  title: string;
  description: string;
}

interface CustomDataItemProps {
  itemData: SectionCustomData;
  handleItemClick?: () => void;
  handleDelete?: (id: string) => void;
}

const CustomDataItem = ({
  itemData: { slug = '', title = '', description = '' } = {
    slug: '',
    title: '',
    description: ''
  },
  handleItemClick = () => {},
  handleDelete = () => {}
}: CustomDataItemProps) => {
  return (
    <Stack
      gap={0.5}
      bgcolor="grey.100"
      my={2}
      p={2}
      borderRadius={4}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          '.deleteIcon': {
            visibility: 'visible'
          }
        }
      }}
      onClick={handleItemClick}
    >
      <CloseRounded
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(slug);
        }}
        className="deleteIcon"
        sx={{
          position: 'absolute',
          right: '16px',
          top: '16px',
          visibility: 'hidden',
          cursor: 'pointer',
          fontSize: 20,
          color: 'grey.600',
          '&:hover': {
            color: 'error.main'
          }
        }}
      />
      <Typography variant="body2" fontWeight={500}>
        {title}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={400}
        sx={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden'
        }}
      >
        {description}
      </Typography>
    </Stack>
  );
};

export default CustomDataItem;
