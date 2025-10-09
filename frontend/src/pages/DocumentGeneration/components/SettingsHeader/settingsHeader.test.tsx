import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingHeader, { SettingsHeaderProps } from './index';

describe('SettingsHeader', () => {
  const setup = (props?: Partial<SettingsHeaderProps>) =>
    render(<SettingHeader title="Test Header" {...props} />);

  it('renders without crashing', () => {
    setup();
    expect(screen.getByText('Test Header')).toBeInTheDocument();
  });

  it('shows optional text when not required', () => {
    setup({ isRequired: false });
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('hides optional text when required', () => {
    setup({ isRequired: true });
    expect(screen.queryByText('(Optional)')).toBeNull();
  });

  it('renders popover info when tooltip is enabled', () => {
    setup({ popoverInfo: { content: 'Popover content' } });
    expect(screen.getByText('Test Header')).toBeInTheDocument();
  });
});
