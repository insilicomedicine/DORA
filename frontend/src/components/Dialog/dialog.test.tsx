import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Dialog from './index';

describe('Dialog', () => {
  test('renders Dialog component with title', () => {
    render(<Dialog open={true} title="Dialog Title" handleClose={() => {}} />);
    const dialogTitleElement = screen.getByText('Dialog Title');
    expect(dialogTitleElement).toBeInTheDocument();
  });

  test('renders Dialog component with input tag', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        inputTagLabel="Input Tag Label"
      />
    );
    const inputTagElement = screen.getByLabelText('Input Tag Label');
    expect(inputTagElement).toBeInTheDocument();
  });

  test('renders Dialog component with left button', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        enableLeftBtn={true}
        leftBtnText="Left Button"
      />
    );
    const leftButtonElement = screen.getByText('Left Button');
    expect(leftButtonElement).toBeInTheDocument();
  });

  test('renders Dialog component with custom button texts', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        actionBtnTexts={{ confirm: 'Submit', cancel: 'Cancel' }}
      />
    );
    const confirmButtonElement = screen.getByText('Submit');
    expect(confirmButtonElement).toBeInTheDocument();
    const cancelButtonElement = screen.getByText('Cancel');
    expect(cancelButtonElement).toBeInTheDocument();
  });

  test('renders Dialog component with custom Actions', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        Actions={
          <div>
            <button>Custom Button</button>
          </div>
        }
      />
    );
    const customButtonElement = screen.getByText('Custom Button');
    expect(customButtonElement).toBeInTheDocument();
  });

  test('confirm button is disabled when disableConfirmButton is true', () => {
    render(
      <Dialog open={true} handleClose={() => {}} disableConfirmButton={true} />
    );
    const confirmButton = screen.getByTestId('dialog-confirm-button');
    expect(confirmButton).toBeDisabled();
  });

  test('handleConfirm is called when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        handleConfirm={handleConfirm}
        inputTagLabel="Test Input"
      />
    );
    const confirmButton = screen.getByTestId('dialog-confirm-button');
    const inputElement = screen.getByLabelText('Test Input');
    fireEvent.change(inputElement, { target: { value: 'test value' } });
    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledWith('test value');
  });

  test('leftBtnAction is called when left button is clicked', () => {
    const leftBtnAction = vi.fn();
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        enableLeftBtn={true}
        leftBtnText="Left Button"
        leftBtnAction={leftBtnAction}
      />
    );
    const leftButton = screen.getByText('Left Button');
    fireEvent.click(leftButton);
    expect(leftBtnAction).toHaveBeenCalled();
  });

  test('handleClose is called when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(<Dialog open={true} handleClose={handleClose} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalled();
  });

  test('actions are not rendered when enableActions is false', () => {
    render(<Dialog open={true} handleClose={() => {}} enableActions={false} />);
    const confirmButton = screen.queryByTestId('dialog-confirm-button');
    const cancelButton = screen.queryByText('Cancel');
    expect(confirmButton).not.toBeInTheDocument();
    expect(cancelButton).not.toBeInTheDocument();
  });

  test('DialogContent has overflow style when enableScrolableContent is true', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        enableScrolableContent={true}
      />
    );
    const dialogContent = screen
      .getByRole('dialog')
      .querySelector('.MuiDialogContent-root');
    expect(dialogContent).toHaveStyle('overflow: auto');
  });

  test('DialogContent does not have overflow style when enableScrolableContent is false', () => {
    render(
      <Dialog
        open={true}
        handleClose={() => {}}
        enableScrolableContent={false}
      />
    );
    const dialogContent = screen
      .getByRole('dialog')
      .querySelector('.MuiDialogContent-root');
    // The style might not be explicitly set to unset, so we test that overflow is not auto
    expect(dialogContent).not.toHaveStyle('overflow: auto');
  });
});
