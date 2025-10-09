import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import PharmaMenu from '.';

// Mock SVG imports
vi.mock('assets/header/AppMenu.svg', () => ({
  ReactComponent: ({ ...props }) => (
    <svg data-testid="app-menu-icon" {...props} />
  )
}));

// Mock other SVG imports used in the component
vi.mock('assets/header/InClinico.svg', () => 'inclinico-icon.svg');
vi.mock('assets/header/Chemistry42.svg', () => 'chemistry42-icon.svg');
vi.mock('assets/header/PandaOmics.svg', () => 'pandaomics-icon.svg');
vi.mock(
  'assets/header/GenerativeBiologics.svg',
  () => 'generativebiologics-icon.svg'
);

describe('PharmaMenu Component', () => {
  const mockHandleLink = vi.fn();

  beforeEach(() => {
    mockHandleLink.mockClear();
  });

  test('renders the apps button', () => {
    render(<PharmaMenu />);

    const appsButton = screen.getByRole('button');
    expect(appsButton).toBeInTheDocument();
  });

  test('opens menu when apps button is clicked', () => {
    render(<PharmaMenu />);

    const appsButton = screen.getByRole('button');
    fireEvent.click(appsButton);

    // Check if menu title is displayed after opening
    expect(screen.getByText('Pharma.ai Suite')).toBeInTheDocument();
  });

  test('displays all menu items when opened', () => {
    render(<PharmaMenu />);

    const appsButton = screen.getByRole('button');
    fireEvent.click(appsButton);

    // Check if all menu items are displayed
    expect(screen.getByTestId('pandaOmicsTest')).toBeInTheDocument();
    expect(screen.getByTestId('chemistry42Test')).toBeInTheDocument();
    expect(screen.getByTestId('inClinicoTest')).toBeInTheDocument();
    expect(screen.getByTestId('generativeBiologicsTest')).toBeInTheDocument();
    expect(screen.getByTestId('moreAppsTest')).toBeInTheDocument();
  });
});
