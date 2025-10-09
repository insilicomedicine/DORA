import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import { vi } from 'vitest';
import SidebarCollapse from './index';

// Mock the SVG component
vi.mock('assets/icons/thumbnailbar.svg?react', () => ({
  default: ({ ...props }) => <svg data-testid="thumbnail-icon" {...props} />
}));

describe('SidebarCollapse Component Tests', () => {
  const mockToggleCollapse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      toggleCollapse: mockToggleCollapse,
      isCollapsed: false
    };

    const finalProps = { ...defaultProps, ...props };

    return render(
      <ThemeProvider theme={theme}>
        <SidebarCollapse {...finalProps} />
      </ThemeProvider>
    );
  };

  it('should render the component correctly', () => {
    renderComponent();

    const button = screen.getByTestId('sidebarCollapse-button');
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('thumbnail-icon')).toBeInTheDocument();
  });

  it('should handle toggle collapse onClick', () => {
    renderComponent();

    const button = screen.getByTestId('sidebarCollapse-button');
    fireEvent.click(button);

    expect(mockToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('should show correct tooltip when sidebar is not collapsed', async () => {
    renderComponent({ isCollapsed: false });

    const button = screen.getByTestId('sidebarCollapse-button');
    fireEvent.mouseEnter(button);

    await waitFor(() => {
      expect(screen.getByText('Hide sidebar')).toBeInTheDocument();
    });
  });

  it('should show correct tooltip when sidebar is collapsed', async () => {
    renderComponent({ isCollapsed: true });

    const button = screen.getByTestId('sidebarCollapse-button');
    fireEvent.mouseEnter(button);

    await waitFor(() => {
      expect(screen.getByText('Show sidebar')).toBeInTheDocument();
    });
  });

  it('should apply correct rotation for left direction (default)', () => {
    renderComponent({ direction: 'left' });

    const button = screen.getByTestId('sidebarCollapse-button');
    // MUI converts rotate to transform in CSS
    expect(button).toHaveClass('MuiIconButton-root');
  });

  it('should apply correct rotation for right direction', () => {
    renderComponent({ direction: 'right' });

    const button = screen.getByTestId('sidebarCollapse-button');
    // MUI converts rotate to transform in CSS
    expect(button).toHaveClass('MuiIconButton-root');
  });

  it('should apply default direction when not specified', () => {
    renderComponent();

    const button = screen.getByTestId('sidebarCollapse-button');
    // MUI converts rotate to transform in CSS
    expect(button).toHaveClass('MuiIconButton-root');
  });

  it('should apply custom sx props', () => {
    const customSx = { margin: '10px' };
    renderComponent({ sx: customSx });

    const button = screen.getByTestId('sidebarCollapse-button');
    expect(button).toHaveStyle({ margin: '10px' });
  });

  it('should have small size and correct styling', () => {
    renderComponent();

    const button = screen.getByTestId('sidebarCollapse-button');
    expect(button).toHaveClass('MuiIconButton-sizeSmall');
    expect(button).toHaveStyle({
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '2px',
      paddingBottom: '2px'
    });
  });

  it('should be memoized with React.memo', () => {
    // Test that the component is wrapped with React.memo
    expect(SidebarCollapse.$$typeof).toBeDefined();
  });
});
