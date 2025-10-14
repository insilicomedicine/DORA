import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, Mock } from 'vitest';
import TextEvidenceSection from './index';
import useRightPanelStore from 'contexts/useRightPanelStore';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'theme';

vi.mock('contexts/useRightPanelStore', () => ({
  __esModule: true,
  default: vi.fn()
}));

vi.mock('../../../TextEvidences', () => ({
  __esModule: true,
  default: () => <div data-testid="text-evidences">TextEvidences Component</div>
}));

vi.mock('components/SidebarCollapse', () => ({
  __esModule: true,
  default: ({ toggleCollapse, isCollapsed, direction }) => (
    <button
      data-testid="sidebarCollapse-button"
      onClick={toggleCollapse}
      aria-label={`sidebar-collapse-${direction}`}
    >
      {isCollapsed ? 'Expand' : 'Collapse'}
    </button>
  )
}));

const mockUseRightPanelStore = useRightPanelStore as unknown as Mock;

describe('TextEvidenceSection', () => {
  beforeEach(() => {
    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: vi.fn()
    });
  });

  it('returns null when referenceLinkTarget has no pmid', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection
          referenceLinkTarget={{ pmid: undefined }}
          setReferenceLinkTarget={vi.fn()}
        />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when referenceLinkTarget has pmid', () => {
    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection
          referenceLinkTarget={{ pmid: '12345' }}
          setReferenceLinkTarget={vi.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('Text Evidence')).toBeInTheDocument();
    expect(screen.getByTestId('text-evidences')).toBeInTheDocument();
  });

  it('calls setReferenceLinkTarget when close button is clicked', () => {
    const setReferenceLinkTargetMock = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection
          referenceLinkTarget={{ pmid: '12345' }}
          setReferenceLinkTarget={setReferenceLinkTargetMock}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('CloseRoundedIcon'));
    expect(setReferenceLinkTargetMock).toHaveBeenCalledWith({
      pmid: undefined
    });
  });

  it('calls toggleCollapseRightPanel when collapse button is clicked', () => {
    const toggleCollapseMock = vi.fn();
    mockUseRightPanelStore.mockReturnValue({
      isRightPanelCollapsed: false,
      toggleCollapseRightPanel: toggleCollapseMock
    });

    render(
      <ThemeProvider theme={theme}>
        <TextEvidenceSection
          referenceLinkTarget={{ pmid: '12345' }}
          setReferenceLinkTarget={vi.fn()}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('sidebarCollapse-button'));
    expect(toggleCollapseMock).toHaveBeenCalledWith(true);
  });
});
