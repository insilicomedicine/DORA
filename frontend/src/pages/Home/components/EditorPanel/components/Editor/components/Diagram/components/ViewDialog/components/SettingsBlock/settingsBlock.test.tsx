import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SettingsBlock from './index';

describe('SettingsBlock Component', () => {
  const mockHandleSelectType = vi.fn();
  const mockSetSelectedPalette = vi.fn();

  const defaultProps = {
    selectedType: 'flowchart',
    handleSelectType: mockHandleSelectType,
    selectedPalette: ['#E7F2E7', '#FAF5C8', '#EDEDED'],
    setSelectedPalette: mockSetSelectedPalette,
    loading: false,
    mermaidEditorLink: 'https://mermaid-js.github.io/mermaid-live-editor/',
    settingsBlockisDisabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SettingsBlock {...defaultProps} />);

    const editInMermaidButton = screen.queryByTestId(
      'settingsBlock-editInMermaidButton'
    );

    expect(
      screen.getByTestId('viewDialog-settingsBlockWrapper')
    ).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    // Uncomment in future when ColorPalette component is implemented
    // expect(screen.getByText('Style')).toBeInTheDocument();
    expect(editInMermaidButton).toBeInTheDocument();
  });

  it('displays the correct selected type', () => {
    render(<SettingsBlock {...defaultProps} />);
    const radio = screen.getByLabelText('Flowchart');
    expect(radio).toBeChecked();
  });

  it('calls handleSelectType when a type is selected', () => {
    render(<SettingsBlock {...defaultProps} />);
    const radio = screen.getByLabelText('State');
    fireEvent.click(radio);

    expect(mockHandleSelectType).toHaveBeenCalledTimes(1);
    expect(mockHandleSelectType).toHaveBeenCalledWith('state');
  });

  // Uncomment in future when ColorPalette component is implemented

  // it('calls setSelectedPalette when a color palette is selected', () => {
  //   render(<SettingsBlock {...defaultProps} />);
  //   const colorPaletteDiv = screen.getAllByTestId(
  //     'settingsBlock-colorPalette'
  //   )[1];
  //   fireEvent.click(colorPaletteDiv);

  //   expect(mockSetSelectedPalette).toHaveBeenCalledWith([
  //     '#6E44FF',
  //     '#B892FF',
  //     '#FFC2E2'
  //   ]);
  // });

  it('disables radio buttons when loading is true', () => {
    render(<SettingsBlock {...defaultProps} loading={true} />);
    const radio = screen.getByLabelText('Flowchart');
    expect(radio).toBeDisabled();
  });

  it('disables radio buttons when settingsBlockisDisabled is true', () => {
    render(<SettingsBlock {...defaultProps} settingsBlockisDisabled={true} />);
    const radio = screen.getByLabelText('Flowchart');
    expect(radio).toBeDisabled();
  });

  it('renders the Edit in Mermaid button with the correct href', () => {
    render(<SettingsBlock {...defaultProps} />);
    const editInMermaidButton = screen.queryByTestId(
      'settingsBlock-editInMermaidButton'
    );
    expect(editInMermaidButton).toHaveAttribute(
      'href',
      defaultProps.mermaidEditorLink
    );
  });
});
