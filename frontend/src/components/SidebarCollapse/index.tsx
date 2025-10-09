import ThumbnailbarIcon from 'assets/icons/thumbnailbar.svg?react';
import { memo } from 'react';
import { IconButton, SxProps, Theme, Tooltip } from '@mui/material';

interface SidebarCollapseProps {
  sx?: SxProps<Theme>;
  toggleCollapse: () => void;
  isCollapsed: boolean;
  direction?: 'left' | 'right';
}

const SidebarCollapse = ({
  sx = {},
  toggleCollapse,
  isCollapsed,
  direction = 'left'
}: SidebarCollapseProps) => {
  return (
    <Tooltip
      title={`${!isCollapsed ? 'Hide sidebar' : 'Show sidebar'}`}
      placement="top"
    >
      <IconButton
        data-testid="sidebarCollapse-button"
        size="small"
        onClick={toggleCollapse}
        sx={{
          rotate: direction === 'right' ? '180deg' : '0deg',
          px: 0,
          py: 0.25,
          color: 'grey.600',
          '&:hover': {
            color: 'primary.main',
            backgroundColor: 'transparent'
          },
          ...sx
        }}
      >
        <ThumbnailbarIcon />
      </IconButton>
    </Tooltip>
  );
};

export default memo(SidebarCollapse);
