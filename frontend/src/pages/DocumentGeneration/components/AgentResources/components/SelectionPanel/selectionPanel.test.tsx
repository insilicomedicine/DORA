import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SelectionPanel from '.';
import { ThemeProvider } from '@mui/material';
import { theme } from 'theme';
import userEvent from '@testing-library/user-event';
import * as api from 'services/templates';

describe('SelectionPanel Tests', () => {
  let mockSetSelectedItems;

  beforeEach(() => {
    mockSetSelectedItems = vi.fn();
    vi.clearAllMocks();
  });

  const getProps = () => ({
    title: 'title',
    options: [
      {
        id: 1,
        label: 'name1',
        value: 'name1',
        key: 'key1',
        description: 'description1 test'
      },
      {
        id: 2,
        label: 'name2',
        value: 'name2',
        key: 'key2',
        description: 'description2 test',
        disabled: true
      },
      { id: 3, label: 'name3', value: 'name3', key: 'key3', toggleable: false },
      { id: 4, label: 'name4', value: 'name4', key: 'key4' }
    ],
    defaultDisplayCount: 3,
    suggestAction: {
      label: 'suggest action label',
      type: 'agent',
      placeholder: 'placeholder',
      description: 'suggest action description'
    },
    enableShowMore: true,
    selectedItems: [],
    setSelectedItems: mockSetSelectedItems
  });

  it('should render SelectionPanel component', () => {
    const props = getProps();
    render(
      <ThemeProvider theme={theme}>
        <SelectionPanel {...props} />
      </ThemeProvider>
    );
    expect(screen.getByText('title')).toBeInTheDocument();
    props.options
      .slice(0, props.defaultDisplayCount)
      .map((option) =>
        expect(screen.getByText(option.label)).toBeInTheDocument()
      );
    expect(screen.queryByText('name4')).not.toBeInTheDocument();
    expect(screen.getByText('suggest action label')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    //setSelectedItems event
    fireEvent.click(screen.getByText('name1'));
    expect(mockSetSelectedItems).toHaveBeenCalled();
    //show more event
    fireEvent.click(screen.getByText('+1 more'));
    expect(screen.getByText('name4')).toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    const props = getProps();
    render(
      <ThemeProvider theme={theme}>
        <SelectionPanel {...props} />
      </ThemeProvider>
    );
    const button = await screen.getByText('name1');
    await userEvent.hover(button);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toBeInTheDocument();
    expect(screen.getByText('description1 test')).toBeInTheDocument();
  });

  it('should not call setSelectedItems if the item is disabled', () => {
    const props = getProps();
    render(
      <ThemeProvider theme={theme}>
        <SelectionPanel {...props} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('name2'));
    expect(mockSetSelectedItems).not.toHaveBeenCalled();
  });

  it('should not call setSelectedItems if the item is not toggleable', () => {
    const props = getProps();
    render(
      <ThemeProvider theme={theme}>
        <SelectionPanel {...props} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('name3'));
    expect(mockSetSelectedItems).not.toHaveBeenCalled();
  });

  it('should open dialog on suggest action click', () => {
    const props = getProps();
    const createSuggestionsSpy = vi.spyOn(api, 'createSuggestions');
    render(
      <ThemeProvider theme={theme}>
        <SelectionPanel {...props} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('suggest action label'));
    expect(screen.getByText('suggest action description')).toBeInTheDocument();
    //change input value for description
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'suggest agent' }
    });
    fireEvent.click(screen.getByText('Send'));
    expect(createSuggestionsSpy).toHaveBeenCalledWith({
      suggest_type: 'agent',
      description: 'suggest agent'
    });
  });
});
