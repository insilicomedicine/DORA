import React, { useEffect } from 'react';
import CitationSettings from './CitationSettings';
import { useDocumentStore } from 'contexts/documentsStore';
import { CircularProgress, Stack } from '@mui/material';
import InfoButton from 'components/InfoButton';
import { useEditorStore } from 'contexts/editorStore';
import TabsSection from './components/TabsSection';
import TextEvidenceSection from './components/TextEvidenceSection';
import { RightPanelComponentIds } from 'types/document';
import useRightPanelStore from 'contexts/useRightPanelStore';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import StyledBox from '../StyledBox';

const RightPanel = () => {
  const { isRightPanelCollapsed } = useRightPanelStore();
  const {
    rightPanel: { activedComponentId = 'bibliography' } = {},
    referenceLinkTarget,
    setRightPanel,
    setNewBibliographyList,
    setReferenceLinkTarget
  } = useEditorStore();

  const { documentData, isDocumentLoading = true } = useDocumentStore();
  const systemInfo = useSystemStore((state) => state.systemInfo);

  const handleChange = (_, newValue: string) => {
    setRightPanel({
      activedComponentId: activedComponentId === newValue ? '' : newValue
    });
    setNewBibliographyList(null);
  };

  //Initialize the bibliography tab when the paper is loaded
  useEffect(() => {
    setRightPanel({
      activedComponentId: RightPanelComponentIds.bibliography
    });
  }, [documentData?.id]);

  if (isDocumentLoading) {
    return (
      <StyledBox
        isCollapsed={isRightPanelCollapsed}
        display="flex"
        minHeight="100%"
        alignItems="center"
        justifyContent="center"
        sx={{
          height: '100%',
          maxHeight: '100%',
          gap: 1,
          overflow: 'hidden'
        }}
      >
        <CircularProgress size={24} />
      </StyledBox>
    );
  }

  // Enable citation settings  only if the user has selected PMC/PubMed resources via the Publication Search Agent
  const citiationSettingsTool =
    documentData?.settings?.agents?.pubmed_abstract_similarity_search_tool ||
    {};
  const { resources: citiationSettingsToolResources = [] } =
    citiationSettingsTool;
  const isPMCOrPubMedSearchEnabled = getSystemConfig(systemInfo);
  const isEnableCitationSettings =
    isPMCOrPubMedSearchEnabled &&
    citiationSettingsToolResources.length > 0 &&
    ['pmc', 'pubmed'].some((resource) =>
      citiationSettingsToolResources.includes(resource)
    );

  return (
    <StyledBox isCollapsed={isRightPanelCollapsed}>
      <Stack
        sx={{
          height: '100%',
          maxHeight: '100%',
          backgroundColor: 'common.white',
          borderRadius: 4,
          overflow: 'hidden',
          userSelect: 'text'
        }}
      >
        <TextEvidenceSection
          referenceLinkTarget={referenceLinkTarget}
          setReferenceLinkTarget={setReferenceLinkTarget}
        />
        <TabsSection
          activedComponentId={activedComponentId}
          handleChange={handleChange}
        />
        {isEnableCitationSettings && (
          <InfoButton
            buttonText="Citation Settings"
            buttonSize={16}
            sx={{
              marginTop: 'auto',
              padding: '12px 16px',
              alignItems: 'center',
              fontSize: 12
            }}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left'
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            popoverInfo={
              <CitationSettings
                title="Settings applied for generation"
                mode="readonly"
                settings={documentData?.publication_settings}
              />
            }
          />
        )}
      </Stack>
    </StyledBox>
  );
};

export default RightPanel;
