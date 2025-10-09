import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useMediaQuery from '@mui/material/useMediaQuery';
import { w3cwebsocket } from 'websocket';
import MainContainer from './index';

import { useDocumentStore } from 'contexts/documentsStore';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';
import useGoogleTagManager from 'hooks/useGoogleTagManager';
import { useGATrackEvents } from 'hooks/useGATrackEvents';
import { getUserInfo, getUserDisplayPreferences } from 'services/user';
import { getDocument } from 'services/documents';
import { checkMobileReminderVisibilityByPathname } from 'utils/utils';
import { convertToEditorDocument } from 'utils/document';
import { theme } from 'theme';
import { useUserStore } from 'contexts/useUserStore';
import useSystemStore from 'contexts/useSystemStore';
import { useWebsocketStore } from 'contexts/useWebsocketStore';

// Mock WebSocket first
const mockWebSocket = {
  onopen: null as any,
  onmessage: null as any,
  onerror: null as any,
  onclose: null as any,
  close: vi.fn(),
  send: vi.fn()
};

// Mock all external dependencies
vi.mock('@mui/material/useMediaQuery');
vi.mock('websocket', () => ({
  w3cwebsocket: vi.fn().mockImplementation(() => mockWebSocket)
}));
vi.mock('contexts/documentsStore');
vi.mock('contexts/useReviewInsightsStore');
vi.mock('contexts/useUserStore');
vi.mock('contexts/useSystemStore');
vi.mock('contexts/useWebsocketStore');
vi.mock('hooks/useGoogleTagManager');
vi.mock('hooks/useGATrackEvents');
vi.mock('services/user');
vi.mock('services/documents');
vi.mock('services/system');
vi.mock('utils/utils');
vi.mock('utils/document');
vi.mock('../Header', () => ({
  default: () => <div data-testid="header">Header</div>
}));
vi.mock('../../router', () => ({
  default: () => <div data-testid="router">Router</div>
}));
vi.mock('./mobileReminder', () => ({
  default: () => <div data-testid="mobile-reminder">Mobile Reminder</div>
}));

const mockUseMediaQuery = vi.mocked(useMediaQuery);
const mockGetUserInfo = vi.mocked(getUserInfo);
const mockGetUserDisplayPreferences = vi.mocked(getUserDisplayPreferences);

const mockGetDocument = vi.mocked(getDocument);
const mockCheckMobileReminderVisibility = vi.mocked(
  checkMobileReminderVisibilityByPathname
);
const mockConvertToEditorDocument = vi.mocked(convertToEditorDocument);
const mockUseGoogleTagManager = vi.mocked(useGoogleTagManager);
const mockUseGATrackEvents = vi.mocked(useGATrackEvents);

// Mock user store
const mockSetUserInfo = vi.fn();
const mockUseUserStore = vi.mocked(useUserStore);

// Mock system store
const mockFetchSystemInfo = vi.fn();
const mockUseSystemStore = vi.mocked(useSystemStore);

// Mock document store
const mockSetCompletedDocument = vi.fn();
const mockSetLogsData = vi.fn();
const mockSetDocumentDetailData = vi.fn();
const mockUseDocumentStore = vi.mocked(useDocumentStore);

// Mock review insights store
const mockUpdateFromWebSocket = vi.fn();
const mockUseReviewInsightsStore = vi.mocked(useReviewInsightsStore);

// Mock websocket store
const mockSetUploadedFileUpdatesWS = vi.fn();
const mockUseWebsocketStore = vi.mocked(useWebsocketStore);

// Mock react-router
const mockUseLocation = {
  pathname: '/documents/123'
};

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useLocation: () => mockUseLocation
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

