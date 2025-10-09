import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Diagram from './index';
import { MermaidDiagramData } from 'types/document';

// Mock child components
vi.mock('components/SVGRenderer', () => ({
  default: (props) => <div data-testid="mock-svg-renderer" {...props} />
}));
vi.mock('./components/ViewDialog', () => ({
  default: (props) => <div data-testid="mock-view-dialog" {...props} />
}));
vi.mock('./components/DeleteDialog', () => ({
  default: (props) => <div data-testid="mock-delete-dialog" {...props} />
}));

describe('Diagram Component', () => {
  const sampleSvg: MermaidDiagramData = {
    svg_diagram: '<svg><circle cx="50" cy="50" r="40" /></svg>',
    diagram_type: 'flowchart',
    mermaid_editor_link: 'https://mermaid-js.github.io/mermaid-live-editor'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders SVGRenderer with correct props', () => {
    render(
      <Diagram
        diagramData={sampleSvg}
        handleRemoveDiagramFromDocument={vi.fn()}
        documentTitle="Sample Document"
      />
    );
    const svgRenderer = screen.getByTestId('mock-svg-renderer');
    expect(svgRenderer).toBeInTheDocument();
  });

  test('does not display icon buttons initially', () => {
    render(
      <Diagram
        handleRemoveDiagramFromDocument={vi.fn()}
        documentTitle="Sample Document"
        diagramData={sampleSvg}
      />
    );
    expect(screen.queryByTestId('diagram-icon-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('diagram-icon-copy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('diagram-icon-delete')).not.toBeInTheDocument();
  });

  test('displays icon buttons on hover', () => {
    render(
      <Diagram
        handleRemoveDiagramFromDocument={vi.fn()}
        documentTitle="Sample Document"
        diagramData={sampleSvg}
      />
    );
    const diagramWrapper = screen.getByTestId('diagram-wrapper');

    // Trigger hover
    fireEvent.mouseEnter(diagramWrapper);
    expect(screen.getByTestId('diagram-icon-view')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-icon-delete')).toBeInTheDocument();

    // Remove hover
    fireEvent.mouseLeave(diagramWrapper);
    expect(screen.queryByTestId('diagram-icon-view')).not.toBeInTheDocument();
  });

  test('opens ViewDialog when view icon is clicked', () => {
    render(
      <Diagram
        handleRemoveDiagramFromDocument={vi.fn()}
        documentTitle="Sample Document"
        diagramData={sampleSvg}
      />
    );
    const diagramWrapper = screen.getByTestId('diagram-wrapper');

    // Trigger hover and click on view icon
    fireEvent.mouseEnter(diagramWrapper);
    fireEvent.click(screen.getByTestId('diagram-icon-view'));

    // Check that ViewDialog is open
    expect(screen.getByTestId('mock-view-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('mock-view-dialog')).toHaveAttribute(
      'svg',
      sampleSvg.svg_diagram
    );
  });

  test('opens DeleteDialog when delete icon is clicked', () => {
    render(
      <Diagram
        handleRemoveDiagramFromDocument={vi.fn()}
        documentTitle="Sample Document"
        diagramData={sampleSvg}
      />
    );
    const diagramWrapper = screen.getByTestId('diagram-wrapper');

    // Trigger hover and click on delete icon
    fireEvent.mouseEnter(diagramWrapper);
    fireEvent.click(screen.getByTestId('diagram-icon-delete'));

    // Check that DeleteDialog is open
    expect(screen.getByTestId('mock-delete-dialog')).toBeInTheDocument();
  });
});
