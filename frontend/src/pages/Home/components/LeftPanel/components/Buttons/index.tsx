import { memo } from 'react';
import { IconButton, Stack, Theme, SxProps, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router';
import AddNewDocumentIcon from 'assets/icons/AddNewDocumentIcon';
import SidebarCollapse from 'components/SidebarCollapse';
import { useDocumentStore } from 'contexts/documentsStore';
import useSideMenuStore from 'contexts/useSideMenuStore';

interface ButtonsProps {
  sx?: SxProps<Theme>;
}

const Buttons = ({ sx = {} }: ButtonsProps) => {
  const nav = useNavigate();
  const { setNewDocument } = useDocumentStore();
  const { isCollapsed, toggleCollapse } = useSideMenuStore();
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', ml: 'auto', gap: 2, ...sx }}
    >
      <SidebarCollapse
        toggleCollapse={toggleCollapse}
        isCollapsed={isCollapsed}
      />
      <Tooltip title="New document" placement="top">
        <IconButton
          disableRipple
          sx={{ p: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            nav('/templates');
            setNewDocument(null);
          }}
          className="addNewDocumentButton"
        >
          <AddNewDocumentIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default memo(Buttons);
