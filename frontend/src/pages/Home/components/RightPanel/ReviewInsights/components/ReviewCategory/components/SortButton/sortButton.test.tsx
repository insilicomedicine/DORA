import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SortButton from './index';
import { ReviewSuggestionSeriousnessLevels } from 'types/document';

describe('SortButton', () => {
  const mockHandleFilterClick = vi.fn();
  const props = {
    level: ReviewSuggestionSeriousnessLevels.high,
    color: '#FF0000',
    borderColor: '#FFAAAA',
    activeColor: '#FF5555',
    count: 10,
    activeFilter: null,
    handleFilterClick: mockHandleFilterClick
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (overrides = {}) => {
    render(<SortButton {...props} {...overrides} />);
  };

  test('renders correctly with given props', () => {
    renderComponent();

    const wrapper = screen.getByTestId('sortButton-wrapper');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveStyle(`border: 1px solid ${props.borderColor}`);
    expect(wrapper).toHaveStyle(`color: ${props.color}`);

    const levelText = screen.getByTestId('sortButton-level');
    expect(levelText).toBeInTheDocument();
    expect(levelText).toHaveTextContent('High');
    expect(levelText).toHaveStyle(`color: ${props.color}`);

    const countText = screen.getByTestId('sortButton-count');
    expect(countText).toBeInTheDocument();
    expect(countText).toHaveTextContent(`${props.count}`);
    expect(countText).toHaveStyle(`color: ${props.color}`);
  });

  test('applies active styles when activeFilter matches level', () => {
    renderComponent({ activeFilter: props.level });

    const wrapper = screen.getByTestId('sortButton-wrapper');
    expect(wrapper).toHaveStyle(`background-color: ${props.activeColor}`);
  });

  test('calls handleFilterClick with the correct level when clicked', () => {
    renderComponent();

    const wrapper = screen.getByTestId('sortButton-wrapper');
    fireEvent.click(wrapper);

    expect(mockHandleFilterClick).toHaveBeenCalledTimes(1);
    expect(mockHandleFilterClick).toHaveBeenCalledWith(props.level);
  });

  test('does not apply active styles when activeFilter does not match level', () => {
    renderComponent({ activeFilter: ReviewSuggestionSeriousnessLevels.medium });

    const wrapper = screen.getByTestId('sortButton-wrapper');
    expect(wrapper).not.toHaveStyle(`background-color: ${props.activeColor}`);
  });
});
