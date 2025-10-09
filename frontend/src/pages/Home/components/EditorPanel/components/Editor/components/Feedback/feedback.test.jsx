// Feedback.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Feedback from './index';

import { feedback } from 'services/documents';
import { useDocumentStore } from 'contexts/documentsStore';
import { sendGA4Event } from 'utils/ga';

vi.mock('services/documents', () => ({
  feedback: vi.fn()
}));

vi.mock('contexts/documentsStore', () => ({
  useDocumentStore: vi.fn()
}));

vi.mock('utils/ga', () => ({
  sendGA4Event: vi.fn()
}));

const mockUseDocumentStore = vi.mocked(useDocumentStore);
const mockFeedback = vi.mocked(feedback);
const mockSendGA4Event = vi.mocked(sendGA4Event);

const renderComponent = (props = {}) => {
  // Setup default mock for useDocumentStore
  mockUseDocumentStore.mockReturnValue({
    documentData: {
      id: 'test-paper-id',
      like: null,
      stage: 'generation'
    }
  });

  return render(<Feedback {...props} />);
};

describe('Feedback Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders feedback buttons', () => {
    renderComponent();
    const feedbackLikeButton = screen.getByTestId('feedback-IconButton-like');
    const feedbackDislikeButton = screen.getByTestId(
      'feedback-IconButton-dislike'
    );

    expect(feedbackLikeButton).toBeInTheDocument();
    expect(feedbackDislikeButton).toBeInTheDocument();
  });

  test('handles like button click', async () => {
    mockFeedback.mockResolvedValue(true);
    renderComponent();
    const likeButton = screen.getByTestId('feedback-IconButton-like');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(mockFeedback).toHaveBeenCalledWith({
        document_id: 'test-paper-id',
        like: true
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument();
    });
  });

  test('handles dislike button click', async () => {
    mockFeedback.mockResolvedValue(true);
    renderComponent();
    const dislikeButton = screen.getByTestId('feedback-IconButton-dislike');
    fireEvent.click(dislikeButton);

    await waitFor(() => {
      expect(mockFeedback).toHaveBeenCalledWith({
        document_id: 'test-paper-id',
        like: false
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument();
    });
  });

  test('does not render when feedback is disabled', () => {
    mockUseDocumentStore.mockReturnValue({
      documentData: {
        id: 'test-paper-id',
        like: true, // Already has feedback
        stage: 'generation'
      }
    });

    const { container } = render(<Feedback />);
    expect(container.firstChild).toBeNull();
  });

  test('does not render when document is in polishing stage', () => {
    mockUseDocumentStore.mockReturnValue({
      documentData: {
        id: 'test-paper-id',
        like: null,
        stage: 'polishing'
      }
    });

    const { container } = render(<Feedback />);
    expect(container.firstChild).toBeNull();
  });

  test('renders when section feedback is enabled', () => {
    mockUseDocumentStore.mockReturnValue({
      documentData: {
        id: 'test-paper-id',
        like: true, // Document has feedback but section should still show
        stage: 'generation'
      }
    });

    renderComponent({ setcionId: 'section-1' });

    const feedbackLikeButton = screen.getByTestId('feedback-IconButton-like');
    const feedbackDislikeButton = screen.getByTestId(
      'feedback-IconButton-dislike'
    );

    expect(feedbackLikeButton).toBeInTheDocument();
    expect(feedbackDislikeButton).toBeInTheDocument();
  });

  test('sends GA4 event on feedback submission', async () => {
    mockFeedback.mockResolvedValue(true);
    renderComponent();
    const likeButton = screen.getByTestId('feedback-IconButton-like');

    fireEvent.click(likeButton);

    // Wait for popover to appear
    await waitFor(() => {
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument();
    });

    // Find and click the Skip button to close the popover and trigger GA event
    const skipButton = screen.getByTestId('feedback-buttonSkip');
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(mockSendGA4Event).toHaveBeenCalledWith('submit_feedback', {
        like: true,
        has_detail: false,
        position: 'editor_tool_bar'
      });
    });
  });
});
