import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import Header from './components/DocumentGenerationHeader';
import CustomData from './components/CustomData';
import ResearchTasks from './components/ResearchTasks';
import TemplateInputs from './components/TemplateInputs';
import AgentResources from './components/AgentResources';
import PMCOrPubMedSearchSettings from './components/PMCOrPubMedSearchSettings';
import { getTemplate } from 'services/templates';
import { Template } from 'types/template';
import DeepResearch from './deepResearch';
import {
  generateDocuments,
  generatePlan,
  getDocument,
  updateDocument
} from 'services/documents';
import useSettingsStore from 'contexts/useSettingsStore';
import {
  convertToRecords,
  convertToUserInputs,
  transformCustomData
} from 'utils/documentGeneration';
import { useDocumentStore } from 'contexts/documentsStore';
import { theme } from 'theme';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import { convertToKey } from 'utils/utils';

const DocumentGeneration = () => {
  const navigate = useNavigate();
  const { systemInfo } = useSystemStore();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template') || '';
  const templateType = searchParams.get('type') || '';
  const { id: documentId = '' } = useParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [template, setTemplate] = useState<Template>();
  const [editMode, setEditMode] = useState<string>('');
  const [isResearchTasksGenerating, setIsResearchTasksGenerating] =
    useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const {
    isNewDocument = false,
    setIsNewDocument,
    newDocument,
    setNewDocument
  } = useDocumentStore((state) => state);

  const storedSettings = useSettingsStore((state) => state);
  const { updatePlan, updateSettings } = useSettingsStore((state) => state);
  const isPMCOrPubMedSearchEnabled = getSystemConfig(systemInfo);
  const isDeepResearch = useMemo(
    () => convertToKey(templateType || template?.type) === 'deepresearch',
    [template, templateType]
  );

  const setResearchTasksEditMode = (plan?: string) => {
    const editMode = !plan ? 'autoFill' : 'update';
    setEditMode(editMode);
  };

  useEffect(() => {
    if (isNewDocument) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(true);
    setEditMode('');
    setIsResearchTasksGenerating(false);

    if (documentId) {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const fetchDocument = async () => {
        const response = await getDocument(
          documentId,
          abortControllerRef?.current
        );
        if (!response) return;
        const responseData: Record<string, any> = {
          ...response,
          ...response.settings,
          name: response.template_name,
          type: response.template_type,
          user_inputs: response.filled_user_inputs,
          custom_data: transformCustomData(response.settings?.custom_data),
          display_name_on_plan_overview: response.display_name_on_plan_overview
        };

        setTemplate(responseData as Template);
        const user_inputs = convertToUserInputs(response.filled_user_inputs);
        updateSettings({
          ...responseData,
          user_inputs
        });
        setLoading(false);

        const isAllInputsFilled = Object.values(user_inputs).every(
          (value) => value !== ''
        );
        if (isAllInputsFilled) {
          setResearchTasksEditMode(responseData.plan);
        }
      };

      fetchDocument();
      return;
    }

    if (!templateId) return;

    const fetchTemplate = async () => {
      const response = await getTemplate(templateId);
      if (!response) return;
      setTemplate(response);
      updateSettings({
        ...response,
        template_id: templateId,
        user_inputs: convertToUserInputs(response.user_inputs),
        custom_data: {},
        plan: '',
        agents: {},
        uploadingFiles: false,
        custom_bibliographies: [],
        custom_bibliography_file_pks: []
      });

      // Set new document to the store
      setNewDocument({
        id: newDocument?.id || response.id,
        title: response?.name || '',
        stage: 'draft',
        template_type: response.type,
        created_at: new Date().toISOString()
      });

      setLoading(false);
    };
    fetchTemplate();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [documentId, isNewDocument, isDeepResearch]);

  const handleGenerateResearchTasks = async () => {
    setIsResearchTasksGenerating(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await generatePlan(documentId, abortControllerRef.current);
    if (!response) {
      setIsResearchTasksGenerating(false);
      return;
    }
    if (response?.canceled) return;
    updatePlan(response?.plan);
    setIsResearchTasksGenerating(false);
    setEditMode('');
  };

  const handleUpdateDocument = async (settings?: any) => {
    const {
      template_id,
      user_inputs = {},
      custom_data = {},
      agents = {},
      plan = '',
      custom_bibliography_file_pks
    } = { ...storedSettings, ...settings };

    const params: Record<string, any> = {
      template_id,
      settings: {
        user_inputs,
        custom_data: convertToRecords(custom_data),
        agents,
        plan,
        custom_bibliography_file_pks,
        ...settings
      }
    };

    const abortController = new AbortController();

    const docId = documentId || settings?.documentId;
    if (docId) {
      ['documentId', 'template_id'].forEach(
        (key) => delete params.settings[key]
      );
      const response = await updateDocument(docId, params, abortController);
      if (!response) return;
    } else {
      const response = await generateDocuments(params, abortController);
      if (!response) return;
      const { id } = response;
      navigate(`/documents/generation/${id}`);
      // Update new document data to the store
      setNewDocument({
        ...newDocument,
        id,
        status: 'initialized'
      });
      setIsNewDocument(true);
    }

    const allUserInputs = Object.values(params.settings.user_inputs);
    const isAllInputsFilled = allUserInputs.every((value) => value !== '');

    const isEnableGenerateResearchTasks =
      isAllInputsFilled &&
      ['user_inputs', 'custom_data', 'plan'].some((key) =>
        settings.hasOwnProperty(key)
      );
    if (isEnableGenerateResearchTasks) {
      setResearchTasksEditMode(plan);
      return;
    }
    setEditMode(!isAllInputsFilled ? '' : editMode);
  };

  if (loading && !isDeepResearch) {
    return (
      <Stack
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          bgcolor: 'white',
          borderRadius: 4,
          flex: 1
        }}
      >
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack
      sx={{
        bgcolor: 'white',
        height: '100%',
        borderRadius: 4,
        flex: 1,
        width: '60%',
        transition: 'width 200ms ease-out',
        ...(isDeepResearch && {
          position: 'relative'
        })
      }}
    >
      {template && (
        <Header
          template={template}
          isResearchTasksGenerating={isResearchTasksGenerating}
          isDeepResearch={isDeepResearch}
        />
      )}
      <Box
        display="flex"
        p="0 32px"
        gap={4}
        sx={{
          ...(isDeepResearch
            ? {
                maxWidth: 1280,
                minWidth: '80%',
                margin: '0 auto',
                height: 'calc(100% - 47px)'
              }
            : { height: '100%' })
        }}
      >
        {isDeepResearch ? (
          <DeepResearch
            {...(documentId && { documentId })}
            {...(templateId && { templateId })}
          />
        ) : (
          <>
            <Stack
              sx={{ pr: 0.5, borderRight: '1px solid #E6E6E6', width: '50%' }}
            >
              <Stack
                sx={{
                  flex: 1,
                  pr: 4,
                  pb: 20,
                  overflow: 'auto',
                  scrollbarGutter: 'stable',
                  [theme.breakpoints.up('bp1800')]: {
                    pr: 10
                  },
                  ...(isResearchTasksGenerating && {
                    '& .draftSettings': {
                      opacity: 0.56,
                      pointerEvents: 'none',
                      '& *': {
                        color: `${theme.palette.text.disabled} !important`,
                        '&.MuiButton-outlined': {
                          borderColor: 'text.disabled'
                        },
                        '&.MuiButton-contained': {
                          backgroundColor: 'transparent',
                          border: '1px solid',
                          borderColor: 'grey.400'
                        }
                      },
                      '& .MuiButtonBase-root.MuiChip-filled': {
                        backgroundColor: 'grey.50',
                        borderColor: 'grey.300'
                      }
                    }
                  })
                }}
              >
                <Tooltip
                  title={
                    isResearchTasksGenerating &&
                    `Please wait while the research tasks are being generated,
                 or refresh the page`
                  }
                  followCursor
                >
                  <div>
                    {template && (
                      <Stack>
                        <TemplateInputs
                          templateUserInputs={template?.user_inputs}
                          handleUpdateDocument={handleUpdateDocument}
                        />
                        <Divider />
                        <CustomData
                          sectionsData={{
                            ...template,
                            sections: storedSettings.sections
                          }}
                          handleUpdateDocument={handleUpdateDocument}
                        />
                      </Stack>
                    )}
                    <Divider />
                    <AgentResources
                      handleUpdateDocument={handleUpdateDocument}
                    />
                  </div>
                </Tooltip>
                {isPMCOrPubMedSearchEnabled && <PMCOrPubMedSearchSettings />}
              </Stack>
            </Stack>
            <ResearchTasks
              loading={loading}
              editMode={editMode}
              isResearchTasksGenerating={isResearchTasksGenerating}
              handleGenerateResearchTasks={handleGenerateResearchTasks}
              handleUpdateDocument={handleUpdateDocument}
              displayNameOnPlanOverview={
                template?.display_name_on_plan_overview
              }
            />
          </>
        )}
      </Box>
    </Stack>
  );
};

export default DocumentGeneration;
