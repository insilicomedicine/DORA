import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Menu from '.';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';

// Mocking the navigate function from react-router
vi.mock('react-router', () => ({
  ...vi.importActual('react-router'),
  useParams: () => vi.fn(),
  useNavigate: () => vi.fn()
}));

const mockHandleMenuClick = vi.fn();

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <Menu
        target={{
          id: '1',
          status: 'completed',
          stage: '',
          title: 'Test Document'
        }}
        hanleMenuClick={mockHandleMenuClick}
      />
    </ThemeProvider>
  );
};

describe('Menu component tests', () => {
  const mockDeleteDocument = vi.fn();
  const mockExportDocument = vi.fn();

  beforeEach(() => {
    renderComponent();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should open and close the menu when the button is clicked', () => {
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Check if the menu is opened
    expect(mockHandleMenuClick).toHaveBeenCalledWith(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(document.body);

    // Check if the menu is closed
    waitFor(() => {
      expect(mockHandleMenuClick).toHaveBeenCalledWith(false);
    });
  });

  it('should call handleExportPaper when Export PDF is clicked', async () => {
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const exportPDF = screen.getByText('Export PDF');
    fireEvent.click(exportPDF);

    waitFor(() => {
      expect(mockExportDocument).not.toHaveBeenCalled();
    });
  });

  it('should open delete dialog when delete menu item is clicked', () => {
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const deleteItem = screen.getByText('Delete');
    fireEvent.click(deleteItem);

    expect(screen.getByText('Delete Document?')).toBeInTheDocument();
  });

  it('should call handleDeleteDocument when delete is confirmed', async () => {
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const deleteItem = screen.getByText('Delete');
    fireEvent.click(deleteItem);

    expect(screen.getByText('Delete Document?')).toBeInTheDocument();

    const confirmDelete = screen.getByTestId('dialog-confirm-button');
    fireEvent.click(confirmDelete);

    waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalled();
    });
  });
});
