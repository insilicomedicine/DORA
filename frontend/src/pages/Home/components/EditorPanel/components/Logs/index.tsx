import React, { memo, useEffect } from 'react';
import { Divider, CircularProgress, Stack } from '@mui/material';
import Title from './components/Title';
import MasterAgent from './components/MasterAgent';
import AgentLogsBySection from './components/AgentLogsBySection';
import { useDocumentStore } from 'contexts/documentsStore';
import { getDocumentLogs } from 'services/logs';

interface LogsViewProps {
  titleIsVisible?: boolean;
}

const LogsView = ({ titleIsVisible = true }: LogsViewProps) => {
  const {
    documentData,
    logsData,
    isLogsLoading,
    setLogsData,
    setIsLogsLoading
  } = useDocumentStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!documentData?.id) return;
      const data = await getDocumentLogs(documentData?.id);
      if (!data) return;
      setLogsData(data);
      setIsLogsLoading(false);
    };
    fetchData();
  }, []);

  const { agent_logs_by_sections, master } = logsData;
  const masterAgentStatusIsGenerated = true;
  const { estimated_document_generation_minutes, template_name: documentName } =
    documentData || {};

  const showMasterAgent =
    master?.title || (master?.messages && master.messages?.length > 0);
  const showTitle = Boolean(
    documentName && estimated_document_generation_minutes && titleIsVisible
  );

  if (isLogsLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}
      >
        <CircularProgress size={30} color="primary" />
      </div>
    );
  }

  return (
    <Stack
      key={documentData?.id}
      sx={{ maxHeight: '100%', scrollbarWidth: 'none', pl: 5 }}
    >
      {showTitle && (
        <>
          <Title
            name={documentName || ''}
            generatingTime={estimated_document_generation_minutes}
          />
          <Divider style={{ margin: '0 -40px', backgroundColor: '#F2F2F2' }} />
        </>
      )}

      <Stack
        sx={{
          overflowY: 'auto',
          maxHeight: '100%'
        }}
      >
        {showMasterAgent && (
          <MasterAgent
            masterAgentStatusIsGenerated={masterAgentStatusIsGenerated}
            messages={master.messages}
            title={master.title}
          />
        )}

        {agent_logs_by_sections?.map((section, index) => {
          const subSections = section?.sub_sections || [];
          const agentsResult = section?.generation_log?.agents_result || [];
          const hasAgentsResult = agentsResult?.length > 0;
          const hasSubsections = subSections.length > 0;

          return (
            <Stack key={index}>
              {(hasAgentsResult || hasSubsections) && (
                <AgentLogsBySection
                  key={index}
                  title={section?.title || ''}
                  agentsResult={agentsResult}
                />
              )}
              {subSections?.map((subSection, i) => {
                const generationLog = subSection?.generation_log || {};
                const agentsResult = generationLog?.agents_result || [];
                return (
                  agentsResult?.length > 0 && (
                    <AgentLogsBySection
                      key={i}
                      isSubsection
                      title={subSection?.title || ''}
                      agentsResult={agentsResult}
                    />
                  )
                );
              })}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default memo(LogsView);