describe('MainContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseMediaQuery.mockReturnValue(false);
    mockUseDocumentStore.mockReturnValue({
      setCompletedDocument: mockSetCompletedDocument,
      setLogsData: mockSetLogsData,
      setDocumentDetailData: mockSetDocumentDetailData
    } as any);
    mockUseReviewInsightsStore.mockReturnValue({
      updateFromWebSocket: mockUpdateFromWebSocket
    } as any);
    mockUseUserStore.mockReturnValue({
      userInfo: {},
      setUserInfo: mockSetUserInfo,
      updateUserInfo: vi.fn(),
      clearUserInfo: vi.fn()
    } as any);
    mockUseSystemStore.mockReturnValue({
      systemInfo: {},
      isLoading: false,
      setSystemInfo: vi.fn(),
      clearSystemInfo: vi.fn(),
      fetchSystemInfo: mockFetchSystemInfo,
      setLoading: vi.fn()
    } as any);
    mockUseWebsocketStore.mockReturnValue({
      uploadedFileUpdatesWS: null,
      setUploadedFileUpdatesWS: mockSetUploadedFileUpdatesWS,
      clearUploadedFileUpdatesWS: vi.fn()
    } as any);
    mockUseGoogleTagManager.mockReturnValue(undefined);
    mockUseGATrackEvents.mockReturnValue(undefined);
    mockCheckMobileReminderVisibility.mockReturnValue(false);
    mockConvertToEditorDocument.mockReturnValue({
      doc: {
        name: 'Test Paper',
        type: 'doc',
        content: [],
        id: '123',
        title: 'Test Document',
        stage: 'generation',
        status: 'in_progress',
        sections: [],
        template_id: 'template-1',
        bibliographies: []
      }
    } as any);

    // Mock successful API responses
    mockGetUserInfo.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      terms_and_privacy_accepted: true
    } as any);
    mockGetUserDisplayPreferences.mockResolvedValue({
      theme: 'light'
    } as any);

    mockGetDocument.mockResolvedValue({
      id: '123',
      title: 'Test Document',
      stage: 'generation',
      status: 'in_progress',
      bibliographies: []
    } as any);
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <MainContainer>
          <div data-testid="children">Children</div>
        </MainContainer>
      </TestWrapper>
    );

    // Should return null during loading
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('router')).not.toBeInTheDocument();
  });

  it('renders header and router after loading completes', async () => {
    render(
      <TestWrapper>
        <MainContainer>
          <div data-testid="children">Children</div>
        </MainContainer>
      </TestWrapper>
    );

    // Wait for the API calls to complete and loading to finish
    await waitFor(() => {
      expect(mockGetUserInfo).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('router')).toBeInTheDocument();
        expect(screen.getByTestId('children')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('fetches user info and preferences on mount', async () => {
    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(mockGetUserInfo).toHaveBeenCalledTimes(1);
        expect(mockFetchSystemInfo).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(mockSetUserInfo).toHaveBeenCalledWith({
          id: 1,
          email: 'test@example.com',
          terms_and_privacy_accepted: true
        });
      },
      { timeout: 3000 }
    );
  });

  it('does not fetch preferences when user has not accepted terms', async () => {
    mockGetUserInfo.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      terms_and_privacy_accepted: false
    } as any);

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetUserInfo).toHaveBeenCalledTimes(1);
    });

    expect(mockGetUserDisplayPreferences).not.toHaveBeenCalled();
    expect(mockFetchSystemInfo).not.toHaveBeenCalled();
  });

  it('shows mobile reminder when on mobile and path allows it', async () => {
    mockUseMediaQuery.mockReturnValue(true);
    mockCheckMobileReminderVisibility.mockReturnValue(true);

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    // Wait for loading to complete first
    await waitFor(() => {
      expect(mockGetUserInfo).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('mobile-reminder')).toBeInTheDocument();
        expect(screen.queryByTestId('router')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('creates WebSocket connection', async () => {
    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(w3cwebsocket).toHaveBeenCalledWith(
        expect.stringContaining('/ws/notifications/')
      );
    });
  });

  it('handles bibliography_file_processing WebSocket message', async () => {
    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const message = {
      data: JSON.stringify({
        data: {
          type: 'bibliography_file_processing',
          file_data: { filename: 'test.bib' }
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    expect(mockSetUploadedFileUpdatesWS).toHaveBeenCalledWith({
      filename: 'test.bib'
    });
  });

  it('handles generation_log_updated WebSocket message for active document', async () => {
    mockUseLocation.pathname = '/documents/123';

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const message = {
      data: JSON.stringify({
        data: {
          id: '123',
          type: 'generation_log_updated',
          data: { logs: ['test log'] }
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    expect(mockSetLogsData).toHaveBeenCalledWith({ logs: ['test log'] });
  });

  it('handles document_ai_review_generated WebSocket message', async () => {
    mockUseLocation.pathname = '/documents/123';

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const reviewData = { review_status: 'completed', insights: [] };
    const message = {
      data: JSON.stringify({
        data: {
          id: '123',
          type: 'document_ai_review_generated',
          data: reviewData
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    expect(mockUpdateFromWebSocket).toHaveBeenCalledWith(
      reviewData,
      'completed'
    );
  });

  it('handles document update WebSocket messages', async () => {
    mockUseLocation.pathname = '/documents/123';
    mockConvertToEditorDocument.mockReturnValue({
      doc: {
        title: 'Test Document',
        content: 'Test content'
      }
    } as any);

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const message = {
      data: JSON.stringify({
        data: {
          id: '123',
          type: 'section_status_updated'
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    await waitFor(() => {
      expect(mockGetDocument).toHaveBeenCalledWith('123');
    });
  });

  it('updates completed document when paper is generated', async () => {
    mockUseLocation.pathname = '/documents/123';
    mockGetDocument.mockResolvedValue({
      id: '123',
      title: 'Test Document',
      stage: 'generation',
      status: 'completed',
      bibliographies: []
    } as any);

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const message = {
      data: JSON.stringify({
        data: {
          id: '123',
          type: 'section_status_updated'
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    await waitFor(() => {
      expect(mockSetCompletedDocument).toHaveBeenCalledWith({
        id: '123',
        title: 'Test Document',
        stage: 'generation',
        status: 'completed',
        bibliographies: []
      });
    });
  });

  it('handles polishing stage document updates', async () => {
    mockUseLocation.pathname = '/documents/123';
    mockGetDocument.mockResolvedValue({
      id: '123',
      title: 'Test Document',
      stage: 'polishing',
      status: 'in_progress',
      bibliographies: []
    } as any);
    mockConvertToEditorDocument.mockReturnValue({
      doc: {
        title: 'Test Document',
        content: 'Polished content'
      }
    } as any);

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockWebSocket.onmessage).toBeDefined();
    });

    const message = {
      data: JSON.stringify({
        data: {
          id: '123',
          type: 'section_status_updated'
        }
      })
    };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(message);
      }
    });

    await waitFor(() => {
      expect(mockSetDocumentDetailData).toHaveBeenCalledWith(
        expect.objectContaining({
          bibliographyList: [],
          sectionStatusUpdated: true,
          allSectionsPolished: false
        })
      );
    });
  });

  it('calls Google Analytics hooks', () => {
    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    expect(mockUseGoogleTagManager).toHaveBeenCalled();
    expect(mockUseGATrackEvents).toHaveBeenCalled();
  });

  it('updates mobile reminder visibility based on pathname', async () => {
    mockUseLocation.pathname = '/dashboard';

    render(
      <TestWrapper>
        <MainContainer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockCheckMobileReminderVisibility).toHaveBeenCalledWith(
        'dashboard'
      );
    });
  });
});
