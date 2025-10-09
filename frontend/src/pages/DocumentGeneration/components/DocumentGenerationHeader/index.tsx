import React, { memo, useState, useMemo, useEffect } from 'react';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { PlayCircleRounded } from '@mui/icons-material';
import { generateDocument } from 'services/documents';
import { templateIcons } from 'utils/templates';
import { Template } from 'types/template';
import { convertToKey, formatDateWithNewRule } from 'utils/utils';
import usePlanStatus from 'hooks/usePlanStatus';
import useSettingsStore from 'contexts/useSettingsStore';
import { getTooltipTitle } from 'utils/documentGeneration';
import LeftPanelButtons from '../../../Home/components/LeftPanel/components/Buttons/SingleMode';
import {
  useDeletedDocumentStore,
  useDocumentStore
} from 'contexts/documentsStore';
import { getUserInfo } from 'services/user';
import { useUserStore } from 'contexts/useUserStore';

interface HeaderProps {
  template?: Template;
  isResearchTasksGenerating?: boolean;
}

const Header = ({
  template,
  isResearchTasksGenerating = false
}: HeaderProps) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const { id: documentId = '' } = useParams();
  const { setUserInfo } = useUserStore();
  const {
    user_inputs: userInputs,
    plan: researchTasks = '',
    uploadingFiles = false
  } = useSettingsStore((state) => state);

  const {
    setIsNewDocumentGenerating,
    setIsNewDocument,
    isNewDocumentGenerating = false
  } = useDocumentStore((state) => state);

  const { deletedDocumentId } = useDeletedDocumentStore();

  const {
    isFree,
    isAdvanced,
    isLimited,
    remainingDocuments = 0,
    endDate = '',
    inProgressDocuments = 0
  } = usePlanStatus();

  const renderUserPlanMessage = () => {
    if (!(isFree || isAdvanced)) return '';
    if (isLimited) {
      if (isFree) {
        return (
          <>
            All free generations used.
            <br />
            <span style={{ color: '#1C8554', fontWeight: 500 }}>
              Upgrade Your Plan{' '}
            </span>
            to get more.
          </>
        );
      }
      return (
        <>
          All 10 generations used. They will renew on
          {formatDateWithNewRule(endDate)},
          <br /> or
          <span style={{ color: '#1C8554', fontWeight: 500 }}>
            Upgrade Your Plan{' '}
          </span>
          to get more.
        </>
      );
    }

    if (remainingDocuments === null) {
      return '';
    }

    return `${remainingDocuments} ${remainingDocuments > 1 ? 'Generations' : 'Generation'} Left`;
  };

  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    const response = await generateDocument(documentId);
    if (!response) {
      setIsGenerating(false);
      return;
    }
    setIsNewDocumentGenerating(true);
    setIsNewDocument(false);
    navigate(`/documents/${response.document_id}`);
  };

  const { type: templateType = '', name: templateName = '' } = template || {};

  const { icon: templateIcon = '📚' } =
    templateIcons[convertToKey(templateType)] || {};

  const isInProgressDocumentsLimited = inProgressDocuments >= 5;

  const isDisableGenerate = useMemo(
    () =>
      (Array.isArray(userInputs)
        ? userInputs.some((input) => !input.value)
        : Object.values(userInputs).some((value) => !value)) ||
      !researchTasks ||
      uploadingFiles ||
      isResearchTasksGenerating ||
      isGenerating ||
      isLimited ||
      isInProgressDocumentsLimited,
    [
      userInputs,
      researchTasks,
      uploadingFiles,
      isResearchTasksGenerating,
      isLimited,
      isInProgressDocumentsLimited,
      isGenerating
    ]
  );

  const tooltipTitle = useMemo(
    () =>
      getTooltipTitle(
        uploadingFiles,
        researchTasks,
        isInProgressDocumentsLimited
      ),
    [uploadingFiles, researchTasks, isInProgressDocumentsLimited]
  );

  // Update user data after document generation or deletion
  useEffect(() => {
    if (!isNewDocumentGenerating && !deletedDocumentId) return;
    const updateUserData = async () => {
      const userInfo = await getUserInfo();
      setUserInfo(userInfo);
    };
    updateUserData();
  }, [isNewDocumentGenerating, deletedDocumentId]);

  return (
    <Box
      role="presentation"
      display="flex"
      alignItems="center"
      p="11px 40px 11px 16px"
      borderBottom="1px solid #F2F2F2"
      sx={{
        transition: 'all 200ms ease-out'
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <LeftPanelButtons sx={{ ml: 1, mr: 2 }} />
        <Typography
          variant="caption"
          color="text.primary"
          p="2px 12px 2px 6px"
          lineHeight="inherit"
          display="flex"
          alignItems="center"
        >
          <span
            style={{
              width: 24,
              height: 24,
              textAlign: 'center',
              display: 'inline-block'
            }}
          >
            {templateIcon}
          </span>
          <span
            style={{
              fontWeight: 500,
              height: 16,
              letterSpacing: 0,
              lineHeight: '1.37'
            }}
          >
            {templateName}
          </span>
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        sx={{ ml: 'auto', alignItems: 'center' }}
      >
        <Typography variant="caption" color="text.secondary" lineHeight="137%">
          {renderUserPlanMessage()}
        </Typography>
        <Tooltip title={tooltipTitle}>
          <span>
            <Button
              variant="contained"
              endIcon={<PlayCircleRounded sx={{ ml: -0.5 }} />}
              sx={{ textTransform: 'none', py: '5px', lineHeight: 1.45 }}
              onClick={handleGenerateDocument}
              disabled={isDisableGenerate}
              data-ga-event="generate_document"
            >
              Generate
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default memo(Header);
