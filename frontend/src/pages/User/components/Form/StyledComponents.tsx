import { styled } from '@mui/material/styles';
import { Box, Button, Stack, Typography, FormHelperText } from '@mui/material';

export const FormWrapper = styled(Box)(({ theme }) => ({
  width: '78%',
  maxWidth: 414,
  minWidth: 220,
  [theme.breakpoints.down('md')]: {
    width: '100%'
  }
}));

export const FormTitle = styled(Typography)(({ theme }) => ({
  width: '100%',
  fontSize: 24,
  marginTop: 32,
  marginBottom: 8,
  lineHeight: 1.2,
  letterSpacing: 0,
  fontWeight: 400,
  [theme.breakpoints.down('md')]: {
    textAlign: 'center'
  }
}));

export const FormContainer = styled('form')(({ theme }) => ({
  width: '100%',
  marginTop: 32,
  [theme.breakpoints.down('md')]: {
    marginTop: 72
  }
}));

export const SpaceBottom = styled(Box)(({ theme }) => ({
  marginBottom: 3,
  [theme.breakpoints.down('md')]: {
    marginBottom: 4
  }
}));

export const ButtonsContainer = styled(Stack)(({}) => ({
  marginTop: 40
}));

export const ConfirmButton = styled(Button)(({ theme }) => ({
  height: 56,
  color: theme.palette.common.white,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: '24px',
  textTransform: 'uppercase',
  boxShadow: 'none!important'
}));

export const CancelButton = styled(Button)(({}) => ({
  height: 56,
  marginTop: 16,
  fontWeight: 700,
  fontSize: 16,
  lineHeight: '24px',
  letterSpacing: 0.15,
  textTransform: 'uppercase',
  borderRadius: 8
}));

export const FormFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  marginTop: 24,
  fontSize: 14,
  fontWeight: 400,
  color: theme.palette.text.secondary
}));

export const FormLink = styled('a')(({ theme }) => ({
  display: 'block',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 14,
  color: theme.palette.text.secondary,
  width: 'max-content',
  maxHeight: 16,
  '&:hover': {
    color: theme.palette.text.secondary,
    borderBottom: '1px solid #E0E0E0'
  }
}));

export const FormExternalLink = styled('a')(({ theme }) => ({
  display: 'inline-block',
  cursor: 'pointer',
  fontWeight: 400,
  fontSize: '1.35vw',
  width: 'max-content',
  borderBottom: '1px solid #212121',
  maxHeight: 36,
  '&:hover': {
    borderBottom: 'none'
  },
  [theme.breakpoints.up('xl')]: {
    fontSize: 24
  },
  [theme.breakpoints.down('md')]: {
    fontSize: 20
  }
}));

export const ValidationRules = styled(FormHelperText)(({ theme }) => ({
  '&.match': {
    color: theme.palette.success.main
  },
  '&.isMatched': {
    color: theme.palette.primary.main
  },
  '& svg': {
    verticalAlign: 'middle',
    marginRight: 4,
    width: 12,
    height: 12
  }
}));

export const ValidationRulesStrength = styled('span')(({ theme }) => ({
  marginLeft: 4,
  '&.weak': {
    color: theme.palette.error.main
  },
  '&.strong': {
    color: theme.palette.success.main
  }
}));

export const TermsAndConditions = styled(Typography)(({ theme }) => ({
  fontSize: '1.35vw',
  whiteSpace: 'nowrap',
  marginBottom: 80,
  letterSpacing: 0,
  [theme.breakpoints.up('xl')]: {
    fontSize: 24
  },
  [theme.breakpoints.down('md')]: {
    marginTop: 32,
    fontSize: 20
  }
}));
