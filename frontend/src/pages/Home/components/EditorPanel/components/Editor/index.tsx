import React, { useEffect, useState, useRef } from 'react';
import { TextSelection } from 'prosemirror-state';
import { EditorContent, useEditor } from '@tiptap/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import BubbleMenu from './components/BubbleMenu';
import TopToolbar from './components/TopToolbar';
import { updateSection } from 'services/documents';
import classNames from 'classnames';
import Logs from '../Logs';
import {
  findTargetSection,
  getAllSectionsByField,
  getSectionContent,
  getSectionId,
  getSectionIdFromTransaction,
  isSelectionIncludeElementBySelector,
  handleDocumentScroll,
  generateReferenceStyle,
  isSelectionPartOfReferences,
  deleteNodeById,
  clearAIInsertTextAnimationElements
} from 'utils/editor';
import { getEditorExtensions } from './config/editorExtensions';
import { convertToDataString } from 'utils/document';
import { useEditorStore } from 'contexts/editorStore';
import { useDocumentStore } from 'contexts/documentsStore';
import { useScrollingDocumentPageContentStore } from 'contexts/documentsStore';
import usePlanStatus from 'hooks/usePlanStatus';
import { useDebounce } from 'hooks/useDebounce';
import './styles.scss';

const Editor = () => {
  const { documentData, sectionStatusUpdated = false } = useDocumentStore();
  const { isExpired } = usePlanStatus();
  const {
    referenceLinkTarget,
    setReferenceLinkTarget,
    setReloadBibliography,
    isFormatting = false,
    setIsFormatting,
    newBibliographyList,
    setNewBibliographyList
  } = useEditorStore();

  const { deletedSectionsIds = [], clearDeletedSectionsIds } =
    useDocumentStore();

  const {
    isScrollingDocumentPageContent,
    setIsScrollingDocumentPageContent,
    setActiveSectionId
  } = useScrollingDocumentPageContentStore((state) => state);

  const {
    stage,
    estimated_document_generation_minutes: generateTimes = 0,
    template_name: templateName,
    sections: documentDataSections = []
  } = documentData || {};
  //shared states for add citation and add references
  const [targetNode, setTargetNode] = useState<HTMLElement>();
  const [focusPosition, setFocusPosition] = useState<any>({ x: 0, y: 0 });
  //editor states
  const [isEntireDocumentSelected, setIsEntireDocumentSelected] =
    useState<boolean>(false);
  const [enablePolishing, setEnablePolishing] = useState(false);
  const [parentId, setParentId] = useState<string>();
  const [updatedCount, setUpdatedCount] = useState(0);
  const debounceUpdateDocument = useDebounce(updatedCount, 1000);
  const newContentRef = useRef<boolean>(false);
  const editorRedoUndoRef = useRef<boolean>(false);
  const updateSectionAbortControllerRef = useRef<AbortController | undefined>(
    undefined
  );

  // Document states
  const isPolishing = stage === 'polishing';
  const isDocumentDataGenerated = ['completed', 'failed'].includes(
    documentData?.status || ''
  );

  const handleSetActiveSectionId = (id) => {
    setActiveSectionId(id);
  };

  // Select all for Ctrl + A & copy for  Ctrl + C
  const handleSelectAndCopyEvent = (event, editor) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      const docBody = document.body as any;
      if (docBody?.createTextRange) {
        // IE method
        const range = docBody?.createTextRange();
        range.moveToElementText(docBody);
        range.select();
      } else if (window.getSelection) {
        // Modern browsers
        const selection = window.getSelection();
        selection?.removeAllRanges();
        const range = document.createRange();
        const editorContentNode = document.querySelector('#editorContent');
        if (!editorContentNode) return;
        range.selectNodeContents(editorContentNode);
        selection?.addRange(range);
      }
      editor?.commands.selectAll();
      editor?.commands.focus();
      setIsEntireDocumentSelected(true);
    }
  };

  const clearEditorStates = () => {
    const element = document.querySelector(
      '[contenteditable="false"].references'
    );
    if (element) {
      element.removeAttribute('contenteditable');
    }
    //clear selected text
    editor?.commands.setTextSelection(0);
    setIsEntireDocumentSelected(false);
    // clear selected reference link id
    setReferenceLinkTarget({
      id: undefined
    });
  };

  const handleSaveContent = async (id: string) => {
    if (!id) return;
    const editorData = editor?.getJSON();
    const { content = [] } = editorData || {};

    // when the node type changes, the data-parent attribute maybe lost, eg. when changing a paragraph to a heading
    content.forEach((item) => {
      if (item.type !== 'reactComponent' && !item?.attrs?.['data-parent']) {
        item.attrs = {
          ...(item?.attrs || {}),
          ['data-parent']: id
        };
      }
    });
    const sectionContent = getSectionContent(content, id);
    const targetSection = findTargetSection(documentDataSections, id);

    const params = {
      is_edited: newContentRef.current || targetSection?.is_edited,
      result: {
        data: convertToDataString(sectionContent),
        data_format: sectionContent
      }
    };
    updateSectionAbortControllerRef.current = new AbortController();
    const res = await updateSection(id, params, {
      signal: updateSectionAbortControllerRef.current?.signal
    });
    const hasNewBibliography = Number(newBibliographyList?.length) > 0;
    if (res !== 'abort' && !hasNewBibliography) {
      setReloadBibliography(false);
    }
    setEnablePolishing(params.is_edited);
    setNewBibliographyList([]);
  };

  //Save all sections when the entire document is selected
  const handleSaveDocument = async () => {
    const sectionIdsToSave: string[] = [];

    // Single iteration to collect all section IDs that need to be saved
    documentDataSections.forEach((section) => {
      if (section.sub_sections?.length) {
        // Add sub-sections first (they need to be saved before parent sections)
        section.sub_sections.forEach((subSection) => {
          sectionIdsToSave.push(subSection.id);
        });
      } else {
        // Add main sections without sub-sections
        sectionIdsToSave.push(section.id);
      }
    });

    // Save all sections sequentially to maintain order and avoid overwhelming the server
    for (const sectionId of sectionIdsToSave) {
      await handleSaveContent(sectionId);
    }
  };

  // Debounce the update document function to avoid multiple calls
  useEffect(() => {
    if (!debounceUpdateDocument || !parentId) return;
    clearAIInsertTextAnimationElements();
    handleSaveContent(parentId);
  }, [debounceUpdateDocument, parentId]);

  const extensions = getEditorExtensions();
  const editor = useEditor(
    {
      extensions,
      editable: documentData?.status === 'completed' && !isExpired,
      content: documentData,
      editorProps: {
        attributes: {
          class: 'editor'
        },
        handleKeyDown(view, event) {
          // Handle Enter key event
          if (event.key === 'Enter') {
            newContentRef.current = true;
            return;
          }
          // Select all for Ctrl/Cmd + A & copy for  Ctrl/Cmd + C
          handleSelectAndCopyEvent(event, editor);

          /* Handle delete and backspace key events */
          const { key, ctrlKey, metaKey } = event;

          // Disable paste, cut, and delete when selection contains titles or part of references
          const isRestrictedAction =
            ((ctrlKey || metaKey) && ['v', 'x'].includes(key)) ||
            ['Backspace', 'Delete'].includes(key);

          if (isRestrictedAction) {
            if (
              isSelectionIncludeElementBySelector('title') ||
              isSelectionPartOfReferences()
            ) {
              event.preventDefault();
              editor?.commands.setTextSelection(0);
              return;
            }
          }

          if (key === 'Backspace' || key === 'Delete') {
            // NOTICE: disable first paragraph deletion (can be removed once section title deletion is enabled)
            // Disable the first element deletion
            if (key === 'Backspace') {
              const { state } = view;
              const { selection, doc } = state;
              const { from, empty } = selection;
              const resolvedPos = doc.resolve(from);
              const nodeBefore = resolvedPos.nodeBefore;
              const parentId = doc.nodeAt(from - 1)?.attrs['data-parent'];
              const elements =
                document.querySelectorAll(`[data-parent="${parentId}"]`) || [];
              const startPos = view.posAtDOM(elements[1], 0);
              //Get the content of focused node
              const content = doc.textBetween(from, from + 1, '\n');
              //Check if the focused node in bullet list or ordered list
              const isInsideRestrictedElement =
                elements[1]?.parentNode?.nodeName.match(/^(BLOCKQUOTE|LI)$/);
              if (
                empty &&
                !!content &&
                !isInsideRestrictedElement &&
                !nodeBefore &&
                startPos === from
              ) {
                event.preventDefault();
                return true;
              }
            }

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            let startContainer: any = range.startContainer;
            let aTag: any = null;
            // Check if the startContainer is within an <a> tag
            while (startContainer) {
              if (startContainer.nodeName === 'A') {
                aTag = startContainer;
                break;
              }
              startContainer = startContainer.parentNode;
            }
            if (aTag) {
              event.preventDefault();
              // Remove the <a> tag if the user presses the backspace or delete key
              aTag.parentNode.removeChild(aTag);
            }

            //detect cursor focus position is table and delete the table
            newContentRef.current = true;
          }

          // Handle arrow left/right navigation around reference links
          if (key === 'ArrowRight' || key === 'ArrowLeft') {
            if (!editor) return false;

            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // Look at the element at or just before the cursor position
            const lookOffset = key === 'ArrowRight' ? 0 : -1;
            const domPos = view.coordsAtPos($from.pos + lookOffset);
            const elem = document.elementFromPoint(domPos.left, domPos.top);
            const parentNode = elem?.parentNode as HTMLElement;

            if (
              parentNode?.nodeName === 'A' &&
              parentNode?.classList.contains('references')
            ) {
              const linkText = parentNode.textContent;
              // For right arrow, move after the link; for left arrow, move before it
              const pos =
                key === 'ArrowRight'
                  ? $from.pos + (linkText?.length || 0)
                  : $from.pos - (linkText?.length || 0);

              // Create a new transaction with TextSelection
              const tr = view.state.tr.setSelection(
                TextSelection.create(view.state.doc, pos)
              );

              view.dispatch(tr);
              view.focus();

              return true;
            }
            return false;
          }
        },
        handleDOMEvents: {
          mouseover: (_view, event) => {
            const target = event.target as HTMLElement;
            const parentId = getSectionId(target);
            if (!parentId) return false;
            // Show only the delete icon for the current section
            const currentSectionDeleteIcon = document.querySelector(
              `[data-parent="${parentId}"] .deleteSectionIcon`
            ) as HTMLElement;
            if (currentSectionDeleteIcon) {
              currentSectionDeleteIcon.style.display = 'block';
            }
          },
          mouseout: (_view) => {
            // Hide delete icons when moving out
            const deleteIcons = document.querySelectorAll('.deleteSectionIcon');
            deleteIcons.forEach((icon) => {
              (icon as HTMLElement).style.display = 'none';
            });
          },
          mousedown(_view, event) {
            //disable double click selection
            if (event.detail > 1) {
              event.preventDefault();
            }
            clearEditorStates();
            //set position for bubble menu
            const target = event.target as HTMLElement;
            setTargetNode(target);
            setFocusPosition({
              x: event.clientX,
              y: event.clientY
            });
          }
        }
      },
      onPaste: (_view) => {
        newContentRef.current = true;
      },
      onUpdate: (e) => {
        // Skip if this transaction is marked to prevent update
        if (e.transaction.getMeta('preventUpdate')) return;
        if (deletedSectionsIds.length) return;
        editorRedoUndoRef.current = !!e.transaction.getMeta('history$');
        if (isEntireDocumentSelected) {
          handleSaveDocument();
          return;
        }
        const parentId =
          targetNode?.getAttribute('data-parent') ||
          (e.transaction && getSectionIdFromTransaction(e.transaction)) ||
          getSectionId(targetNode);

        if (!parentId || isPolishing) return;
        updateSectionAbortControllerRef.current?.abort();
        setParentId(parentId);
        setUpdatedCount(updatedCount + 1);
        setIsFormatting(false);
      }
    },
    [
      documentData?.status,
      documentData?.stage,
      documentData?.id,
      sectionStatusUpdated
    ]
  );

  useEffect(() => {
    if (!deletedSectionsIds.length || !editor) return;
    deletedSectionsIds.forEach((id) => {
      deleteNodeById(id, editor);
    });
    clearDeletedSectionsIds();
  }, [deletedSectionsIds]);

  useEffect(() => {
    if (documentData?.status !== 'completed' || isPolishing) return;
    const editorContentContainer = document.getElementById(
      'editorContentContainer'
    );
    if (!editorContentContainer) return;

    // Create AbortController for cleanup
    const controller = new AbortController();
    const { signal } = controller;

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          setTargetNode(undefined);
          return;
        }
      },
      { signal }
    );
    const editorContent = document.getElementById('editorContent');
    if (editorContent) {
      editorContent.addEventListener(
        'keydown',
        (event) => handleSelectAndCopyEvent(event, editor),
        { signal }
      );
    }
    editorContentContainer.addEventListener(
      'dragstart',
      (e) => {
        e.preventDefault();
      },
      { signal }
    );

    return () => {
      // Cleanup by aborting all event listeners
      controller.abort();
    };
  }, [documentData?.status, documentData?.id]);

  useEffect(() => {
    if (documentData?.status !== 'completed' || isPolishing) return;
    const editorContentContainer = document.getElementById(
      'editorContentContainer'
    );
    if (!editorContentContainer) return;

    // Detect changes in the editor content
    const callback = (mutationsList: MutationRecord[]) => {
      const allNodes: Node[] = [];
      Array.from(mutationsList).forEach((mutation) => {
        let nodes = Array.from(mutation.removedNodes);
        if (editorRedoUndoRef.current && mutation.addedNodes.length) {
          nodes = [...nodes, ...Array.from(mutation.addedNodes)];
        }
        allNodes.push(...nodes);
      });

      //Detect when a new citation is removed reload bibliography
      const hasCitation = allNodes.some((node: any) =>
        node.classList?.contains('citation-placeholder')
      );

      const hasRefLinks = allNodes.some(
        (node: any) =>
          node.nodeName === 'A' &&
          node.classList.contains('references') &&
          !newBibliographyList?.map((item) => item.id)?.includes(node.id)
      );

      const hasReferenceLinks = !hasCitation && hasRefLinks;
      if (hasReferenceLinks && !isFormatting) {
        setReloadBibliography(true);
      }
    };

    // Create a MutationObserver instance linked to the callback function
    const observer = new MutationObserver(callback);
    const config = { childList: true, subtree: true };
    observer.observe(editorContentContainer, config);

    return () => {
      // Cleanup function to disconnect the observer when component unmounts
      observer.disconnect();
    };
  }, [
    documentData?.status,
    documentData?.id,
    isFormatting,
    newBibliographyList
  ]);

  useEffect(() => {
    if (!documentDataSections?.length || documentData?.status !== 'completed')
      return;
    const hasEditedSections = !!getAllSectionsByField(
      documentDataSections,
      'is_edited'
    ).length;
    setEnablePolishing(hasEditedSections);
  }, [documentDataSections?.length]);

  useEffect(() => {
    if (!isScrollingDocumentPageContent) {
      return;
    }
    const unlockScrollTimeout = setTimeout(() => {
      setIsScrollingDocumentPageContent(false);
    }, 1000);
    return () => {
      clearTimeout(unlockScrollTimeout);
    };
  }, [isScrollingDocumentPageContent]);

  if (documentData?.status === 'in_progress' && !isPolishing) {
    return <Logs />;
  }

  if (!editor) {
    return <></>;
  }

  return (
    <Stack sx={{ height: '100%' }}>
      <TopToolbar
        editor={editor}
        targetNode={targetNode}
        enablePolishing={enablePolishing}
        setEnablePolishing={setEnablePolishing}
        focusPosition={focusPosition}
        setFocusPosition={setFocusPosition}
      />
      {!(isDocumentDataGenerated || isPolishing) && !!generateTimes && (
        <Alert
          severity="info"
          color="info"
          sx={{
            m: '0 8px',
            alignItems: 'center',
            borderRadius: 2,
            color: '#767676'
          }}
        >
          Generating the
          <span style={{ fontWeight: 700 }}> {templateName} </span>
          may take more than {generateTimes} minutes, and we will email you when
          it is complete. You can close the window without losing your progress.
        </Alert>
      )}
      <BubbleMenu
        editor={editor}
        targetNode={targetNode}
        isEntireDocumentSelected={isEntireDocumentSelected}
        setFocusPosition={setFocusPosition}
        handleTextContentChanged={() => {
          newContentRef.current = true;
        }}
      />
      <Box
        className={classNames(
          'editorContentContainer',
          (!isDocumentDataGenerated || isPolishing) && 'disabled'
        )}
        onScroll={(e) =>
          handleDocumentScroll(
            e,
            isScrollingDocumentPageContent,
            documentDataSections,
            handleSetActiveSectionId
          )
        }
        id="editorContentContainer"
        sx={{ ...generateReferenceStyle(referenceLinkTarget) }}
      >
        <EditorContent
          editor={editor}
          className="editorContent"
          id="editorContent"
        />
      </Box>
    </Stack>
  );
};

export default Editor;
