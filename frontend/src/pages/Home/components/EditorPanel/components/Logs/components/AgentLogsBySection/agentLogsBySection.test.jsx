import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentLogsBySection from './index';

describe('AgentLogsBySection Component', () => {
  const sampleAgentsResult = [
    {
      status: 'completed',
      agent_title: 'Agent 1',
      message: 'Message 1',
      result: 'Result 1'
    },
    {
      status: 'in_progress',
      agent_title: 'Agent 2',
      message: 'Message 2',
      result: 'Result 2'
    }
  ];

  it('renders the title with correct text and size (non-subsection)', () => {
    render(
      <AgentLogsBySection
        title="Test Section"
        agentsResult={[]}
        isSubsection={false}
      />
    );

    const titleElement = screen.getByTestId('agentLogsBySection-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Test Section');
    expect(titleElement).toHaveStyle('font-size: 32px'); // non-subsection font size
  });

  it('renders the title with correct text and size (subsection)', () => {
    render(
      <AgentLogsBySection
        title="Test Subsection"
        agentsResult={[]}
        isSubsection={true}
      />
    );

    const titleElement = screen.getByTestId('agentLogsBySection-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Test Subsection');
    expect(titleElement).toHaveStyle('font-size: 24px'); // subsection font size
  });

  it('renders AgentTitleWithStatus and MessageComponentByType for each agent', () => {
    render(
      <AgentLogsBySection
        title="Test Section"
        agentsResult={sampleAgentsResult}
      />
    );

    // Verify the agent title with status is rendered correctly
    const agentTitleElements = screen.getAllByTestId(
      'agentTitleWithStatus-title'
    );
    expect(agentTitleElements.length).toBe(2);
    expect(agentTitleElements[0]).toHaveTextContent('Agent 1');
    expect(agentTitleElements[1]).toHaveTextContent('Agent 2');

    // Verify the message component text is rendered
    const messageComponents = screen.getAllByText(/Message/i);
    expect(messageComponents.length).toBe(2);
    expect(messageComponents[0]).toHaveTextContent('Message 1');
    expect(messageComponents[1]).toHaveTextContent('Message 2');

    // Verify the result is rendered in MessageComponentByType
    const resultElements = screen.getAllByText(/Result/i);
    expect(resultElements.length).toBe(2);
    expect(resultElements[0]).toHaveTextContent('Show Result');
    expect(resultElements[1]).toHaveTextContent('Show Result');
  });

  it('renders nothing when agentsResult is empty', () => {
    render(<AgentLogsBySection title="Empty Section" agentsResult={[]} />);

    const agentTitles = screen.queryAllByTestId('agentTitleWithStatus-title');
    const messageComponents = screen.queryAllByText(/Message/i);

    expect(agentTitles.length).toBe(0);
    expect(messageComponents.length).toBe(0);
  });

  it('clicks on the show result button in MessageComponentByType', () => {
    render(
      <AgentLogsBySection
        title="Test Section"
        agentsResult={sampleAgentsResult}
      />
    );

    const showResultButtons = screen.getAllByTestId(
      'messageComponentByType-showResultButton'
    );

    fireEvent.click(showResultButtons[0]);
    expect(screen.getByText('Result 1')).toBeInTheDocument();
  });
});
