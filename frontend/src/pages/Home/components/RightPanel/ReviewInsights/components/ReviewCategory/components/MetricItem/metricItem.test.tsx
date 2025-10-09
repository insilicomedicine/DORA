import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricItem from './index';

describe('MetricItem', () => {
  const renderComponent = (props: {
    label: string;
    value: number | string;
    unit?: string;
  }) => {
    render(<MetricItem {...props} />);
  };

  test('renders correctly with label and value', () => {
    renderComponent({ label: 'Score', value: 95 });

    const labelElement = screen.getByText(/Score:/);
    expect(labelElement).toBeInTheDocument();

    const valueElement = screen.getByText('95');
    expect(valueElement).toBeInTheDocument();
  });

  test('renders correctly with unit', () => {
    renderComponent({ label: 'Speed', value: 120, unit: 'km/h' });

    const labelElement = screen.getByText(/Speed:/);
    expect(labelElement).toBeInTheDocument();

    const valueElement = screen.getByText('120');
    expect(valueElement).toBeInTheDocument();

    const unitElement = screen.getByText('km/h');
    expect(unitElement).toBeInTheDocument();
  });

  test('does not render unit when not provided', () => {
    renderComponent({ label: 'Items', value: 50 });

    const labelElement = screen.getByText(/Items:/);
    expect(labelElement).toBeInTheDocument();

    const valueElement = screen.getByText('50');
    expect(valueElement).toBeInTheDocument();

    // Ensure unit is not rendered
    const unitElement = screen.queryByText('unit');
    expect(unitElement).toBeNull();
  });

  test('renders correctly with string value', () => {
    renderComponent({ label: 'Status', value: 'Active' });

    const labelElement = screen.getByText(/Status:/);
    expect(labelElement).toBeInTheDocument();

    const valueElement = screen.getByText('Active');
    expect(valueElement).toBeInTheDocument();
  });
});
