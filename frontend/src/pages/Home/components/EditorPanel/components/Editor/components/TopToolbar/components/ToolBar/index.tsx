import React, { Fragment, memo, MouseEvent, useMemo } from 'react';
import { IconButton, Stack, Typography, Box, Tooltip } from '@mui/material';
import {
  RedoRounded,
  SaveAltRounded,
  UndoRounded,
  ChecklistRounded
} from '@mui/icons-material';
import Snackbar from 'utils/snackbar';
import { isBeforeCheckData } from 'utils/utils';
import Feedback from '../../../Feedback';
import usePlanStatus from 'hooks/usePlanStatus';
import SidebarCollapse from 'components/SidebarCollapse';
import useRightPanelStore from 'contexts/useRightPanelStore';
import LeftPanelButtons from 'pages/Home/components/LeftPanel/components/Buttons/SingleMode';
import { RightPanelComponentIds } from 'types/document';
import Icons from 'pages/Templates/components/Icons';
import UserInputs from './../../../UserInputs';
import { useEditorStore } from 'contexts/editorStore';
import { TopToolbarButtonGroup, TopToolbarButton } from './StyledComponents';
import { generateLinkContent } from 'utils/editor';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';
import { useDocumentStore } from 'contexts/documentsStore';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import { theme } from 'theme';

interface ToolBarProps {
  enablePolishing: boolean;
  editor: any;
  autoShowTooltip: boolean;
  setAutoShowTooltip: (_arg: boolean) => void;
  isDocumentInProgress: boolean;
  setIsShowLogsDialogOpen: (_arg: boolean) => void;
  enableAddCitation: boolean;
  isPolishing: boolean;
  handlePolish: () => void;
  setShowAddCitationPopup: (_arg: boolean) => void;
  handleClickExportMenu: (_arg: MouseEvent<HTMLButtonElement>) => void;
}

