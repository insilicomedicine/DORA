import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import DocumentsList from './index';
import { DocumentItem } from 'types/document';
import { theme } from 'theme';
import { ThemeProvider } from '@mui/material/styles';

const mockedNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockedNavigate
  };
});

describe('DocumentsList Component', () => {
  const mockDocumentList: DocumentItem[] = [
    {
      id: 'doc1',
      title: 'Document 1',
      template_name: 'Template A',
      status: 'in_progress',
      stage: 'draft',
      created_at: '2024-12-01',
      generation_flow: 'linear',
      isNew: false
    },
    {
      id: 'doc2',
      title: 'Document 2',
      template_name: 'Template B',
      status: 'completed',
      stage: 'plan_generated',
      created_at: '2024-12-15',
      generation_flow: 'linear',
      isNew: false
    }
  ];

  it('Should render the container and headerRow when empty data', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <DocumentsList documentList={[]} />
        </ThemeProvider>
      </MemoryRouter>
    );

    const container = screen.getByTestId('documentList-containerWrapper');
    expect(container).toBeInTheDocument();

    const headerRow = screen.getByTestId('documentList-headerRowWrapper');
    expect(headerRow).toBeInTheDocument();
    expect(headerRow).toHaveTextContent('Name');
    expect(headerRow).toHaveTextContent('Template');
    expect(headerRow).toHaveTextContent('Created');

    const listWrapper = screen.getByTestId('documentList-itemsListWrapper');
    expect(listWrapper).toBeInTheDocument();
  });

  it('should navigate to /templates when the "New Document" button is clicked', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <DocumentsList documentList={[]} />
        </ThemeProvider>
      </MemoryRouter>
    );

    const newDocButton = screen.getByRole('button', { name: /New Document/i });
    expect(newDocButton).toBeInTheDocument();

    fireEvent.click(newDocButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/templates');
  });

  it('should render the correct number of document items', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <DocumentsList documentList={mockDocumentList} />
        </ThemeProvider>
      </MemoryRouter>
    );

    const documentItems = screen.getAllByTestId(
      'documentListItem-containerWrapper'
    );
    expect(documentItems).toHaveLength(mockDocumentList.length);
  });
});
