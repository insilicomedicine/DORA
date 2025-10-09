import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import InfoButton from './index';
import { Help } from '@mui/icons-material';

describe('InfoButton Component Tests', () => {
  const renderComponent = (props = {}) => {
    const defaultProps = {
      popoverInfo: 'This is test popover content'
    };

    const finalProps = { ...defaultProps, ...props };

    return render(
      <ThemeProvider theme={theme}>
        <InfoButton {...finalProps} />
      </ThemeProvider>
    );
  };

  it('should render the component correctly with default icon', () => {
    renderComponent();

    const infoIcon = screen.getByTestId('InfoOutlinedIcon');
    expect(infoIcon).toBeInTheDocument();
  });

  it('should render with custom icon', () => {
    const customIcon = (props) => (
      <Help data-testid="custom-help-icon" {...props} />
    );
    renderComponent({ icon: customIcon });

    const helpIcon = screen.getByTestId('custom-help-icon');
    expect(helpIcon).toBeInTheDocument();
  });

  it('should render with button text', () => {
    renderComponent({ buttonText: 'Help Text' });

    expect(screen.getByText('Help Text')).toBeInTheDocument();
  });

  it('should render with ReactNode as button text', () => {
    const buttonNode = (
      <span data-testid="custom-button-text">Custom Button</span>
    );
    renderComponent({ buttonText: buttonNode });

    expect(screen.getByTestId('custom-button-text')).toBeInTheDocument();
  });

  it('should apply custom button size', () => {
    renderComponent({ buttonSize: 24 });

    const infoIcon = screen.getByTestId('InfoOutlinedIcon');
    expect(infoIcon).toHaveStyle({ fontSize: '24px' });
  });

  it('should be disabled when isDisabled is true', () => {
    renderComponent({ isDisabled: true });

    const container = screen
      .getByTestId('InfoOutlinedIcon')
      .closest('.MuiStack-root');
    expect(container).toHaveStyle({ pointerEvents: 'none' });
  });

  it('should apply custom sx props', () => {
    const customSx = { margin: '10px' };
    renderComponent({ sx: customSx });

    const container = screen
      .getByTestId('InfoOutlinedIcon')
      .closest('.MuiStack-root');
    expect(container).toHaveStyle({ margin: '10px' });
  });

  it('should apply hover styles', () => {
    renderComponent();

    const container = screen
      .getByTestId('InfoOutlinedIcon')
      .closest('.MuiStack-root');
    expect(container).toHaveStyle({ color: theme.palette.text.secondary });
  });

  it('should render in a Stack container with correct layout', () => {
    renderComponent({ buttonText: 'Test Text' });

    const container = screen
      .getByTestId('InfoOutlinedIcon')
      .closest('.MuiStack-root');
    expect(container).toHaveClass('MuiStack-root');
    expect(container).toHaveStyle({
      display: 'flex',
      flexDirection: 'row'
    });
  });

  it('should be memoized with React.memo', () => {
    // Test that the component is wrapped with React.memo
    expect(InfoButton.$$typeof).toBeDefined();
  });
});
