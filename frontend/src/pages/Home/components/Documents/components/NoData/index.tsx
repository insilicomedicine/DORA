import React, { memo, ReactNode, CSSProperties } from 'react';
import { Stack, Typography } from '@mui/material';
import FolderIcon from 'assets/icons/folder.svg?react';

interface NoDataProps {
  title?: string;
  description?: string;
  Actions?: ReactNode;
  style?: CSSProperties;
}

const NoData = ({
  title = 'No documents created yet',
  description = " You haven't made any documents. Let's start with your first one.",
  style = {},
  Actions = null
}: NoDataProps) => {
  return (
    <Stack
      display="flex"
      sx={{
        alignItems: 'center',
        flex: 1,
        minHeight: '100%',
        textAlign: 'center',
        style: style,
        mt: '30px',
        pt: '92px',
        bgcolor: '#fff',
        borderRadius: 3
      }}
      style={style}
    >
      <FolderIcon style={{ padding: '10px 4.5px', width: 48, height: 48 }} />
      <Typography fontWeight={500} mt={2} mb={1}>
        {title}
      </Typography>
      <Typography variant="body2" mb={3} width={242} lineHeight="145%">
        {description}
      </Typography>
      {Actions}
    </Stack>
  );
};

export default memo(NoData);
