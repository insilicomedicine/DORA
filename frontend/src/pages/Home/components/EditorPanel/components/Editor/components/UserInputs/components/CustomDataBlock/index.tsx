import React, { memo } from 'react';
import { Typography, Stack } from '@mui/material';
import ExpandableCustomDataBlock from './components/ExpandableCustomDataBlock';

interface CustomDataItem {
  title: string;
  content: any;
}

interface UserInputBlockProps {
  title: string;
  content: CustomDataItem[];
}

const CustomDataBlock = ({ title, content = [] }: UserInputBlockProps) => {
  return (
    <Stack spacing={2}>
      <Typography fontWeight={500} textTransform="capitalize">
        {title}
      </Typography>
      {content?.map((item, index) => (
        <Stack
          key={`custom-data-${index}-${item.title}`}
          sx={{
            backgroundColor: '#F5F5F5',
            p: '6px 8px 6px 16px',
            borderRadius: 2
          }}
        >
          <ExpandableCustomDataBlock
            title={item.title}
            content={item.content}
          />
        </Stack>
      ))}
    </Stack>
  );
};

export default memo(CustomDataBlock);
