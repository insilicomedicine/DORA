import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import DocumentGenerationHeader from './index';
import { BrowserRouter as Router } from 'react-router';
import { useParams } from 'react-router';
import useSettingsStore from 'contexts/useSettingsStore';
import usePlanStatus from 'hooks/usePlanStatus';
import { generateDocument } from 'services/documents';

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: vi.fn()
  };
});

vi.mock('contexts/useSettingsStore');
vi.mock('hooks/usePlanStatus');
vi.mock('services/documents');

describe('DocumentGenerationHeader', () => {
  const mockUseParams = useParams as Mock;
  const mockUseSettingsStore = useSettingsStore as unknown as Mock;
  const mockUsePlanStatus = usePlanStatus as unknown as Mock;
  const mockGenerateDocument = generateDocument as Mock;

  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'test-document-id' });
    mockUseSettingsStore.mockReturnValue({
      user_inputs: [{ value: 'test' }],
      plan: '',
      uploadingFiles: false
    });
    mockUsePlanStatus.mockReturnValue({
      isFree: true,
      isAdvanced: false,
      isLimited: false,
      remainingDocuments: 5,
      endDate: '',
      inProgressDocuments: 0
    });
    mockGenerateDocument.mockResolvedValue({ document_id: 'new-document-id' });
  });

  it('displays the correct user plan message', () => {
    render(
      <Router>
        <DocumentGenerationHeader />
      </Router>
    );
    expect(screen.getByText('5 Generations Left')).toBeInTheDocument();
  });

  it('disables the generate button when conditions are not met', () => {
    mockUseSettingsStore.mockReturnValue({
      user_inputs: [{ value: '' }],
      plan: '',
      uploadingFiles: false
    });
    render(
      <Router>
        <DocumentGenerationHeader />
      </Router>
    );
    expect(screen.getByText('Generate').closest('button')).toBeDisabled();
  });

  it('calls generateDocument when the generate button is clicked', async () => {
    mockUseSettingsStore.mockReturnValue({
      user_inputs: { value: 'xx' },
      plan: 'test plan',
      uploadingFiles: false
    });
    render(
      <Router>
        <DocumentGenerationHeader />
      </Router>
    );

    const generateButton = screen.getByText('Generate').closest('button');
    expect(generateButton).not.toBeDisabled();

    fireEvent.click(generateButton as HTMLButtonElement);

    await waitFor(() => {
      expect(mockGenerateDocument).toHaveBeenCalledWith('test-document-id');
    });
  });
});
