import React from 'react';
import { BrowserRouter } from 'react-router';
import { ThemeProvider, styled } from '@mui/material/styles';
import AssignmentLateRounded from '@mui/icons-material/AssignmentLateRounded';
import { SnackbarProvider, MaterialDesignContent } from 'notistack';
import MainContainer from './components/MainContainer';
import { SnackbarUtilsConfigurator } from 'utils/snackbar';
import { theme } from './theme';

const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
  '&.notistack-MuiContent-info': {
    maxHeight: 48,
    backgroundColor: '#616161',
    borderRadius: 8,
    padding: '6px 16px',
    boxShadow: 'none',
    '& #notistack-snackbar': {
      padding: 0
    }
  },
  '&.notistack-MuiContent-warning': {
    width: '50%',
    backgroundColor: '#FFEBC2',
    borderRadius: 8,
    padding: '8px 16px',
    boxShadow: 'none'
  }
}));

const App = (props) => {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <SnackbarProvider
          Components={{
            info: StyledMaterialDesignContent,
            warning: StyledMaterialDesignContent
          }}
          iconVariant={{
            warning: <AssignmentLateRounded htmlColor="#E8A728" />
          }}
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          autoHideDuration={2000}
        >
          <SnackbarUtilsConfigurator />
        </SnackbarProvider>
        <MainContainer {...props} />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
