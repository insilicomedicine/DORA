import React from 'react';
import { Typography, Stack } from '@mui/material';
import useSideMenuStore from 'contexts/useSideMenuStore';
import SidebarCollapse from 'components/SidebarCollapse';

interface TitleWrapperProps {
  name: string;
  generatingTime?: number;
  variant?: 'h6' | 'caption';
}

const Title = ({ name, generatingTime, variant = 'h6' }: TitleWrapperProps) => {
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
        <Typography
          fontWeight={500}
          {...(variant ? { variant } : { fontSize: 18 })}
          lineHeight="153%"
          textAlign="center"
        >
          Generating your {name}
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
