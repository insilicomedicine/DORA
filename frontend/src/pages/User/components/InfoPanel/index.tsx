import React from 'react';
import { styled } from '@mui/material/styles';
import { Button, Stack } from '@mui/material';
import BackgroundImg from 'assets/login/background.png';
import { getLandingPageURL } from 'utils/router';

const PageInfoWrapper = styled(Stack)(({ theme }) => ({
  position: 'relative',
  width: '66.5%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundImage: `url(${BackgroundImg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  overflow: 'hidden',
  display: 'none',
  borderRadius: 16,

  [theme.breakpoints.up('sm')]: {
    display: 'flex'
  },
  [theme.breakpoints.down('md')]: {
    display: 'none'
  }
}));

const ContentWrapper = styled(Stack)(({ theme }) => ({
  justifyContent: 'flex-start',
  width: 560,
  maxHeight: 432,
  padding: '72px 40px',
  textAlign: 'center',
  borderRadius: 16,
  color: theme.palette.primary.main,
  border: '2px solid rgba(255, 255, 255, 0.50)',
  background: 'rgba(255, 255, 255, 0.65)',
  boxShadow: '0px 0px 32px 0px rgba(0, 0, 0, 0.04)',
  backdropFilter: 'blur(19px)'
}));

const ContentTitle = styled('h2')({
  padding: 0,
  margin: '0 auto',
  maxWidth: 440,
  fontWeight: 900,
  fontSize: 38,
  letterSpacing: 1.52,
  lineHeight: '48px'
});

const ContentText = styled('span')({
  fontSize: 18,
  maxWidth: 385,
  margin: '12px auto 0',
  lineHeight: 1.53,
  letterSpacing: 0.15
});

const StyledButton = styled(Button)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: 700,
  fontSize: 16,
  width: 280,
  height: 56,
  textTransform: 'uppercase',
  marginTop: 40,
  letterSpacing: 0.15
}));

const InfoPanel = () => {
  return (
    <PageInfoWrapper>
      <ContentWrapper>
        <ContentTitle>Unlock the future of scientific writing</ContentTitle>
        <ContentText>
          DORA is an advanced AI-driven tool designed to streamline the process
          of drafting academic papers and other related documents
        </ContentText>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={getLandingPageURL()}
          style={{ textDecoration: 'none' }}
        >
          <StyledButton type="submit" variant="outlined">
            Learn more
          </StyledButton>
        </a>
      </ContentWrapper>
    </PageInfoWrapper>
  );
};

export default InfoPanel;
