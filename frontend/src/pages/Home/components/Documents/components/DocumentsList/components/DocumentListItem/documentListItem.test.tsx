import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import DocumentListItem from './index';
import { theme } from 'theme';
import { ThemeProvider } from '@mui/material/styles';

vi.mock('pages/Home/components/LeftPanel/components/Menu', () => ({
  default: () => <div data-testid="mocked-menu">Menu</div>
}));

describe('DocumentListItem Component', () => {
  const defaultProps: any = {
    id: 'doc123',
    title: 'Test Document',
    templateName: 'Template A',
    status: 'completed',
    stage: 'content_generated',
    createdAt: '2024-12-20T14:45:00.760066Z',
    isNew: false
  };

  const renderComponent = (props = {}) =>
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <DocumentListItem {...defaultProps} {...props} />
        </ThemeProvider>
      </MemoryRouter>
    );

  it('renders the component with default props', () => {
    renderComponent();

    expect(
      screen.getByTestId('documentListItem-containerWrapper')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('documentListItem-documentTitleWrapper')
    ).toHaveTextContent('Test Document');
    expect(
      screen.getByTestId('documentListItem-templateWrapper')
    ).toHaveTextContent('Template A');
    expect(
      screen.getByTestId('documentListItem-createdDateWrapper')
    ).toHaveTextContent('20 Dec 2024');
    expect(
      screen.getByTestId('documentListItem-statusWrapper')
    ).toBeEmptyDOMElement();
  });

  it('renders the draft status correctly', () => {
    renderComponent({ stage: 'draft' });

    expect(
      screen.getByTestId('documentListItem-draftStatusWrapper')
    ).toHaveTextContent('Draft');
  });

  it('renders the failed status correctly', () => {
    renderComponent({ status: 'failed' });

    expect(
      screen.getByTestId('documentListItem-failedStatus')
    ).toHaveTextContent('Failed');
  });

  it('renders the in-progress status correctly', () => {
    renderComponent({ status: 'in_progress' });

    expect(
      screen.getByTestId('documentListItem-inProgressStatus')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('documentListItem-documentTitleWrapper')
    ).toHaveTextContent('Generating...');
  });

  it('renders the correct link for draft documents', () => {
    renderComponent({ stage: 'draft' });

    const link = screen.getByTestId('documentListItem-containerWrapper');
    expect(link).toHaveAttribute('href', '/documents/generation/doc123');
  });

  it('does not render anything for new documents', () => {
    const { container } = renderComponent({ isNew: true });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the menu component correctly', () => {
    renderComponent();

    expect(screen.getByTestId('mocked-menu')).toBeInTheDocument();
  });

  it('prevents menu click propagation', () => {
    renderComponent();

    const menuWrapper = screen.getByTestId('documentListItem-actionsWrapper');

    // Mock the stopPropagation function
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagation = vi.fn();
    event.stopPropagation = stopPropagation;

    // Trigger the click event
    fireEvent(menuWrapper, event);

    // Assert that stopPropagation was called
    expect(stopPropagation).toHaveBeenCalled();
  });
});
