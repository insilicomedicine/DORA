import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import UserDocument from './index';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';

// Mocking the navigate function from react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('UserDocument Component', () => {
  const defaultProps: any = {
    id: '1',
    template_name: 'template name',
    title: 'Sample Document',
    stage: 'polishing',
    status: 'completed',
    created_at: '2023-10-01',
    isNew: false
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <UserDocument {...props} />
        </BrowserRouter>
      </ThemeProvider>
    );
  };

  it('should render with New Document when isNew is true', () => {
    renderComponent({ ...defaultProps, isNew: true });
    expect(screen.getByText(/New Document/i)).toBeInTheDocument();
  });

  it('should render document corrently', () => {
    renderComponent();
    expect(screen.getByText('Sample Document')).toBeInTheDocument();
    expect(screen.getByText('template name')).toBeInTheDocument();
    //date should be formatted
    expect(screen.getByText('1 Oct 2023')).toBeInTheDocument();
  });
});
