import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import TextEvidenceSection from './index';
import { RightPanelComponentIds } from 'types/document';
import useRightPanelStore from 'contexts/useRightPanelStore';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';

vi.mock('contexts/useRightPanelStore', () => ({
  __esModule: true,
  default: vi.fn()
}));

const mockUseRightPanelStore = useRightPanelStore as unknown as Mock;

describe('TextEvidenceSection', () => {
  beforeEach(() => {
    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: vi.fn()
    });
  });

  it('renders correctly when active', () => {
    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection isActive={true} handleChange={vi.fn()} />
      </ThemeProvider>
    );
    expect(screen.getByText('Text Evidence')).toBeInTheDocument();
  });

  it('calls handleChange when close button is clicked', () => {
    const handleChangeMock = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection isActive={true} handleChange={handleChangeMock} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('CloseRoundedIcon'));
    expect(handleChangeMock).toHaveBeenCalledWith(
      expect.any(Object),
      RightPanelComponentIds.bibliography
    );
  });

  it('calls toggleCollapseRightPanel when collapse button is clicked', () => {
    const toggleCollapseMock = vi.fn();
    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: toggleCollapseMock
    });

    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection isActive={true} handleChange={vi.fn()} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('sidebarCollapse-button'));
    expect(toggleCollapseMock).toHaveBeenCalledTimes(1);
  });
});
