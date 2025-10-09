import React from 'react';
import { Typography } from '@mui/material';
import AgentTitleWithStatus from '../AgentTitleWithStatus';
import MessageComponentByType from '../MessageComponentByType';

interface AgentLogsBySectionProps {
  title: string;
  agentsResult?: any;
  isSubsection?: boolean;
}

const AgentLogsBySection = ({
  title,
  agentsResult,
  isSubsection = false
}: AgentLogsBySectionProps) => {
  return (
    <div
      style={{
        marginBottom: 32,
        paddingRight: 90
      }}
    >
      <Typography
        fontSize={isSubsection ? '24px' : '32px'}
        my={1}
        data-testid="agentLogsBySection-title"
      >
        {title}
      </Typography>
      {agentsResult?.map((agent, index) => (
        <div
          key={index}
          style={{
            margin: '8px 0 16px 0'
          }}
        >
          <AgentTitleWithStatus
            isGenerated={agent.status === 'completed'}
            title={agent.agent_title!}
          />
          <MessageComponentByType
            text={agent.message}
            result={agent.result}
            buttonType="Result"
          />
        </div>
      ))}
    </div>
  );
};

export default AgentLogsBySection;
