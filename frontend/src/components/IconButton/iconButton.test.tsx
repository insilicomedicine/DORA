import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import { vi } from 'vitest';
import IconButton from './index';
import { Add } from '@mui/icons-material';

describe('IconButton Component Tests', () => {
  const renderComponent = (props = {}) => {
    const defaultProps = {
      variant: 'filled' as const,
      children: <Add data-testid="add-icon" />
    };

    const finalProps = { ...defaultProps, ...props };

    return render(
      <ThemeProvider theme={theme}>
        <IconButton {...finalProps} />
      </ThemeProvider>
    );
  };

  it('should render the component correctly', () => {
    renderComponent();

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('add-icon')).toBeInTheDocument();
  });

  it('should apply correct styling for filled variant', () => {
    renderComponent();

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'rgb(33, 150, 95)',
      color: 'rgb(255, 255, 255)',
      padding: '6px 16px',
      borderRadius: '10px'
    });
  });

  it('should handle onClick events', () => {
    const mockOnClick = vi.fn();
    renderComponent({ onClick: mockOnClick });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom sx props', () => {
    const customSx = { margin: '10px' };
    renderComponent({ sx: customSx });

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ margin: '10px' });
  });

  it('should pass through other MUI IconButton props', () => {
    renderComponent({ disabled: true });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should render different children correctly', () => {
    renderComponent({
      children: <span data-testid="custom-child">Custom Content</span>
    });

    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });
});
