import React, { memo } from 'react';
import { CloudUploadRounded } from '@mui/icons-material';
import { Stack, styled, Typography, TypographyProps } from '@mui/material';

interface StyledTypographyProps extends TypographyProps {
  isDragAccept?: boolean;
}

const StyledTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isDragAccept'
})<StyledTypographyProps>(({ theme, isDragAccept }) => ({
  letterSpacing: 0.1,
  lineHeight: 1.45,
  color: theme.palette.text.secondary,
  ...(isDragAccept && {
    color: '#ffffff'
  })
}));

interface DragNDropProps {
  isDragAccept: boolean;
  getInputProps: () => any;
}

function DragNDrop({ isDragAccept, getInputProps }: DragNDropProps) {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        height: 104,
        maxHeight: 104,
        padding: 4,
        borderRadius: 3,
        border: '1px dashed #D5D5D5',
        bgcolor: 'grey.50',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'primary.light'
        },
        ...(isDragAccept && {
          border: '1px dashed #C4E9D5',
          backgroundColor: 'primary.main'
        })
      }}
    >
      <input {...getInputProps()} />
      <Stack sx={{ alignItems: 'center' }}>
        {isDragAccept ? (
          <Stack sx={{ alignItems: 'center' }}>
            <CloudUploadRounded style={{ color: '#FFFFFF' }} />
            <StyledTypography variant="body2" isDragAccept={isDragAccept}>
              Drop file here
            </StyledTypography>
          </Stack>
        ) : (
          <StyledTypography variant="body2" isDragAccept={isDragAccept}>
            Drop file here, or{' '}
            <span style={{ fontWeight: 500, color: '#1C8554' }}> Browse</span>.
          </StyledTypography>
        )}

        <StyledTypography
          variant="caption"
          letterSpacing={0}
          mt={0.5}
          isDragAccept={isDragAccept}
        >
          Upload up to 20 PDFs, max 20MB each
        </StyledTypography>
      </Stack>
    </Stack>
  );
}

export default memo(DragNDrop);
