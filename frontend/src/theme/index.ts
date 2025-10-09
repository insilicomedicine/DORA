import { createTheme } from '@mui/material/styles';
import { Theme } from '@mui/system';

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    bp1300: true;
    bp1500: true;
    bp1600: true;
    bp1800: true;
  }
}

declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsSizeOverrides {
    xsmall: true;
  }
}

export const theme: Theme = createTheme({
  palette: {
    mode: 'light',
    common: {
      black: '#212121',
      white: '#FFFFFF'
    },
    primary: {
      main: '#21965F',
      light: '#E7F6EE',
      dark: '#1C8554'
    },
    secondary: {
      main: '#29A96D',
      dark: '#FF2D26',
      light: '#F9A09A'
    },
    success: {
      main: '#00AB61',
      dark: '#009152',
      light: '#65CFA4'
    },
    info: {
      main: '#919191'
    },
    warning: {
      main: '#8A4908',
      dark: '#FFA000',
      light: '#FFD54F'
    },
    error: {
      main: '#F44336',
      dark: '#E31B0C',
      light: '#F88078'
    },
    text: {
      primary: '#212121',
      secondary: '#666666',
      disabled: '#9E9E9E'
    },
    grey: {
      50: '#F5F5F5',
      100: '#F8F8F8',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#666666',
      800: '#424242',
      900: '#212121'
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1280,
      xl: 1536,
      bp1300: 1300,
      bp1500: 1500,
      bp1600: 1600,
      bp1800: 1800
    }
  },
  components: {
    MuiStack: {
      defaultProps: {
        useFlexGap: true
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
          boxShadow: 'none',
          letterSpacing: 0.1,
          '&:hover': {
            boxShadow: 'none'
          },
          '&.MuiButton-containedPrimary': {
            '&.Mui-disabled': {
              color: '#BDBDBD',
              backgroundColor: '#E0E0E0'
            }
          },
          '& .MuiButton-startIcon': {
            marginLeft: -8,
            marginRight: 4
          },
          '& .MuiButton-endIcon': {
            marginLeft: 4,
            marginRight: -4
          }
        },
        outlined: {
          '&.MuiButton-outlinedPrimary': {
            borderColor: '#21965F'
          },
          ':disabled': {
            borderColor: '#BDBDBD'
          }
        },
        text: {
          '&:hover': {
            color: '#1C8554',
            backgroundColor: '#E7F6EE'
          }
        },
        sizeLarge: {
          padding: '6px 20px',
          fontSize: 16
        },
        sizeMedium: {
          padding: '5px 16px',
          lineHeight: 1.45,
          textTransform: 'none'
        },
        sizeSmall: {
          padding: '4px 12px',
          minWidth: 'max-content',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: '16px',
          letterSpacing: 0
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          alignItems: 'center',
          borderRadius: 8
        },
        standardSuccess: {
          backgroundColor: '#F2FCF7',
          color: '#1C8554',
          border: '1px solid #C4E9D5'
        },
        standardError: {
          backgroundColor: '#FEECEB',
          color: '#621B16'
        },
        standardWarning: {
          backgroundColor: '#FFEBC2',
          color: '#8A4908'
        },
        standardInfo: {
          backgroundColor: '#F2F2F2',
          color: '#767676'
        },
        message: {
          padding: 0,
          '& .MuiAlertTitle-root': {
            marginTop: 0,
            marginBottom: 4,
            letterSpacing: 0
          }
        },

        action: {
          padding: 0,
          marginRight: 0,
          button: {
            padding: '4px 12px',
            minWidth: 'max-content',
            color: 'inherit',
            letterSpacing: 0,
            pointerEvents: 'auto',
            textTransform: 'none',
            '&.MuiIconButton-root': {
              padding: 3
            }
          }
        },
        icon: {
          '& .MuiSvgIcon-root': {
            fontSize: 22
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          maxWidth: 500,
          padding: '5px 8px',
          textAlign: 'center',
          backgroundColor: '#616161',
          color: '#FFFFFF',
          lineHeight: 1.37,
          fontSize: 12,
          borderRadius: 8,
          whiteSpace: 'pre-line',
          '& .MuiTooltip-arrow': {
            color: '#616161'
          },
          '&.MuiTooltip-tooltipPlacementTop': {
            marginBottom: '3px !important'
          },
          '&.MuiTooltip-tooltipPlacementBottom': {
            marginTop: '3px !important'
          }
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: '#F8F8F8'
        },
        track: {
          backgroundColor: '#9E9E9E',
          opacity: 1
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#D5D5D5'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: '#212121'
            }
          },
          '& .MuiInputLabel-root': {
            '&.Mui-focused': {
              color: '#212121'
            }
          },
          textarea: {
            scrollbarWidth: 'thin',
            scrollbarColor: '#BDBDBD #f8f8f8'
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: '#212121'
            }
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#F2F2F2'
        }
      }
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          '&.MuiSvgIcon-fontSizeXsmall': {
            fontSize: '16px !important'
          }
        }
      }
    },
    MuiTypography: {
      styleOverrides: {
        body2: {
          lineHeight: 1.45,
          letterSpacing: 0.15
        },
        caption: {
          letterSpacing: 0,
          lineHeight: 1.37
        }
      }
    }
  }
});
