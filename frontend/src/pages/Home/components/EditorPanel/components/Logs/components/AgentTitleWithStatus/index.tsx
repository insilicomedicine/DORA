import React from 'react';
import { Typography, CircularProgress, Box } from '@mui/material';
import { DoneRounded } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const MasterAgentTitleWrapper = styled('div')(() => ({
  display: 'flex'
}));

const StatusWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isGenerated'
})<{ isGenerated?: boolean }>(({ isGenerated }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: isGenerated ? '#ffffff' : '#E7F6EE',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 6,
  padding: 4,
  border: isGenerated ? '1px solid #E7F6EE' : 'none'
}));

interface AgentTitleWithStatusProps {
  isGenerated: boolean;
  title: string;
}

const AgentTitleWithStatus = ({
  isGenerated,
  title
}: AgentTitleWithStatusProps) => {
  return (
    <MasterAgentTitleWrapper>
      <StatusWrapper isGenerated={isGenerated}>
        {isGenerated ? (
          <DoneRounded
            sx={{
              width: 18,
              height: 18,
              color: '#21965F'
            }}
            data-testid="agentTitleWithStatus-doneIcon"
          />
        ) : (
          <CircularProgress
            size={12}
            data-testid="agentTitleWithStatus-loader"
          />
        )}
      </StatusWrapper>
      <Typography
        sx={{
          lineHeight: '145%',
          fontWeight: isGenerated ? 400 : 500,
          marginLeft: '8px'
        }}
        data-testid="agentTitleWithStatus-title"
      >
        {title}
      </Typography>
    </MasterAgentTitleWrapper>
  );
};

export default AgentTitleWithStatus;
