import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DropdownMenu from '.';

const mockMenuItems = [
  {
    text: 'Item 1',
    handleClick: vi.fn(),
    tooltipTitle: 'Tooltip for Item 1',
    isHidden: false,
    disabled: false
  },
  {
    text: 'Item 2',
    handleClick: vi.fn(),
    tooltipTitle: 'Tooltip for Item 2',
    isHidden: false,
    disabled: true
  },
  {
    text: 'Item 3 (Hidden)',
    handleClick: vi.fn(),
    tooltipTitle: 'Tooltip for Item 3',
    isHidden: true,
    disabled: false
  }
];

describe('DropdownMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the icon button', () => {
    render(<DropdownMenu menuItems={mockMenuItems} />);
    const iconButtonElement = screen.getByRole('button');
    expect(iconButtonElement).toBeInTheDocument();
  });

  it('should open the dropdown menu on clicking the icon button', () => {
    render(<DropdownMenu menuItems={mockMenuItems} />);
    const iconButtonElement = screen.getByRole('button');
    fireEvent.click(iconButtonElement);
    const menuItem1 = screen.getByText('Item 1');
    const menuItem2 = screen.getByText('Item 2');
    expect(menuItem1).toBeInTheDocument();
    expect(menuItem2).toBeInTheDocument();
  });

  it('should call handleClick on clicking a menu item', () => {
    render(<DropdownMenu menuItems={mockMenuItems} />);
    const iconButtonElement = screen.getByRole('button');
    fireEvent.click(iconButtonElement);
    const menuItem1 = screen.getByText('Item 1');
    fireEvent.click(menuItem1);
    expect(mockMenuItems[0].handleClick).toHaveBeenCalled();
  });

  it('should not render hidden menu items', () => {
    render(<DropdownMenu menuItems={mockMenuItems} />);
    const iconButtonElement = screen.getByRole('button');
    fireEvent.click(iconButtonElement);
    const menuItem = screen.queryByText('Item 3 (Hidden)');
    expect(menuItem).toBeNull();
  });
});
