import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AddCitation from './index';

// Mock the TabProvider and CitationSearchResults components
vi.mock('../ReferenceList/components', () => ({
  TabProvider: ({ children }) => (
    <div data-testid="tab-provider">{children}</div>
  ),
  TabState: vi.fn(),
  CitationSearchResults: vi.fn()
}));

describe('AddCitation', () => {
  const defaultProps = {
    editor: {
      commands: { deleteRange: vi.fn() },
      state: { selection: { from: 0, to: 0 } }
    },
    targetNode: {},
    focusPosition: { x: 100, y: 100 },
    showAddCitationPopup: true,
    setFocusPosition: vi.fn(),
    handleCloseAddCitationPopup: vi.fn()
  };

  it('should render the component', () => {
    render(<AddCitation {...defaultProps} />);

    // Check for the search placeholder text in the TextField
    expect(
      screen.getByPlaceholderText('Search by keyword, DOI, PMID…')
    ).toBeInTheDocument();

    // Check for the search button with search icon
    expect(screen.getByLabelText('search')).toBeInTheDocument();
  });

  it('should show helper text when not searching', () => {
    render(<AddCitation {...defaultProps} />);

    expect(
      screen.getByText(
        'Search by title, keywords, PMID, PMCID, DOI, or paste URLs separated by comma or space'
      )
    ).toBeInTheDocument();
  });
});
