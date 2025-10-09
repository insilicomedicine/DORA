import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserInputs from './index';

describe('UserInputs Component', () => {
  const mockProps = {
    templateName: 'Sample Template',
    createdAt: '2024-10-22',
    userInputsData: [],
    templateType: 'Template Type'
  };

  test('renders the show inputs button', () => {
    render(
      <UserInputs
        customBibliographies={null}
        customData={null}
        {...mockProps}
      />
    );

    const showButton = screen.getByTestId('userInputs-showInputsButton');
    expect(showButton).toBeInTheDocument();
  });

  test('opens the dialog when "show inputs" button is clicked', () => {
    render(
      <UserInputs
        customBibliographies={null}
        customData={null}
        {...mockProps}
      />
    );

    const showButton = screen.getByTestId('userInputs-showInputsButton');
    fireEvent.click(showButton);

    const dialogElement = screen.getByTestId('userInputsDialog-wrapper');
    expect(dialogElement).toBeInTheDocument();
    expect(dialogElement).toHaveTextContent('Sample Template');
  });

  test('closes the dialog when close button is clicked', async () => {
    render(
      <UserInputs
        customBibliographies={null}
        customData={null}
        {...mockProps}
      />
    );

    const showButton = screen.getByTestId('userInputs-showInputsButton');
    fireEvent.click(showButton);

    const dialogElement = screen.getByTestId('userInputsDialog-wrapper');
    expect(dialogElement).toBeInTheDocument();

    const closeButton = screen.getByTestId('userInputsDialog-closeButton');
    fireEvent.click(closeButton);

    await waitFor(() => expect(dialogElement).not.toBeInTheDocument());
  });
});
