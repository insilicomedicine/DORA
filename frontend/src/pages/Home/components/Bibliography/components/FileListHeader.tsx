import { memo } from 'react';
import { Stack } from '@mui/material';
import { ColName, ColUploaded, ColActions } from '../StyledComponents';

const FileListHeader = () => {
  return (
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
    >
      <ColName>Name</ColName>
      <ColUploaded>Uploaded</ColUploaded>
      <ColActions />
    </Stack>
  );
};

export default memo(FileListHeader);
