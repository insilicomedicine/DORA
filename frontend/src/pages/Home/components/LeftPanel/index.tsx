import React, { CSSProperties, memo } from 'react';
import SideMenu from './components/SideMenu';
import StyledBox from '../StyledBox';
import useSideMenuStore from 'contexts/useSideMenuStore';
import { SxProps } from '@mui/material';
import SidebarCollapse from 'components/SidebarCollapse';

interface LeftPanelProps {
  sx?: SxProps;
  style?: CSSProperties;
  enableCollapseButton?: boolean;
}
const LeftPanel = ({
  sx = {},
  style = {},
  enableCollapseButton = false
}: LeftPanelProps) => {
  const { isCollapsed, toggleCollapse } = useSideMenuStore();
  return (
    <>
      {enableCollapseButton && isCollapsed && (
        <SidebarCollapse
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
          sx={{ ml: 1, position: 'absolute', top: 12, zIndex: 1 }}
        />
      )}
      <StyledBox sx={{ ...sx }} style={{ ...style }} isCollapsed={isCollapsed}>
        <SideMenu />
      </StyledBox>
    </>
  );
};

export default memo(LeftPanel);
