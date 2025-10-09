import { Stack, Typography } from '@mui/material';
import FolderIcon from 'assets/icons/folder.svg?react';

const NoData = () => {
  return (
    <Stack
      sx={{
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        textAlign: 'center'
      }}
      fontSize={14}
    >
      <div style={{ marginBottom: 16, padding: '8px 3px' }}>
        <FolderIcon />
      </div>
      <Typography color="text.secondary" maxWidth={280} variant="body2">
        You have not created any documents yet. Get started by creating your
        first document.
      </Typography>
    </Stack>
  );
};

export default NoData;
