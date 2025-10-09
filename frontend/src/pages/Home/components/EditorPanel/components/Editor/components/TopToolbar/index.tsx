import React, { memo, useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { getDocument, polish } from 'services/documents';
import { convertToEditorDocument } from 'utils/document';
import {
  getAllSectionsByField,
  getAllSectionsByFields,
  scrollToSection
} from 'utils/editor';
import LogsDialog from '../LogsDialog';
import AddCitation from '../AddCitation';
import IsPolishingHasFailedSectionCase from './components/IsPolishingAndHasFailedSectionCase';
import IsDocumentCompletedCase from './components/IsDocumentCompletedCase';
import ExportMenu from './components/ExportMenu';
import ToolBar from './components/ToolBar';
import { ClickAwayListener } from '@mui/material';
import AllSectionsPolishedAlert from './components/AllSectionsPolishedAlert';
import { useDocumentStore } from 'contexts/documentsStore';

interface TopToolbarProps {
  editor: any;
  targetNode?: any;
  focusPosition: any;
  isTextContentChanged?: boolean;
  enablePolishing?: boolean;
  setEnablePolishing: (arg: boolean) => void;
  setFocusPosition?: (arg: any) => void;
}

const TopToolbar = (props: TopToolbarProps) => {
  const {
    editor,
    enablePolishing = false,
    setEnablePolishing = () => {}
  } = props;
  const {
    documentData,
    bibliographyList,
    allSectionsPolished,
    setDocumentDetailData,
    setUpdatedDocument
  } = useDocumentStore();

  const isPolishing = documentData?.stage === 'polishing';
  const isDocumentInProgress = documentData?.status === 'in_progress';
  const isDocumentCompleted = ['completed', 'failed'].includes(
    documentData?.status || ''
  );

  const [showAddCitationPopup, setShowAddCitationPopup] =
    useState<boolean>(false);

  const [isShowLogsDialogOpen, setIsShowLogsDialogOpen] = useState(false);
  const [allSectionsPolishedAlert, setAllSectionsPolishedAlert] =
    useState(false);
  const [autoShowTooltip, setAutoShowTooltip] = useState(false);

  const handlePolish = async () => {
    if (!documentData?.id) return;
    const reponse = await polish(documentData?.id);
    if (!reponse) return;
    const newDocumnet = await getDocument(documentData?.id);
    if (!newDocumnet) return;

    setDocumentDetailData({
      documentData: convertToEditorDocument(newDocumnet, bibliographyList).doc
    });
    //Update the document state in the document list
    setUpdatedDocument(newDocumnet);
  };

  const [anchorElExportMenu, setAnchorElExportMenu] =
    useState<null | HTMLElement>(null);
  const handleClickExportMenu = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorElExportMenu(event.currentTarget);
  };

  const handleScrollToSection = (type = 'down') => {
    const allMatchedSections = getAllSectionsByFields(
      documentData?.sections || [],
      {
        refined_result: true,
        status: 'failed'
      }
    );

    const MAX_TARGET_NODE_POS = 300;

    let nextIndex =
      type === 'down'
        ? allMatchedSections.findIndex((section) => {
            const targetNode = document.getElementById(section.id);
            const targetNodePos = targetNode?.getBoundingClientRect().top || 0;
            return targetNodePos > MAX_TARGET_NODE_POS;
          })
        : allMatchedSections.findLastIndex((section) => {
            const targetNode = document.getElementById(section.id);
            const targetNodePos = targetNode?.getBoundingClientRect().top || 0;
            return targetNodePos < 0;
          });
    nextIndex =
      nextIndex > allMatchedSections.length - 1 || nextIndex < 0
        ? 0
        : nextIndex;
    const nextSection = allMatchedSections[nextIndex];
    if (!nextSection?.id) return;
    scrollToSection(null, nextSection.id);
  };

  useEffect(() => {
    if (!allSectionsPolished) return;
    setAllSectionsPolishedAlert(true);
    setEnablePolishing(false);
    const timeout = setTimeout(() => {
      setAllSectionsPolishedAlert(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [allSectionsPolished]);

  useEffect(() => {
    setAutoShowTooltip(enablePolishing);
  }, [enablePolishing]);

  const hasFailedSection = !!getAllSectionsByField(
    documentData?.sections || [],
    'status',
    'failed'
  ).length;

  const enableAddCitation = Object.values(props.focusPosition).every(Boolean);

  useEffect(() => {
    if (!enableAddCitation) {
      setShowAddCitationPopup(false);
    }
  }, [enableAddCitation]);

  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#fff',
        overflow: 'hidden',
        borderBottom: '1px solid #EEEEEE'
      }}
    >
      {isPolishing && isDocumentInProgress ? (
        <Typography
          color="#666"
          fontWeight={500}
          p="16px 20px"
          textTransform="capitalize"
        >
          polishing...
        </Typography>
      ) : (
        <>
          {isPolishing ? (
            <Stack
              direction="row"
              alignItems="center"
              width="100%"
              top={0}
              left={0}
              mx={1}
              my={0.5}
            >
              {hasFailedSection ? (
                <IsPolishingHasFailedSectionCase
                  handlePolish={handlePolish}
                  handleScrollToSection={handleScrollToSection}
                />
              ) : (
                <>
                  {isDocumentCompleted && !allSectionsPolished && (
                    <IsDocumentCompletedCase
                      handleScrollToSection={handleScrollToSection}
                    />
                  )}
                </>
              )}
            </Stack>
          ) : (
            <>
              {allSectionsPolishedAlert ? (
                <AllSectionsPolishedAlert />
              ) : (
                <ClickAwayListener
                  onClickAway={() => {
                    setAutoShowTooltip(false);
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    mx={3}
                    py={1.5}
                  >
                    <ToolBar
                      editor={editor}
                      enablePolishing={enablePolishing}
                      autoShowTooltip={autoShowTooltip}
                      setAutoShowTooltip={setAutoShowTooltip}
                      isDocumentInProgress={isDocumentInProgress}
                      setIsShowLogsDialogOpen={setIsShowLogsDialogOpen}
                      enableAddCitation={enableAddCitation}
                      isPolishing={isPolishing}
                      handlePolish={handlePolish}
                      setShowAddCitationPopup={setShowAddCitationPopup}
                      handleClickExportMenu={handleClickExportMenu}
                    />
                  </Stack>
                </ClickAwayListener>
              )}
            </>
          )}
        </>
      )}

      <ExportMenu
        anchorElExportMenu={anchorElExportMenu}
        setAnchorElExportMenu={setAnchorElExportMenu}
        paperId={documentData?.id}
        paperTitle={documentData?.title}
      />
      <LogsDialog
        open={isShowLogsDialogOpen}
        handleClose={() => setIsShowLogsDialogOpen(false)}
      />
      {enableAddCitation && (
        <AddCitation
          editor={editor}
          targetNode={props.targetNode}
          focusPosition={props.focusPosition}
          setFocusPosition={props.setFocusPosition}
          showAddCitationPopup={showAddCitationPopup}
          handleCloseAddCitationPopup={() => setShowAddCitationPopup(false)}
        />
      )}
    </Stack>
  );
};

export default memo(TopToolbar);
