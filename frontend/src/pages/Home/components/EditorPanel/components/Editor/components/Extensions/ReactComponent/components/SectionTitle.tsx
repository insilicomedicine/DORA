import React, { memo, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useDebounce } from 'hooks/useDebounce';
import {
  applyRefined,
  getDocument,
  updateDocument,
  updateSection
} from 'services/documents';
import classNames from 'classnames';
import {
  convertMarkdownToTiptapJSON,
  convertToEditorDocument
} from 'utils/document';
import {
  findTargetSection,
  getAllSectionsByFields,
  getHtmlTagByType,
  getNodePositionById,
  getSectionContent,
  updateSectionData
} from 'utils/editor';
import { useDocumentStore } from 'contexts/documentsStore';
import DeleteSectionButton from '../../../DeleteSection';
import usePlanStatus from 'hooks/usePlanStatus';

const toggleButtons = [
  { value: 'original', label: 'Original' },
  { value: 'refined', label: 'Refined' }
];

type TitleType = 'sectionTitle' | 'paperTitle';

const SectionTitle = (props) => {
  const {
    editor,
    node: { attrs }
  } = props;
  const { documentData, bibliographyList, setDocumentDetailData } =
    useDocumentStore();

  const { isExpired } = usePlanStatus();
  const { setIsBibliographyChanged, setCompletedDocument, setUpdatedDocument } =
    useDocumentStore();
  const isPolishing = documentData?.stage === 'polishing';
  const isDocumentCompleted = ['completed', 'failed'].includes(
    documentData?.status || ''
  );

  const [contentVersion, setContentVersion] = useState<string>('refined');
  const [isApplied, setIsApplied] = useState<boolean>(
    !attrs.isPolising || !isPolishing
  );
  const [title, setTitle] = useState<string | undefined>(undefined);
  const debounceTitle = useDebounce(title, 800);
  const CustomComponent = attrs.Component;
  const titleType: TitleType = attrs.className?.split(' ')[0] || '';
  const isLimited = isExpired || isPolishing;

  const handleNodeViewElementPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    // Create a text node with the cleaned text
    const textNode = document.createTextNode(text);
    // Insert the text node at the current range
    range.insertNode(textNode);
    // Move the cursor to the end of the inserted text node
    range.setStartAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    //trigger the input event
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    });
    textNode.dispatchEvent(event);
  };

  const handleNodeViewElementInput = (e) => {
    const target = e.target as HTMLElement;
    const newInnerText = target?.innerText?.replace(/\n/g, '') || '';
    setTitle(!newInnerText?.trim() ? '' : newInnerText);
  };

  const updateContent = (type = 'original') => {
    setContentVersion(type);
    const isOriginal = type === 'original';
    let content = getSectionContent(documentData?.content || [], attrs.id);
    if (isOriginal) {
      const targetSection = findTargetSection(
        documentData?.sections || [],
        attrs.id
      );
      const { result: originalResult } = targetSection || {};
      content =
        originalResult?.data_format ||
        convertMarkdownToTiptapJSON(
          originalResult?.data,
          attrs.id,
          bibliographyList
        );
    }

    const section = document.getElementById(attrs.id);
    const sectionStartPos = editor.view.posAtDOM(section, 0);
    let { startPos = 0, endPos = 0 } = getNodePositionById(attrs.id, editor);
    startPos = sectionStartPos || startPos;

    const elements =
      document.querySelectorAll(
        `[data-parent="${attrs.id}"]:not(.titleWrapper)`
      ) || [];

    if (!elements.length) {
      startPos = sectionStartPos;
      endPos = sectionStartPos + 1;
    }

    if (!content.length) {
      editor.commands.deleteRange({ from: startPos, to: endPos });
      return;
    }

    editor.commands.insertContentAt({ from: startPos, to: endPos }, content, {
      updateSelection: false
    });
  };

  const applyResult = async (version?) => {
    setIsBibliographyChanged(false);
    const actionVersion = version || contentVersion;
    const response = await applyRefined(attrs.id, {
      action: actionVersion === 'original' ? 'keep_original' : 'apply_refined'
    });
    if (!response) return;
    setIsApplied(true);

    const updatedDocument = {
      ...documentData,
      sections: updateSectionData(documentData?.sections || [], attrs.id, {
        refined_result: null,
        status: 'completed',
        is_edited: false
      })
    };

    const allMatchedSections = getAllSectionsByFields(
      updatedDocument?.sections,
      {
        refined_result: true,
        status: 'failed'
      }
    );

    const allSectionsPolished = !allMatchedSections.length;

    if (allSectionsPolished) {
      if (!documentData?.id) return;
      const polishedDocument = await getDocument(documentData?.id);
      if (!polishedDocument) return;
      setDocumentDetailData({
        documentData: {
          ...convertToEditorDocument(
            polishedDocument,
            polishedDocument.bibliographies
          ).doc,
          stage: 'polished',
          status: 'completed'
        },
        allSectionsPolished
      });
      setIsBibliographyChanged(true);
    }

    setCompletedDocument({
      ...updatedDocument,
      ...(allSectionsPolished && {
        stage: 'polished',
        status: 'completed'
      })
    });
  };

  useEffect(() => {
    if (!debounceTitle) return;
    const apiMap = {
      paperTitle: updateDocument,
      sectionTitle: updateSection
    };
    const saveTitle = async () => {
      if (!apiMap[titleType]) return;
      const response = await apiMap[titleType](attrs.id, {
        title: debounceTitle
      });
      if (!response) return;
      const isDocumentTitleUpdated = titleType === 'paperTitle';
      setUpdatedDocument({
        ...documentData,
        title:
          (document.querySelector('.paperTitle') as HTMLElement)?.innerText ||
          documentData?.title ||
          '',
        ...(!isDocumentTitleUpdated && {
          sections: updateSectionData(documentData?.sections || [], attrs.id, {
            title: debounceTitle
          })
        })
      });
    };

    saveTitle();
  }, [debounceTitle]);

  const NodeViewElement = getHtmlTagByType(attrs.type);
  const isTitleHidden = attrs.className.includes('hidden');
  const isShowError = !title && title !== undefined && attrs.isRequired;
  const isEnableEdit = titleType === 'sectionTitle';
  const isEnableDelete = !isPolishing && !isShowError && isEnableEdit;

  return (
    <Stack
      direction="row"
      id={attrs.id}
      alignItems="center"
      justifyContent="space-between"
      className="titleWrapper"
      {...(isEnableEdit
        ? {
            ['data-parent']: attrs.id,
            style: { margin: '0 -24px' }
          }
        : {
            style: { padding: 0 }
          })}
    >
      {/* //TODO: this needs to be removed when sections deletion are enabled */}
      {!isTitleHidden && isEnableEdit && (
        <span
          style={{
            position: 'absolute',
            width: 15,
            height: 45,
            opacity: 0,
            marginLeft: -10
          }}
        >
          &nbsp;&nbsp;
        </span>
      )}

      <div
        contentEditable={!attrs.isRequired}
        suppressContentEditableWarning={true}
        style={{
          marginTop: 0,
          flex: 1,
          ...(isEnableEdit && {
            maxWidth: '92%'
          })
        }}
      >
        <>
          {(!isTitleHidden || isPolishing) && (
            <>
              {isShowError && (
                <Alert
                  severity="error"
                  sx={{ mt: 3, mb: 2, maxWidth: 495, userSelect: 'none' }}
                >
                  {attrs.errorMessage}
                </Alert>
              )}
              <NodeViewElement
                className={classNames(attrs.className)}
                {...(attrs.contenteditable && !isLimited
                  ? { contentEditable: 'true' }
                  : {})}
                suppressContentEditableWarning={true}
                onPaste={handleNodeViewElementPaste}
                onInput={handleNodeViewElementInput}
              >
                {attrs.title}
              </NodeViewElement>
            </>
          )}
          {CustomComponent}
          {!isApplied && (
            <>
              <Box
                display="flex"
                mt={3}
                mb={3}
                width="100%"
                sx={{ pointerEvents: 'auto' }}
              >
                <ToggleButtonGroup
                  value={contentVersion}
                  color="primary"
                  exclusive
                  onChange={(_e, value) => {
                    if (!value) return;
                    updateContent(value);
                  }}
                >
                  {toggleButtons.map((button) => (
                    <ToggleButton
                      key={button.value}
                      value={button.value}
                      sx={{
                        width: 'max-content',
                        p: '5px 32px',
                        borderRadius: 2,
                        textTransform: 'capitalize',
                        color: '#21965F',
                        '&.Mui-selected': {
                          borderColor: '#21965F'
                        }
                      }}
                    >
                      {button.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {isDocumentCompleted && (
                  <Button
                    sx={{
                      display:
                        contentVersion === 'refined' && attrs.isPolisingFailed
                          ? 'none'
                          : 'block',
                      minWidth: 117,
                      ml: 'auto',
                      textTransform: 'capitalize'
                    }}
                    color="primary"
                    onClick={async () => {
                      await applyResult();
                    }}
                    data-ga-tracking
                    data-ga-event-location="editor_main"
                  >
                    {contentVersion === 'original'
                      ? 'Keep Original'
                      : 'Apply Refined'}
                  </Button>
                )}
              </Box>
              {attrs.isPolisingFailed && contentVersion === 'refined' && (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setIsApplied(true);
                        updateContent();
                        applyResult('original');
                      }}
                    >
                      refuse, and keep original
                    </Button>
                  }
                >
                  <AlertTitle>Error</AlertTitle>
                  Unexpected error occurred
                </Alert>
              )}
            </>
          )}
        </>
      </div>
      {isEnableDelete && !isTitleHidden && (
        <DeleteSectionButton id={attrs.id} title={attrs.title} />
      )}
    </Stack>
  );
};

export default memo(SectionTitle);
