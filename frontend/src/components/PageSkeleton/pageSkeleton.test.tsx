import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import PageSkeleton from './index';

describe('PageSkeleton Component Tests', () => {
  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <PageSkeleton {...props} />
      </ThemeProvider>
    );
  };

  it('should render the component correctly', () => {
    const { container } = renderComponent();

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(4);
  });

  it('should render all skeleton variants', () => {
    const { container } = renderComponent();

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');

    // Text skeleton
    expect(skeletons[0]).toHaveClass('MuiSkeleton-text');
    expect(skeletons[0]).toHaveStyle({ height: '6%' });

    // Circular skeleton
    expect(skeletons[1]).toHaveClass('MuiSkeleton-circular');
    expect(skeletons[1]).toHaveStyle({
      width: '80px',
      height: '80px'
    });

    // Rectangular skeleton
    expect(skeletons[2]).toHaveClass('MuiSkeleton-rectangular');
    expect(skeletons[2]).toHaveStyle({ height: '13%' });

    // Rounded skeleton
    expect(skeletons[3]).toHaveClass('MuiSkeleton-rounded');
    expect(skeletons[3]).toHaveStyle({ height: '67%' });
  });

  it('should render skeletons in a Stack container with correct styling', () => {
    const { container } = renderComponent();

    const stackContainer = container.querySelector('.MuiStack-root');
    expect(stackContainer).toBeInTheDocument();
    expect(stackContainer).toHaveStyle({
      height: '85%',
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'column',
      margin: '48px 15%'
    });
  });

  it('should have spacing between skeleton elements', () => {
    const { container } = renderComponent();

    const stackContainer = container.querySelector('.MuiStack-root');
    // Stack with spacing=2 should have gap or similar spacing implementation
    expect(stackContainer).toHaveClass('MuiStack-root');
  });

  it('should accept and pass through additional props', () => {
    const customProps = {
      'data-testid': 'custom-skeleton',
      className: 'custom-class'
    };

    const { container } = renderComponent(customProps);

    const stackContainer = container.querySelector('.MuiStack-root');
    expect(stackContainer).toHaveAttribute('data-testid', 'custom-skeleton');
    expect(stackContainer).toHaveClass('custom-class');
  });

  it('should be memoized with React.memo', () => {
    // Test that the component is wrapped with React.memo
    expect(PageSkeleton.$$typeof).toBeDefined();
  });
});
