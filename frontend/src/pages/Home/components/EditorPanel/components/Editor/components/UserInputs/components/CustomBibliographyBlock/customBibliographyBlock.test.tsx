import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomBibliographyBlock from './index';

describe('CustomBibliographyBlock Component', () => {
  const mockPropsThreeFiles = {
    title: 'Bibliography Title',
    content: ['First content item', 'Second content item', 'Third content item']
  };

  const mockPropsFiveFiles = {
    title: 'Bibliography Title',
    content: [
      'First content item',
      'Second content item',
      'Third content item',
      'Four content item',
      'Five content item'
    ]
  };

  test('renders the component with title and content', () => {
    render(<CustomBibliographyBlock {...mockPropsFiveFiles} />);

    // Check for the title
    const titleElement = screen.getByTestId('customBibliographyBlock-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Bibliography Title');

    // Check for the content
    const contentWrapper = screen.getByTestId(
      'customBibliographyBlock-contentWrapper'
    );
    expect(contentWrapper).toBeInTheDocument();
    mockPropsFiveFiles.content.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  test('renders the expand button initially collapsed with 5 files', () => {
    render(<CustomBibliographyBlock {...mockPropsFiveFiles} />);

    const expandButton = screen.getByTestId(
      'customBibliographyBlock-expandButton'
    );
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toContainElement(
      screen.getByTestId('UnfoldMoreRoundedIcon')
    );
  });

  test('dont renders the expand button with 3 files', () => {
    render(<CustomBibliographyBlock {...mockPropsThreeFiles} />);

    const expandButton = screen.queryByTestId(
      'customBibliographyBlock-expandButton'
    );
    expect(expandButton).not.toBeInTheDocument();
  });

  test('expands and collapses content on clicking expand button', () => {
    render(<CustomBibliographyBlock {...mockPropsFiveFiles} />);

    const expandButton = screen.getByTestId(
      'customBibliographyBlock-expandButton'
    );
    const contentWrapper = screen.getByTestId(
      'customBibliographyBlock-contentWrapper'
    );

    // Initial state should be collapsed
    expect(contentWrapper).toHaveStyle('max-height: 184px');

    fireEvent.click(expandButton);
    // Expanded state
    expect(contentWrapper).toHaveStyle('max-height: 452px');

    fireEvent.click(expandButton);
    // Collapsed state
    expect(contentWrapper).toHaveStyle('max-height: 184px');
  });
});
