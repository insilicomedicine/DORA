import React, { memo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { AddRounded } from '@mui/icons-material';

interface HeaderProps {
  title?: string;
  customHeader?: React.ReactNode;
  isDragAccept?: boolean;
  handleOpenPreviouslyUploadedDialog: () => void;
}

const Header = ({
  title = 'Bibliography',
  customHeader,
  isDragAccept,
  handleOpenPreviouslyUploadedDialog
}: HeaderProps) => {
  const handleClickPreviouslyUploadedButton = (e) => {
    e.stopPropagation();
    handleOpenPreviouslyUploadedDialog();
  };

  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 1,
        mb: 2,
        ...(isDragAccept && {
          opacity: 0.5
        })
      }}
    >
      {customHeader || (
        <Stack>
          <Typography variant="body2" fontWeight={500} mb={0.5}>
            {title}
            <Typography
              variant="caption"
              fontSize={10}
              lineHeight={1.56}
              color="textSecondary"
              ml={1}
            >
              Optional
            </Typography>
          </Typography>
          <Typography color="textSecondary" variant="caption">
            Add full-text or custom files to the bibliography
          </Typography>
        </Stack>
      )}
      <Button
        startIcon={<AddRounded fontSize="xsmall" />}
        variant="outlined"
        onClick={handleClickPreviouslyUploadedButton}
        size="small"
        style={{
          textTransform: 'initial',
          minWidth: 151
        }}
        data-ga-event="Previously uploaded"
        data-ga-event-location="main_form"
      >
        Previously uploaded
      </Button>
    </Stack>
  );
};

export default memo(Header);
