import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, Mock } from 'vitest';
import LogsView from './index';

import { useDocumentStore } from 'contexts/documentsStore';
import { getDocumentLogs } from 'services/logs';

vi.mock('./components/Title', () => ({
  default: () => <div>Mocked Title Component</div>
}));
vi.mock('./components/MasterAgent', () => ({
  default: () => <div>Mocked MasterAgent Component</div>
}));
vi.mock('./components/AgentLogsBySection', () => ({
  default: () => <div>Mocked AgentLogsBySection Component</div>
}));

vi.mock('@mui/material/CircularProgress', () => ({
  default: () => <div role="progressbar">Mocked CircularProgress</div>
}));

vi.mock('services/logs', () => ({
  getDocumentLogs: vi.fn()
}));

vi.mock('contexts/documentsStore', () => ({
  useDocumentStore: vi.fn()
}));

describe('LogsView Component', () => {
  const mockLogsData = {
    agent_logs_by_sections: [
      {
        title: 'Section 1',
        generation_log: { agents_result: ['Agent Result'] },
        sub_sections: []
      }
    ],
    master: {
      title: 'Master Title',
      messages: [{ text: 'Message 1', agents: ['Agent 1'] }],
      agents: ['Agent 1']
    }
  };

  const mockSetLogsData = vi.fn();
  const mockSetIsLogsLoading = vi.fn();

  // Mock useDocumentStore
  const mockUseDocumentStore = vi.mocked(useDocumentStore);

  // Mock getDocumentLogs to return some logs data
  (getDocumentLogs as Mock).mockResolvedValue(mockLogsData);

  beforeEach(() => {
    mockUseDocumentStore.mockReturnValue({
      documentData: {
        id: 'test-doc-id',
        template_name: 'Test Document',
        estimated_document_generation_minutes: 5
      },
      logsData: mockLogsData,
      isLogsLoading: false,
      setLogsData: mockSetLogsData,
      setIsLogsLoading: mockSetIsLogsLoading
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    // Override the mock to show loading state
    mockUseDocumentStore.mockReturnValueOnce({
      documentData: {
        id: 'test-doc-id',
        template_name: 'Test Document',
        estimated_document_generation_minutes: 5
      },
      logsData: {},
      isLogsLoading: true,
      setLogsData: mockSetLogsData,
      setIsLogsLoading: mockSetIsLogsLoading
    } as any);

    render(<LogsView />);

    // Verify that the loading spinner (mocked CircularProgress) is displayed
    const loadingSpinner = screen.getByRole('progressbar');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('renders Title, MasterAgent, and AgentLogsBySection after loading', async () => {
    render(<LogsView />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify that the mocked components are displayed
    expect(screen.getByText('Mocked Title Component')).toBeInTheDocument();
    expect(
      screen.getByText('Mocked MasterAgent Component')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mocked AgentLogsBySection Component')
    ).toBeInTheDocument();
  });

  it('renders Title, MasterAgent without crash when agent_logs_by_sections is null', async () => {
    const mockEmptyLogsData = {
      agent_logs_by_sections: null,
      master: {
        title: 'Master Title',
        messages: [{ text: 'Message 1', agents: ['Agent 1'] }],
        agents: ['Agent 1']
      }
    };

    // Override the mock for this test
    mockUseDocumentStore.mockReturnValueOnce({
      documentData: {
        id: 'test-doc-id',
        template_name: 'Test Document',
        estimated_document_generation_minutes: 5
      },
      logsData: mockEmptyLogsData,
      isLogsLoading: false,
      setLogsData: mockSetLogsData,
      setIsLogsLoading: mockSetIsLogsLoading
    } as any);

    render(<LogsView />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Mocked Title Component')).toBeInTheDocument();
    expect(
      screen.getByText('Mocked MasterAgent Component')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Mocked AgentLogsBySection Component')
    ).toBeNull();
  });
  it('renders Title, MasterAgent without crash when agent_logs_by_sections.[0].generation_log is null', async () => {
    const mockLogsDataWithNullGenerationLog = {
      agent_logs_by_sections: [
        {
          id: '1872ba20-4e23-41e4-a756-220ffae41827',
          title: 'Abstract',
          status: 'in_progress',
          generation_log: null,
          sub_sections: []
        }
      ],
      master: {
        title: 'Master Title',
        messages: [{ text: 'Message 1', agents: ['Agent 1'] }],
        agents: ['Agent 1']
      }
    };

    // Override the mock for this test
    mockUseDocumentStore.mockReturnValueOnce({
      documentData: {
        id: 'test-doc-id',
        template_name: 'Test Document',
        estimated_document_generation_minutes: 5
      },
      logsData: mockLogsDataWithNullGenerationLog,
      isLogsLoading: false,
      setLogsData: mockSetLogsData,
      setIsLogsLoading: mockSetIsLogsLoading
    } as any);

    render(<LogsView />);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Mocked Title Component')).toBeInTheDocument();
    expect(
      screen.getByText('Mocked MasterAgent Component')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Mocked AgentLogsBySection Component')
    ).toBeNull();
  });
});
