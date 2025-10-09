import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import UserInputsDialog from './index';

const mockCloseHandler = vi.fn();

const mockDialogContentData = {
  templateName: 'Test Template',
  createdAt: '2024-10-22T12:00:00',
  userInputsData: [
    {
      display_name: 'key',
      value: 'value'
    }
  ],
  customBibliographyFiles: ['Bibliography 1', 'Bibliography 2'],
  customData: [
    { title: 'Custom Data 1', content: 'Content 1' },
    { title: 'Custom Data 2', content: 'Content 2' }
  ]
};

describe('UserInputsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dialog when open', () => {
    render(
      <UserInputsDialog
        open={true}
        handleClose={mockCloseHandler}
        dialogContentData={mockDialogContentData}
      />
    );

    const dialog = screen.getByTestId('userInputsDialog-wrapper');
    expect(dialog).toBeInTheDocument();
  });

  test('displays correct sections', () => {
    render(
      <UserInputsDialog
        open={true}
        handleClose={mockCloseHandler}
        dialogContentData={mockDialogContentData}
      />
    );

    // Check if each section is rendered
    expect(screen.getByText('Document inputs')).toBeInTheDocument();
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('22 Oct 2024, 12:00')).toBeInTheDocument();
    expect(screen.getByText('Custom bibliography')).toBeInTheDocument();
    expect(screen.getByText('Bibliography 1')).toBeInTheDocument();
    expect(screen.getByText('Bibliography 2')).toBeInTheDocument();
    expect(screen.getByText('Custom Data 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Data 2')).toBeInTheDocument();
  });

  test('calls handleClose when close button is clicked', () => {
    render(
      <UserInputsDialog
        open={true}
        handleClose={mockCloseHandler}
        dialogContentData={mockDialogContentData}
      />
    );

    const closeButton = screen.getByTestId('userInputsDialog-closeButton');
    fireEvent.click(closeButton);

    expect(mockCloseHandler).toHaveBeenCalledTimes(1);
  });

  test('does not render sections with empty content', () => {
    const emptyDialogContentData = {
      ...mockDialogContentData,
      userInputsData: null,
      customBibliographyFiles: null,
      customData: null
    };

    render(
      <UserInputsDialog
        open={true}
        handleClose={mockCloseHandler}
        dialogContentData={emptyDialogContentData}
      />
    );

    expect(screen.queryByText('Input')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom bibliography')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom data')).not.toBeInTheDocument();
  });
});
