import React, { HTMLAttributes, memo, ReactNode, useState } from 'react';
import { Popover, Stack, SxProps, Theme, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
interface InfoButtonProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: (props: any) => ReactNode;
  sx?: SxProps<Theme>;
  buttonSize?: number;
  buttonText?: string | ReactNode;
  anchorOrigin?: {
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  transformOrigin?: {
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  popoverInfo?: string | ReactNode;
  isDisabled?: boolean;
}

const InfoButton = ({
  icon = (props) => <InfoOutlined {...props} />,
  sx,
  buttonSize = 16,
  buttonText = '',
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  transformOrigin = { vertical: 'top', horizontal: 'center' },
  popoverInfo = null,
  isDisabled = false
}: InfoButtonProps) => {
  const [popoverEl, setPopoverEl] = useState<HTMLElement | null>(null);
  const handlePopoverOpen = (event) => {
    setPopoverEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setPopoverEl(null);
  };

  const renderPopoverInfo = () =>
    typeof popoverInfo === 'string' ? (
      <Typography fontSize={14} lineHeight="145%" letterSpacing={0.15}>
        {popoverInfo}
      </Typography>
    ) : (
      popoverInfo
    );

  const isPopoverOpen = Boolean(popoverEl);
  return (
    <>
      <Stack
        spacing={1.25}
        direction="row"
        sx={{
          color: 'text.secondary',
          ':hover': {
            color: 'common.black'
          },
          pointerEvents: isDisabled ? 'none' : 'all',
          ...sx
        }}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {icon({ sx: { fontSize: buttonSize } })}
        {buttonText}
      </Stack>
      {popoverInfo && (
        <Popover
          sx={{
            pointerEvents: 'none',
            '& .MuiPaper-root': {
              maxWidth: 330,
              padding: '16px 24px',
              borderRadius: 2,
              boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
            }
          }}
          open={isPopoverOpen}
          anchorEl={popoverEl}
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          onClose={handlePopoverClose}
          onMouseEnter={handlePopoverOpen}
          onMouseLeave={handlePopoverClose}
          disableRestoreFocus
        >
          {renderPopoverInfo()}
        </Popover>
      )}
    </>
  );
};

export default memo(InfoButton);
