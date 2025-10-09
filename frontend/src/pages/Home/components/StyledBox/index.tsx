import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

const StyledBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCollapsed'
})<{ isCollapsed?: boolean }>(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 0 : '454px',
  height: '100%',
  opacity: isCollapsed ? 0 : 1,
  transition: isCollapsed
    ? 'opacity 200ms ease-out, width 200ms 80ms ease-out'
    : 'width 200ms ease-out, opacity 200ms 150ms ease-out',
  overflow: 'hidden',
  borderRadius: 16,
  backgroundColor: 'white',

  ...(!isCollapsed && {
    [theme.breakpoints.down('bp1800')]: {
      width: 369
    },
    [theme.breakpoints.down('bp1600')]: {
      width: 350
    },
    [theme.breakpoints.down('bp1500')]: {
      width: 336
    },
    [theme.breakpoints.down('bp1300')]: {
      width: 324
    }
  })
}));

export default StyledBox;
