import { ButtonGroup, IconButton } from '@mui/material';

import { styled } from '@mui/material/styles';

export const TopToolbarButtonGroup = styled(ButtonGroup)(({ theme }) => ({
  justifyContent: 'center',
  alignItems: 'center',
  maxWidth: '100%',
  maxHeight: 56,
  overflow: 'hidden',
  backgroundColor: theme.palette.common.white,
  zIndex: 999
}));

export const TopToolbarButton = styled(IconButton)(({ theme }) => ({
  padding: '5px 16px',
  borderRadius: 8,
  fontSize: 12,
  '&:hover': {
    color: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.light
  },
  [theme.breakpoints.down('xl')]: {
    padding: '5px 8px',
    '& .MuiTypography-root': {
      fontSize: 12
    }
  }
}));
