import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageComponentByType from './index.tsx'; // Adjust the path based on your project structure

describe('MessageComponentByType', () => {
  test('renders the text passed as a prop', () => {
    render(<MessageComponentByType text="Test Message" />);

    const textElement = screen.getByTestId('messageComponentByType-text');
    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveTextContent('Test Message');
  });

  test('does not render the result or button when result is not provided', () => {
    render(<MessageComponentByType text="Test Message" />);

    const buttonElement = screen.queryByTestId(
      'messageComponentByType-showResultButton'
    );
    const resultElement = screen.queryByTestId('messageComponentByType-result');

    expect(buttonElement).not.toBeInTheDocument();
    expect(resultElement).not.toBeInTheDocument();
  });

  test('renders "Show" button when result is provided but not visible initially', () => {
    render(
      <MessageComponentByType
        text="Test Message"
        result="Test Result"
        buttonType="Details"
      />
    );

    const buttonElement = screen.getByTestId(
      'messageComponentByType-showResultButton'
    );
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveTextContent('Show Details');
  });

  test('toggles result visibility on button click', () => {
    render(
      <MessageComponentByType
        text="Test Message"
        result="Test Result"
        buttonType="Details"
      />
    );

    const buttonElement = screen.getByTestId(
      'messageComponentByType-showResultButton'
    );

    let resultElement = screen.queryByTestId('messageComponentByType-result');
    expect(resultElement).not.toBeInTheDocument();

    fireEvent.click(buttonElement);

    resultElement = screen.getByTestId('messageComponentByType-result');
    expect(resultElement).toBeInTheDocument();
    expect(resultElement).toHaveTextContent('Test Result');

    expect(buttonElement).toHaveTextContent('Hide Details');

    fireEvent.click(buttonElement);

    // Result should be hidden again
    resultElement = screen.queryByTestId('messageComponentByType-result');
    expect(resultElement).not.toBeInTheDocument();

    // Button should be back to 'Show Details'
    expect(buttonElement).toHaveTextContent('Show Details');
  });
});
