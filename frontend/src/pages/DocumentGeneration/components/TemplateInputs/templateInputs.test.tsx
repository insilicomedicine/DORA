import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TemplateInputs from '.';
import * as useSettingsStore from 'contexts/useSettingsStore';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { theme } from 'theme';

// Mock the Zustand store hook
vi.mock('contexts/useSettingsStore');

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );
};

describe('TemplateInputs Component', () => {
  const mockSetUserInputs = vi.fn();
  const mockUserInputs = {};

  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
    // Mock the Zustand store return values
    (useSettingsStore as any).default.mockReturnValue({
      setUserInputs: mockSetUserInputs,
      user_inputs: mockUserInputs
    });
  });

  test('renders the component with default props', () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 100,
        default_value: 'default value 1',
        display_size: 'auto'
      }
    ];
    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={vi.fn()}
      />
    );
    expect(screen.getByText('Input 1')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g. default value 1')
    ).toBeInTheDocument();
  });

  test('renders multiple inputs correctly', () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 100,
        default_value: 'default value 1',
        display_size: 'auto'
      },
      {
        slug: 'input2',
        display_name: 'Input 2',
        text_limit: 200,
        default_value: 'default value 2',
        display_size: 'large'
      }
    ];
    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={vi.fn()}
      />
    );
    expect(screen.getByText('Input 1')).toBeInTheDocument();
    expect(screen.getByText('Input 2')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g. default value 1')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g. default value 2')
    ).toBeInTheDocument();
  });

  test('changes input values and handle debounce', async () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 100,
        default_value: 'default value 1',
        display_size: 'auto'
      }
    ];
    const handleUpdateDocumentMock = vi.fn();
    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={handleUpdateDocumentMock}
      />
    );
    const input = screen.getByPlaceholderText(
      'e.g. default value 1'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new value' } });
    // Wait for debounce effect
    await waitFor(() => {
      expect(handleUpdateDocumentMock).toHaveBeenCalledTimes(1);
    });
    expect(handleUpdateDocumentMock).toHaveBeenCalledWith({
      user_inputs: expect.objectContaining({ input1: 'new value' })
    });
  });

  test('calls handleUpdateDocument with correct values', async () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 200,
        default_value: 'default value 1',
        display_size: 'auto'
      }
    ];
    const handleUpdateDocumentMock = vi.fn();
    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={handleUpdateDocumentMock}
      />
    );
    const input = screen.getByPlaceholderText(
      'e.g. default value 1'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'another value' } });
    // Wait for debounce to take effect
    await waitFor(() => {
      expect(handleUpdateDocumentMock).toHaveBeenCalledTimes(1);
    });
    expect(handleUpdateDocumentMock).toHaveBeenCalledWith({
      user_inputs: expect.objectContaining({ input1: 'another value' })
    });
  });

  test('renders the suggested context alert and handles insert', async () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 100,
        default_value: 'default {input2} value 1',
        display_size: 'auto'
      },
      {
        slug: 'input2',
        display_name: 'Input 2',
        text_limit: 200,
        default_value: 'default value 2',
        display_size: 'auto'
      }
    ];
    const handleUpdateDocumentMock = vi.fn();

    (useSettingsStore as any).default.mockReturnValue({
      setUserInputs: mockSetUserInputs,
      user_inputs: {
        input2: 'pre-filled value 2'
      }
    });

    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={handleUpdateDocumentMock}
      />
    );

    const input = screen.getByPlaceholderText(
      'e.g. default default value 2 value 1'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new value' } });

    await waitFor(() => {
      expect(handleUpdateDocumentMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Suggested Context')).toBeInTheDocument();
    const insertButton = screen.getByText('Insert');
    fireEvent.click(insertButton);

    const updatedInput = screen.getByPlaceholderText(
      'e.g. default default value 2 value 1'
    ) as HTMLInputElement;
    expect(updatedInput.value).toBe('default pre-filled value 2 value 1');
  });

  test('hides the suggested context alert when conditions are not met', () => {
    const templateUserInputs = [
      {
        slug: 'input1',
        display_name: 'Input 1',
        text_limit: 100,
        default_value: 'default value 1',
        display_size: 'auto'
      }
    ];
    renderWithProviders(
      <TemplateInputs
        templateUserInputs={templateUserInputs}
        handleUpdateDocument={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText(
      'e.g. default value 1'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByText('Suggested Context')).not.toBeInTheDocument();
  });
});
