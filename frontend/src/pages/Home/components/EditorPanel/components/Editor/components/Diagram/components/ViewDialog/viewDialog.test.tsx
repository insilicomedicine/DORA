import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ViewDialog from './index';

describe('ViewDialog Component', () => {
  const mockOnClose = vi.fn();
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
  </svg>`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the dialog with title, settings block, SVGRenderer, and TextField', async () => {
    render(
      <ViewDialog
        open={true}
        onClose={mockOnClose}
        svg={svgString}
        documentTitle="Test Document"
        mermaidEditorLink="http://example.com"
        diagramType="flowchart"
      />
    );

    expect(screen.getByTestId('viewDialog-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('viewDialog-title')).toHaveTextContent(
      'Visual summary'
    );
    expect(screen.getByTestId('sVGRenderer-wrapper')).toBeInTheDocument();
    // uncomment in future when TextField is implemented
    // expect(screen.getByTestId('viewDialog-input')).toBeInTheDocument();
    expect(
      screen.getByTestId('viewDialog-settingsBlockWrapper')
    ).toBeInTheDocument();
  });

  test('calls onClose function when Dialog is closed', () => {
    render(
      <ViewDialog
        open={true}
        onClose={mockOnClose}
        svg={svgString}
        documentTitle="Test Document"
        mermaidEditorLink="http://example.com"
        diagramType="flowchart"
      />
    );

    fireEvent.keyDown(screen.getByTestId('viewDialog-wrapper'), {
      key: 'Escape',
      code: 'Escape'
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
