import React from 'react';
import { Typography, Stack } from '@mui/material';
import useSideMenuStore from 'contexts/useSideMenuStore';
import SidebarCollapse from 'components/SidebarCollapse';

interface TitleWrapperProps {
  name: string;
  generatingTime?: number;
}

const Title = ({ name, generatingTime }: TitleWrapperProps) => {
  const { isCollapsed, toggleCollapse } = useSideMenuStore();

  return (
    <Stack
      direction="row"
      sx={{
        margin: '16px 0',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {isCollapsed && (
        <SidebarCollapse
          toggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
        />
      )}
      <Stack sx={{ m: '0 auto' }}>
        <Typography fontSize={18} lineHeight="153%" textAlign="center">
          Generating your <strong style={{ fontWeight: 600 }}>{name}</strong>
        </Typography>
        <Typography fontSize={12} lineHeight="137%" color="#666666">
          Generating may take over {generatingTime} minutes. We will email you
          when it’s ready.
        </Typography>
      </Stack>
    </Stack>
  );
};

export default Title;
