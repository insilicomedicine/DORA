import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';
import NoData from '.';

// Mock the SVG component
vi.mock('assets/icons/folder.svg?react', () => ({
  default: ({ ...props }) => <svg data-testid="folder-icon" {...props} />
}));

const mockProps = {
  title: 'No data title',
  description: 'No data description',
  Actions: <div>Custom Actions</div>
};

describe('NoData', () => {
  const renderComponent = (props = {}) => {
    const finalProps = { ...mockProps, ...props };

    return render(
      <ThemeProvider theme={theme}>
        <NoData {...finalProps} />
      </ThemeProvider>
    );
  };

  it('should render NoData component', () => {
    const { getByText, getByTestId } = renderComponent();
    expect(getByText('No data title')).toBeInTheDocument();
    expect(getByText('No data description')).toBeInTheDocument();
    expect(getByText('Custom Actions')).toBeInTheDocument();
    expect(getByTestId('folder-icon')).toBeInTheDocument();
  });

  it('should render with default props when no props provided', () => {
    const { getByText, getByTestId } = renderComponent({
      title: undefined,
      description: undefined,
      Actions: undefined
    });
    expect(getByText('No documents created yet')).toBeInTheDocument();
    expect(
      getByText(
        "You haven't made any documents. Let's start with your first one."
      )
    ).toBeInTheDocument();
    expect(getByTestId('folder-icon')).toBeInTheDocument();
  });

  it('should apply custom style when provided', () => {
    const customStyle = { backgroundColor: 'red' };
    renderComponent({ style: customStyle });
  });
});
