import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { AccountCircleOutlined } from '@mui/icons-material';
import DORA from 'assets/icons/Science42DORA.svg?react';
import { useUserStore } from 'contexts/useUserStore';
import PharmaMenu from './PharmaMenu';
import UserMenu from './UserMenu';
import useGAUserDimensions from 'hooks/useGAUserDimensions';

const headerLinks = [
  {
    title: 'Blog',
    url: 'https://insilico.com/blog/science42-dora'
  },
  {
    title: 'Tutorial',
    url: 'https://insilico.com/science42/dora/help'
  }
];

const Header = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { userInfo } = useUserStore();
  const isTermsAndPrivacyAccepted = userInfo?.terms_and_privacy_accepted;

  const isMenuOpen = Boolean(anchorEl);

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  useGAUserDimensions();

  return (
    <>
      <AppBar
        sx={{
          position: 'relative',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          flex: '0 1 auto',
          '& .MuiButtonBase-root': {
            borderRadius: 2
          },
          zIndex: 1,
          padding: { xs: '4px 0', md: 0 }
        }}
      >
        <Toolbar style={{ minHeight: 56, padding: '0 16px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: { xs: 'row-reverse', md: 'row' },
              justifyContent: { xs: 'center', md: 'flex-start' },
              width: { xs: '100%', md: 'auto' }
            }}
          >
            <PharmaMenu />
            <a href="/" style={{ maxHeight: 22 }}>
              <DORA />
            </a>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {!Object.keys(userInfo).length || !isTermsAndPrivacyAccepted ? (
            <></>
          ) : (
            <Box
              gap={2}
              sx={{ display: { xs: 'none', md: 'flex' } }}
              alignItems="center"
            >
              {headerLinks.map((link) => (
                <Typography
                  key={link.title}
                  color="text.secondary"
                  variant="caption"
                  fontWeight={500}
                  sx={{
                    '&:hover': {
                      color: 'text.primary'
                    }
                  }}
                >
                  <a
                    key={link.title}
                    href={link.url}
                    style={{
                      fontFamily: 'inherit'
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ga-event={link.title}
                    data-ga-event-location="header"
                  >
                    {link.title}
                  </a>
                </Typography>
              ))}
              <IconButton
                disableRipple
                sx={{
                  p: 0.75,
                  color: isMenuOpen ? 'primary.main' : 'grey.500',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'transparent'
                  }
                }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <AccountCircleOutlined fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <UserMenu
        anchorEl={anchorEl}
        isMenuOpen={isMenuOpen}
        handleMenuClose={handleMenuClose}
      />
    </>
  );
};

export default Header;
