import { memo } from 'react';
import { Theme, SxProps } from '@mui/material';
import { useDebounce } from 'hooks/useDebounce';
import useSideMenuStore from 'contexts/useSideMenuStore';
import Buttons from '..';

interface ButtonsProps {
  sx?: SxProps<Theme>;
}

const LeftPanelButtons = ({ sx = {} }: ButtonsProps) => {
  const { isCollapsed = false } = useSideMenuStore();
  const isShowCollapseButton = useDebounce(isCollapsed, 200);
  return (
    <>
      {isCollapsed && (
        <Buttons
          sx={{
            display: isShowCollapseButton ? 'flex' : 'none',
            ...sx
          }}
        />
      )}
    </>
  );
};

export default memo(LeftPanelButtons);
