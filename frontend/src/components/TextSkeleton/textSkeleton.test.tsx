import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import TextSkeleton from './index';

describe('TextSkeleton Component Tests', () => {
  const renderComponent = () => {
    return render(
      <ThemeProvider theme={theme}>
        <TextSkeleton />
      </ThemeProvider>
    );
  };

  it('should render the component correctly', () => {
    const { container } = renderComponent();

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(3);
  });

  it('should render three skeleton lines with different properties', () => {
    const { container } = renderComponent();

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(3);

    // First skeleton should have 76% width
    expect(skeletons[0]).toHaveStyle({
      width: '76%',
      height: '24px'
    });

    // Second skeleton should have wave animation
    expect(skeletons[1]).toHaveClass('MuiSkeleton-wave');
    expect(skeletons[1]).toHaveStyle({
      height: '24px'
    });

    // Third skeleton should have no animation and 87% width
    expect(skeletons[2]).toHaveStyle({
      width: '87%',
      height: '24px'
    });
  });

  it('should render skeletons in a Stack container', () => {
    const { container } = renderComponent();

    const stackContainer = container.querySelector('.MuiStack-root');
    expect(stackContainer).toBeInTheDocument();
  });

  it('should have consistent height for all skeleton lines', () => {
    const { container } = renderComponent();

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveStyle({ height: '24px' });
    });
  });
});
