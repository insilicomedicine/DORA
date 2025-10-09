import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpandableInputsBlock from './index';

describe('ExpandableInputsBlock Component', () => {
  const mockProps = {
    title: 'Custom Input Title',
    content: 'This is the content of the expandable block.'
  };

  test('renders the component with title and content', () => {
    render(<ExpandableInputsBlock {...mockProps} />);

    const titleElement = screen.getByTestId('expandableInputsBlock-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Custom Input Title');

    const contentText = screen.getByText(
      'This is the content of the expandable block.'
    );
    expect(contentText).toBeInTheDocument();
    expect(contentText).toHaveTextContent(
      'This is the content of the expandable block.'
    );
  });

  test('renders the expand button with the initial collapsed icon', () => {
    render(<ExpandableInputsBlock {...mockProps} />);

    const expandButton = screen.getByTestId(
      'expandableInputsBlock-expandButton'
    );
    expect(expandButton).toBeInTheDocument();
    expect(screen.getByTestId('UnfoldMoreRoundedIcon')).toBeInTheDocument();
  });

  test('expands and collapses content on clicking the expand button', () => {
    render(<ExpandableInputsBlock {...mockProps} />);

    const expandButton = screen.getByTestId(
      'expandableInputsBlock-expandButton'
    );
    const contentWrapper = screen.getByTestId(
      'expandableInputsBlock-contentWrapper'
    );

    expect(contentWrapper).toHaveStyle('max-height: 82px');

    fireEvent.click(expandButton);
    expect(contentWrapper).toHaveStyle('max-height: 216px');
    expect(screen.getByTestId('UnfoldLessRoundedIcon')).toBeInTheDocument();
    const contentText = screen.getByText(
      'This is the content of the expandable block.'
    );
    expect(contentText).toBeInTheDocument();
    expect(contentText).toHaveTextContent(
      'This is the content of the expandable block.'
    );

    fireEvent.click(expandButton);
    expect(contentWrapper).toHaveStyle('max-height: 82px');
    expect(screen.getByTestId('UnfoldMoreRoundedIcon')).toBeInTheDocument();
  });
});
