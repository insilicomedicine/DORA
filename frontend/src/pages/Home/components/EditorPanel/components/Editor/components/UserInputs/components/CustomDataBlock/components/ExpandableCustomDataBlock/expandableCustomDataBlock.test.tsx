import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpandableCustomDataBlock from './index';

describe('ExpandableCustomDataBlock Component', () => {
  const mockProps = {
    title: 'Custom Data Title',
    content: 'This is some detailed content for the block.'
  };

  test('renders the component with title', () => {
    render(<ExpandableCustomDataBlock {...mockProps} />);

    const titleElement = screen.getByTestId('expandableCustomDataBlock-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Custom Data Title');
  });

  test('renders the expand button with the initial collapsed icon', () => {
    render(<ExpandableCustomDataBlock {...mockProps} />);

    const expandButton = screen.getByTestId(
      'expandableCustomDataBlock-expandButton'
    );
    expect(expandButton).toBeInTheDocument();
    expect(
      screen.getByTestId('expandableCustomDataBlock-unfoldMoreRoundedIcon')
    ).toBeInTheDocument();
  });

  test('expands and collapses content on clicking the expand button', () => {
    render(<ExpandableCustomDataBlock {...mockProps} />);

    const expandButton = screen.getByTestId(
      'expandableCustomDataBlock-expandButton'
    );
    const contentText = screen.queryByTestId(
      'expandableCustomDataBlock-contentText'
    );

    // Initially content should not be rendered
    expect(contentText).not.toBeInTheDocument();

    fireEvent.click(expandButton);

    const expandedContent = screen.getByTestId(
      'expandableCustomDataBlock-contentText'
    );
    expect(expandedContent).toBeInTheDocument();
    expect(expandedContent).toHaveTextContent(
      'This is some detailed content for the block.'
    );
    expect(
      screen.getByTestId('expandableCustomDataBlock-unfoldLessRoundedIcon')
    ).toBeInTheDocument();
  });

  test('icon changes when expanded and collapsed', () => {
    render(<ExpandableCustomDataBlock {...mockProps} />);

    const expandButton = screen.getByTestId(
      'expandableCustomDataBlock-expandButton'
    );

    // Initially collapsed, so the UnfoldMoreRounded icon should be present
    expect(
      screen.getByTestId('expandableCustomDataBlock-unfoldMoreRoundedIcon')
    ).toBeInTheDocument();

    fireEvent.click(expandButton);

    // Now the UnfoldLessRounded icon should be present
    expect(
      screen.getByTestId('expandableCustomDataBlock-unfoldLessRoundedIcon')
    ).toBeInTheDocument();

    fireEvent.click(expandButton);

    // The UnfoldMoreRounded icon should be back
    expect(
      screen.getByTestId('expandableCustomDataBlock-unfoldMoreRoundedIcon')
    ).toBeInTheDocument();
  });
});
