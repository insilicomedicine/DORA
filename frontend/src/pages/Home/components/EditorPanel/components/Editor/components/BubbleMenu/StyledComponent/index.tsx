import { styled } from '@mui/material';

export const StyledPromptTitle = styled('span', {
  shouldForwardProp: (prop) => prop !== 'enableEditing'
})<{ enableEditing?: boolean }>(({ theme, enableEditing }) => ({
  ...(enableEditing && {
    padding: 4,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    width: '100%',
    '&:hover': {
      color: theme.palette.text.primary,
      borderRadius: 4,
      backgroundColor: '#E6E6E6',
      cursor: 'pointer'
    }
  })
}));