interface MenuItem {
  key: string;
  iconText?: string;
  label?: string;
  icon?: React.ReactNode;
  tooltipTitle?: string;
  enableTooltipArrow?: boolean;
  enableAutoShowTooltip?: boolean;
  disabled?: boolean;
  disableGATracking?: boolean;
  sx?: Record<string, any>;
  enableDivider?: boolean;
  handleClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

const ToolBar = ({
  enablePolishing,
  editor,
  autoShowTooltip,
  setAutoShowTooltip,
  isDocumentInProgress,
  setIsShowLogsDialogOpen,
  enableAddCitation,
  isPolishing,
  handlePolish,
  setShowAddCitationPopup,
  handleClickExportMenu
}: ToolBarProps) => {
  const { isRightPanelCollapsed, toggleCollapseRightPanel } =
    useRightPanelStore();
  const { setRightPanel } = useEditorStore();
  const { documentData } = useDocumentStore();
  const { systemInfo } = useSystemStore();

  const { isLoading: reviewInsightsIsLoading, generateReview } =
    useReviewInsightsStore();

  const {
    template_name: templateName = '',
    template_type: templateType = '',
    created_at: createdAt = '',
    filled_user_inputs: filledUserInputs,
    custom_bibliographies: customBibliographies = [],
    sections: paperSections = []
  } = documentData || {};

  const { limitType = '', isExpired, limitInfos = {} } = usePlanStatus();

  const isDisabled = isExpired || documentData?.status !== 'completed';
  const hasSections = Boolean(documentData?.sections?.length);

  const documentIsBeforeCheckDate = isBeforeCheckData(
    new Date(documentData?.created_at || ''),
    new Date('2024-10-14T00:00:00Z')
  );

  const handleGenerateReview = async () => {
    setRightPanel({
      activedComponentId: RightPanelComponentIds.reviewInsights
    });

    if (documentData?.id) {
      await generateReview(documentData.id);
    }
  };

  const handleAddCitation = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!enableAddCitation) {
      Snackbar.info(
        'Please place the cursor where you want to add the citation first'
      );
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent(` ${generateLinkContent({})} `)
      .setMeta('preventUpdate', true)
      .run();
    setShowAddCitationPopup(true);
  };

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        iconText: 'Review',
        key: 'review',
        label: 'Review',
        disabled:
          isPolishing || isDocumentInProgress || reviewInsightsIsLoading,
        handleClick: handleGenerateReview
      },
      {
        iconText: 'Polish',
        key: 'polish',
        label: 'Polish',
        tooltipTitle: enablePolishing
          ? `Changes in the text can lead to inconsistency.\nPolish the text to make it consistent.`
          : 'Enhance the consistency of the document \n after a change to the document text',
        enableTooltipArrow: enablePolishing,
        enableAutoShowTooltip: true,
        disabled: !enablePolishing,
        handleClick: handlePolish
      },
      {
        iconText: 'Add Citation',
        key: 'addCitation',
        tooltipTitle: 'Place the cursor in the text to add a citation',
        handleClick: handleAddCitation,
        disabled: isDisabled || !enableAddCitation,
        sx: {
          ...(!getSystemConfig(systemInfo, ['pmc', 'pubmed', 'websearch']) && {
            display: 'none'
          })
        }
      },
      {
        icon: <UndoRounded />,
        key: 'undo',
        label: 'Undo',
        disabled: !editor.can().chain().undo().run(),
        handleClick: () => editor.chain().blur().undo().run()
      },
      {
        icon: <RedoRounded />,
        key: 'redo',
        label: 'Redo',
        disabled: !editor.can().chain().redo().run(),
        handleClick: () => editor.chain().redo().run(),
        enableDivider: true
      },
      {
        icon: <SaveAltRounded fontSize="small" />,
        key: 'exportDocument',
        tooltipTitle: 'Export menu',
        handleClick: handleClickExportMenu,
        disabled: isDisabled,
        disableGATracking: true,
        sx: { mx: 0.5 }
      },
      {
        icon: <ChecklistRounded fontSize="small" />,
        key: 'documentLogs',
        label: 'Document Logs',
        tooltipTitle: 'Document generation logs',
        handleClick: () => setIsShowLogsDialogOpen(true),
        disabled: isDisabled,
        disableGATracking: false,
        sx: {
          ...(documentIsBeforeCheckDate
            ? { visibility: 'hidden' }
            : {
                mx: 0.5,
                '&:hover': {
                  backgroundColor: theme.palette.primary.light
                }
              })
        }
      }
    ],
    [
      isPolishing,
      isDocumentInProgress,
      reviewInsightsIsLoading,
      enablePolishing,
      handlePolish,
      isDisabled,
      enableAddCitation,
      editor,
      documentIsBeforeCheckDate,
      handleClickExportMenu
    ]
  );

  const menuItemsButtons = useMemo(() => menuItems.slice(0, 3), [menuItems]);
  const menuItemsIcons = useMemo(() => menuItems.slice(3), [menuItems]);

  const customData = useMemo(
    () =>
      paperSections
        .map((section) => {
          if (section.custom_data) {
            return { content: section.custom_data, title: section.label };
          }
          return null;
        })
        .filter(Boolean),
    [paperSections]
  );

  const renderHeader = () => (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
      <LeftPanelButtons />
      <Stack direction="row" sx={{ mr: 4, alignItems: 'center' }} spacing={1}>
        <Icons type={templateType} color="#9E9E9E" />
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ maxHeight: 80, minWidth: 100, overflow: 'hidden' }}
          data-testid="userInputs-templateName"
        >
          {templateName}
        </Typography>
        <UserInputs
          templateName={templateName}
          createdAt={createdAt}
          userInputsData={filledUserInputs}
          templateType={templateType}
          customBibliographies={customBibliographies}
          customData={customData}
        />
      </Stack>
    </Stack>
  );

  const getTooltipTitle = (item: MenuItem) =>
    isExpired
      ? limitInfos[limitType]?.document || limitInfos[limitType]
      : item.tooltipTitle || item.label || '';

  const getIsButtonDisabled = (item: MenuItem) =>
    isDisabled || item.disabled || !hasSections;

  const renderToolbarButton = (
    item: MenuItem,
    index: number,
    isTextButton: boolean = false
  ) => {
    const {
      enableTooltipArrow = false,
      enableAutoShowTooltip = false,
      disableGATracking = false,
      sx = {}
    } = item;
    const isButtonDisabled = getIsButtonDisabled(item);

    const tooltipProps = enableAutoShowTooltip
      ? {
          open: autoShowTooltip,
          onMouseEnter: () => setAutoShowTooltip(!enablePolishing)
        }
      : {
          onOpen: () => setAutoShowTooltip(false)
        };

    const gaTrackingProps = !disableGATracking
      ? {
          'data-ga-tracking': true,
          'data-ga-event-location': 'editor_tool_bar',
          'data-ga-event-type': item.iconText || item.label || item.key
        }
      : {};

    const commonButtonProps = {
      disableRipple: true,
      color: (editor.isActive(item.key) ? 'secondary' : 'default') as
        | 'secondary'
        | 'default',
      disabled: isButtonDisabled,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        if (isTextButton) {
          editor.commands.blur();
        }
        item.handleClick(event);
      },
      ...gaTrackingProps
    };

    return (
      <Fragment key={index}>
        <Tooltip
          {...tooltipProps}
          title={getTooltipTitle(item)}
          arrow={enableTooltipArrow}
          placement={isTextButton ? 'bottom' : undefined}
        >
          <span style={{ minWidth: 'fit-content' }}>
            {isTextButton ? (
              <TopToolbarButton {...commonButtonProps} sx={sx}>
                {item.iconText && (
                  <Typography
                    fontWeight={500}
                    variant="body2"
                    color={isButtonDisabled ? '#BDBDBD' : '#21965F'}
                  >
                    {item.iconText}
                  </Typography>
                )}
              </TopToolbarButton>
            ) : (
              <IconButton
                {...commonButtonProps}
                sx={{
                  p: 0.75,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  },
                  [theme.breakpoints.down('xl')]: {
                    '& .MuiSvgIcon-root': {
                      fontSize: 18
                    }
                  },
                  ...sx
                }}
              >
                {item.icon}
              </IconButton>
            )}
          </span>
        </Tooltip>
      </Fragment>
    );
  };

  return (
    <>
      {renderHeader()}

      <TopToolbarButtonGroup
        variant="outlined"
        onMouseLeave={() => setAutoShowTooltip(false)}
        sx={{ minWidth: 200 }}
      >
        {menuItemsButtons.map((item, index) =>
          renderToolbarButton(item, index, true)
        )}
      </TopToolbarButtonGroup>

      <Box display="flex" alignItems="center">
        <TopToolbarButtonGroup variant="outlined">
          {menuItemsIcons.map((item, index) =>
            renderToolbarButton(item, index, false)
          )}
          {!isDocumentInProgress && (
            <div style={{ marginLeft: 8 }}>
              <Feedback />
            </div>
          )}
        </TopToolbarButtonGroup>

        {isRightPanelCollapsed && (
          <SidebarCollapse
            toggleCollapse={() => toggleCollapseRightPanel(false)}
            isCollapsed={isRightPanelCollapsed}
            direction="right"
            sx={{ ml: 2 }}
          />
        )}
      </Box>
    </>
  );
};

export default memo(ToolBar);
