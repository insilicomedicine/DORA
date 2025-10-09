import React, { ReactNode } from 'react';
import {
  IconButton as MUIIconButton,
  IconButtonProps as MUIIconButtonProps,
  SxProps
} from '@mui/material';
import { theme } from 'theme';

const variantBackgroundColor = {
  filled: theme.palette.primary.main
};

const variantColor = {
  filled: 'white'
};

interface IconButtonProps extends MUIIconButtonProps {
  variant: 'filled';
  sx?: SxProps;
  onClick?: (_e) => void;
  children: ReactNode;
}

const IconButton = ({
  variant,
  sx,
  onClick,
  children,
  ...others
}: IconButtonProps) => {
  return (
    <MUIIconButton
      sx={{
        backgroundColor: variantBackgroundColor[variant],
        color: variantColor[variant],
        p: '6px 16px',
        borderRadius: '10px',
        ...sx
      }}
      onClick={onClick}
      {...others}
    >
      {children}
    </MUIIconButton>
  );
};

export default IconButton;
