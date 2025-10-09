import React, { useState, memo } from 'react';
import type { MouseEvent } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { TypographyProps } from '@mui/material/Typography';
import AppMenuIcon from 'assets/header/AppMenu.svg?react';
import inClinico from 'assets/header/InClinico.svg?react';
import Chemistry42 from 'assets/header/Chemistry42.svg?react';
import PandaOmics from 'assets/header/PandaOmics.svg?react';
import GenerativeBiologics from 'assets/header/GenerativeBiologics.svg?react';
import { theme } from 'theme';

interface MenuItemType {
  name: string;
  link: string;
  IconComponent?: React.ComponentType<{ className?: string }>;
  testId: string;
  textSize?: TypographyProps['variant'];
}

const PharmaMenu = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleItemClick = (link: string) => {
    window.open(link, '_blank', 'noreferrer');
    handleClose();
  };

  const links: readonly MenuItemType[] = [
    {
      name: 'PandaOmics',
      link: 'https://pandaomics.com/access',
      IconComponent: PandaOmics,
      testId: 'pandaOmicsTest'
    },
    {
      name: 'Chemistry42',
      link: 'https://pharma.ai/chemistry42',
      IconComponent: Chemistry42,
      testId: 'chemistry42Test'
    },
    {
      name: 'inClinico',
      link: 'https://inclinico.com/',
      IconComponent: inClinico,
      testId: 'inClinicoTest'
    },
    {
      name: 'Generative Biologics',
      link: 'https://pharma.ai/generativebiologics',
      IconComponent: GenerativeBiologics,
      testId: 'generativeBiologicsTest'
    },
    {
      name: 'More apps',
      textSize: 'body2',
      link: 'https://pharma.ai',
      testId: 'moreAppsTest'
    }
  ];

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Open apps menu"
        aria-controls={open ? 'pharma-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          mr: 1,
          p: 1.25,
          color: open ? 'primary.main' : 'grey.500',
          [theme.breakpoints.down('md')]: {
            position: 'absolute',
            right: 8,
            top: 8
          },
          '&:hover': {
            color: 'primary.main',
            backgroundColor: 'transparent'
          }
        }}
        onClick={handleClick}
      >
        <AppMenuIcon />
      </IconButton>

      <Menu
        keepMounted
        id="pharma-menu"
        anchorEl={anchorEl}
        open={open}
        data-testid="headerUserMenu-openMenuButton"
        onClose={handleClose}
        sx={{
          '& .MuiMenu-paper': {
            width: 230,
            pt: 2,
            borderRadius: 4,
            boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
          },
          '& .MuiMenu-list': {
            py: 0
          }
        }}
      >
        <Typography
          variant="body2"
          color="text.disabled"
          pl={3}
          lineHeight={1.45}
          fontWeight={500}
          letterSpacing={0.1}
        >
          Pharma.ai Suite
        </Typography>

        {links.map(({ link, IconComponent, name, testId, textSize }) => (
          <MenuItem
            key={testId}
            sx={{
              display: 'flex',
              px: 3,
              py: 0.75,
              alignItems: 'center',
              '&:hover': {
                backgroundColor: 'grey.50'
              }
            }}
            onClick={() => handleItemClick(link)}
            data-testid={testId}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              {IconComponent && <IconComponent />}
              <Typography
                variant={textSize || 'body1'}
                lineHeight={1.5}
                letterSpacing={0.15}
                py={0.5}
              >
                {name}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default memo(PharmaMenu);
