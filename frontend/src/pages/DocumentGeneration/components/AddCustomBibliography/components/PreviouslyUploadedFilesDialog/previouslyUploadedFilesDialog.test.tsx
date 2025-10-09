import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, MockedFunction } from 'vitest';
import Dialog from './index';
import { getBibliographyFiles } from 'services/files';
import { FileUploadStatuses } from 'types/file';

vi.mock('services/files', () => ({
  getBibliographyFiles: vi.fn()
}));

describe('Dialog Component', () => {
  const defaultProps = {
    open: true,
    handleClose: vi.fn(),
    selectedFilesIndexes: [],
    setSelectedFilesIndexes: vi.fn(),
    filesFromPreviouslyUploadedDialog: [],
    setFilesFromPreviouslyUploadedDialog: vi.fn(),
    filesToAdd: []
  };

  const mockFilesResults = [
    {
      pk: 1,
      status: FileUploadStatuses.processed,
      name: 'File 1',
      updated_at: new Date()
    },
    {
      pk: 2,
      status: FileUploadStatuses.processed,
      name: 'File 2',
      updated_at: new Date()
    }
  ];

  const mockFiles = {
    next: null,
    previous: null,
    results: mockFilesResults
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders loading state initially', async () => {
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({
      data: { results: [], next: null }
    });
    render(<Dialog {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => expect(getBibliographyFiles).toHaveBeenCalled());
  });
  it('displays "No Files" message when no files are available', async () => {
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({
      data: { results: [], next: null }
    });
    render(<Dialog {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Uploaded files will be displayed here/)
      ).toBeInTheDocument();
    });
  });
  it('displays files table when files are available', async () => {
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({
      data: mockFiles
    });

    render(<Dialog {...defaultProps} />);

    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );

    expect(screen.getByText('File 1')).toBeInTheDocument();
    expect(screen.getByText('File 2')).toBeInTheDocument();
  });
  it('disables Attach button when no files are selected', async () => {
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({ data: [] });
    render(<Dialog {...defaultProps} />);

    await waitFor(() => {
      const attachButton = screen.getByText('Attach');
      expect(attachButton).toBeDisabled();
      expect(attachButton).toHaveTextContent('Attach');
    });
  });
  it('enables Attach button when new files are selected', async () => {
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({
      data: mockFiles
    });

    render(<Dialog {...defaultProps} />);

    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[1]);

    const attachButton = screen.getByText(/Attach/);
    expect(attachButton).not.toBeDisabled();
    expect(attachButton).toHaveTextContent('Attach (1)');
  });
  it('calls setFilesFromPreviouslyUploadedDialog and closes dialog on Attach click', async () => {
    const mockFiles = {
      next: null,
      previous: null,
      results: [
        {
          pk: 1,
          status: FileUploadStatuses.processed,
          name: 'File 1',
          updated_at: new Date()
        },
        {
          pk: 2,
          status: FileUploadStatuses.processed,
          name: 'File 2',
          updated_at: new Date()
        }
      ]
    };
    (
      getBibliographyFiles as MockedFunction<typeof getBibliographyFiles>
    ).mockResolvedValueOnce({
      data: mockFiles
    });

    render(<Dialog {...defaultProps} />);

    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    fireEvent.click(checkboxes[1]);

    const attachButton = screen.getByText(/Attach/);
    await waitFor(() => expect(attachButton).not.toBeDisabled());
    expect(attachButton).toHaveTextContent('Attach (1)');

    userEvent.click(attachButton);

    await waitFor(() => {
      expect(
        defaultProps.setFilesFromPreviouslyUploadedDialog
      ).toHaveBeenCalledWith([mockFiles.results[0]]);
      expect(defaultProps.handleClose).toHaveBeenCalled();
    });
  });
  it('calls handleClose on Cancel button click', () => {
    render(<Dialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.handleClose).toHaveBeenCalled();
  });
});
