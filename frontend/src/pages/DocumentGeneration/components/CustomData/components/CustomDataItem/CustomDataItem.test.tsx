import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CustomDataItem, { SectionCustomData } from './index';

describe('CustomDataItem', () => {
  const mockData: SectionCustomData = {
    slug: 'test-slug',
    title: 'Test Title',
    description: 'Test Description'
  };

  it('should render item data', () => {
    render(<CustomDataItem itemData={mockData} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call handleItemClick when clicked', () => {
    const handleItemClick = vi.fn();
    render(
      <CustomDataItem itemData={mockData} handleItemClick={handleItemClick} />
    );
    fireEvent.click(screen.getByText('Test Title'));
    expect(handleItemClick).toHaveBeenCalled();
  });

  it('should call handleDelete when delete icon is clicked', () => {
    const handleDelete = vi.fn();
    render(<CustomDataItem itemData={mockData} handleDelete={handleDelete} />);
    const deleteIcon = screen.getByTestId('CloseRoundedIcon');
    fireEvent.click(deleteIcon);
    expect(handleDelete).toHaveBeenCalledWith('test-slug');
  });
});
