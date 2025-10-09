import React, { Fragment, memo } from 'react';
import { Typography, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import AgentTitleWithStatus from '../AgentTitleWithStatus';

interface Message {
  text: string;
  agents?: string[];
}
interface MasterAgentProps {
  masterAgentStatusIsGenerated: boolean;
  messages?: Message[];
  title?: string;
}
const AgentMessage = styled(Typography)(({ theme }) => ({
  lineHeight: 1.45,
  letterSpacing: 0.15,
  marginLeft: 32,
  marginTop: 8,
  color: theme.palette.text.secondary
}));

const AgentEmoji = styled('span')(() => ({
  fontSize: 14,
  marginRight: 5,
  display: 'inline-flex',
  alignItems: 'center'
}));

const MasterAgent = ({
  masterAgentStatusIsGenerated,
  messages = [],
  title = ''
}: MasterAgentProps) => (
  <Stack sx={{ my: 4 }}>
    <AgentTitleWithStatus
      isGenerated={masterAgentStatusIsGenerated}
      title={title}
    />
    {messages.map((message, idx) => (
      <Fragment key={`message-${idx}`}>
        <AgentMessage>{message.text}</AgentMessage>
        {message.agents?.map((agent, agentIdx) => (
          <AgentMessage key={`agent-${idx}-${agentIdx}`} sx={{ mt: 0.5 }}>
            <AgentEmoji aria-hidden="true">🤖</AgentEmoji>
            {agent}
          </AgentMessage>
        ))}
      </Fragment>
    ))}
  </Stack>
);

export default memo(MasterAgent);
