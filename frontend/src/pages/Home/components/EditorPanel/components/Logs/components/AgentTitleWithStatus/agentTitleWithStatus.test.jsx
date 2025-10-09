import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentTitleWithStatus from './index';

afterEach(cleanup);

describe('AgentTitleWithStatus component', () => {
  it('renders the title correctly with correct font-weight (isGenerated={false})', () => {
    const title = 'Test Title';
    render(<AgentTitleWithStatus isGenerated={false} title={title} />);
    const titleElement = screen.getByTestId('agentTitleWithStatus-title');
    expect(titleElement).toHaveTextContent(title);
    expect(titleElement).toHaveStyle('font-weight: 500');
  });

  it('displays the CircularProgress when isGenerated is false', () => {
    render(<AgentTitleWithStatus isGenerated={false} title="Test Title" />);
    const loader = screen.getByTestId('agentTitleWithStatus-loader');
    expect(loader).toBeInTheDocument();
  });

  it('displays the DoneRounded icon when isGenerated is true', () => {
    render(<AgentTitleWithStatus isGenerated={true} title="Test Title" />);
    const doneIcon = screen.getByTestId('agentTitleWithStatus-doneIcon');
    expect(doneIcon).toBeInTheDocument();
  });

  it('sets correct font weight based on isGenerated is true', () => {
    render(<AgentTitleWithStatus isGenerated={true} title="Test Title" />);
    const generatedTitleElement = screen.getByTestId(
      'agentTitleWithStatus-title'
    );
    expect(generatedTitleElement).toHaveStyle('font-weight: 400');
  });
});
