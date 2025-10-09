import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MasterAgent from './index';

describe('MasterAgent component', () => {
  const mockTitle = 'Master Agent Title';
  const mockMessages = [
    {
      text: 'Analyzing input...',
      agents: []
    },
    {
      text: 'Creating subsections according to Research Tasks for free form report...',
      agents: []
    },
    {
      text: 'Spawning team of agents...',
      agents: ['Scientific Writer', 'Reference Validator']
    }
  ];

  it('renders the title correctly', () => {
    render(
      <MasterAgent
        masterAgentStatusIsGenerated={true}
        title={mockTitle}
        messages={mockMessages}
      />
    );

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
  });

  it('renders all message texts', () => {
    render(
      <MasterAgent
        masterAgentStatusIsGenerated={true}
        title={mockTitle}
        messages={mockMessages}
      />
    );

    mockMessages.forEach((message) => {
      expect(screen.getByText(message.text)).toBeInTheDocument();
    });
  });

  it('handles empty messages array', () => {
    render(
      <MasterAgent
        masterAgentStatusIsGenerated={true}
        title={mockTitle}
        messages={[]}
      />
    );

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.queryByText('🤖')).not.toBeInTheDocument();
  });

  it('renders the correct number of agents from messages', () => {
    render(
      <MasterAgent
        masterAgentStatusIsGenerated={true}
        title={mockTitle}
        messages={mockMessages}
      />
    );

    // Check for agents from the last message
    mockMessages[2].agents.forEach((agent) => {
      expect(screen.getByText(agent)).toBeInTheDocument();
    });
  });

  it('should render emoji for each agent', () => {
    render(
      <MasterAgent
        masterAgentStatusIsGenerated={true}
        title={mockTitle}
        messages={mockMessages}
      />
    );

    const totalAgents = mockMessages.flatMap((m) => m.agents).length;
    const emojis = screen.getAllByText('🤖');
    expect(emojis).toHaveLength(totalAgents);
  });
});
