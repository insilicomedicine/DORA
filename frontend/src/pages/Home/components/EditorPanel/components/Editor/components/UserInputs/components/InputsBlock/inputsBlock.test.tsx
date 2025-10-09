import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputsBlock from './index';

describe('InputsBlock Component', () => {
  const shortTextProps = {
    title: 'User Inputs',
    content: [
      {
        display_name: 'short input',
        value: 'This is a short input.'
      }
    ]
  };

  const longTextProps = {
    title: 'User Inputs',
    content: [
      {
        display_name: 'long input',
        value: 'This is a long input.'.repeat(50) // making sure it's longer than maxTextLength
      }
    ]
  };

  const mixedTextProps = {
    title: 'User Inputs',
    content: [
      {
        display_name: 'short input',
        value: 'This is a short input.'
      },
      {
        display_name: 'long input',
        value: 'This is a long input.'.repeat(50)
      }
    ]
  };

  test('renders the component with title and short content', () => {
    render(<InputsBlock {...shortTextProps} />);

    const titleElement = screen.getByTestId('inputsBlock-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('User Inputs');

    const contentWrapper = screen.getByTestId('inputsBlock-contentWrapper');
    expect(contentWrapper).toBeInTheDocument();

    const contentTitle = screen.getByTestId('inputsBlock-contentTitle');
    expect(contentTitle).toBeInTheDocument();
    expect(contentTitle).toHaveTextContent('short input');

    const contentText = screen.getByTestId('inputsBlock-contentText');
    expect(contentText).toBeInTheDocument();
    expect(contentText).toHaveTextContent('This is a short input.');
  });

  test('renders the component with long content and shows ExpandableInputsBlock', () => {
    render(<InputsBlock {...longTextProps} />);

    const titleElement = screen.getByTestId('inputsBlock-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('User Inputs');

    const expandableBlockWrapper = screen.getByTestId(
      'expandableInputsBlock-wrapper'
    );
    expect(expandableBlockWrapper).toBeInTheDocument();
  });

  test('renders both short and long content blocks correctly', () => {
    render(<InputsBlock {...mixedTextProps} />);

    // Ensure both blocks are rendered
    const contentWrappers = screen.getAllByTestId('inputsBlock-contentWrapper');
    expect(contentWrappers).toHaveLength(2);

    const shortContentText = screen.getByText('This is a short input.');
    expect(shortContentText).toBeInTheDocument();

    const expandableBlockWrapper = screen.getByTestId(
      'expandableInputsBlock-wrapper'
    );
    expect(expandableBlockWrapper).toBeInTheDocument();
  });
});
