import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RequestStatusIsLoadingOrGotErrorBlock from './index';
import '@testing-library/jest-dom';

describe('RequestStatusIsLoadingOrGotErrorBlock', () => {
  const mockOnClose = vi.fn();

  it('renders a loader when loading is true', () => {
    render(
      <RequestStatusIsLoadingOrGotErrorBlock
        loading={true}
        error={false}
        onCloseErrorAlert={mockOnClose}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Applying...')).toBeInTheDocument();
  });

  it('renders an error alert when error is true', () => {
    render(
      <RequestStatusIsLoadingOrGotErrorBlock
        loading={false}
        error={true}
        onCloseErrorAlert={mockOnClose}
      />
    );

    expect(
      screen.getByText(
        'Sorry, the diagram could not be generated. Try again later.'
      )
    ).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render anything when both loading and error are false', () => {
    const { container } = render(
      <RequestStatusIsLoadingOrGotErrorBlock
        loading={false}
        error={false}
        onCloseErrorAlert={mockOnClose}
      />
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('renders the loader when both loading and error are true', () => {
    render(
      <RequestStatusIsLoadingOrGotErrorBlock
        loading={true}
        error={true}
        onCloseErrorAlert={mockOnClose}
      />
    );

    // The loader should have priority and be displayed
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Sorry, the diagram could not be generated. Try again later.'
      )
    ).not.toBeInTheDocument();
  });
});
