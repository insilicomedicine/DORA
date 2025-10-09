import React, { useState, useRef, useEffect, memo } from 'react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ContentCopyRounded,
  AutoAwesomeRounded,
  Sync,
  RestartAlt,
  ArrowBack
} from '@mui/icons-material';
import {
  formatHtmlToTextWithPlaceholder,
  formatSentencesToPmidsAndChunkIds,
  getBubbleMenuTooltipText,
  getEditorSelectionHtml,
  getSelectionMetadata,
  isEnableBubbleMenu,
  isSelectionIncludeElementBySelector,
  createAIInsertTextAnimation,
  removeAIInsertTextAnimation,
  getSectionId
} from 'utils/editor';
import { replaceRulesWithLink } from 'utils/document';
import { ReferenceListRef } from '../ReferenceList';
import { sendGA4Event } from 'utils/ga';
import TextEditButtonGroups from '../TextMarkingButtonGroups';
import { aiActions } from 'services/documents';
import { StyledPromptTitle } from './StyledComponent';
import usePlanStatus from 'hooks/usePlanStatus';
import classNames from 'classnames';
import AskAIIcon from 'assets/icons/bubleMenuIcons/askAI.svg?react';
import { useEditorStore } from 'contexts/editorStore';
import { useDocumentStore } from 'contexts/documentsStore';
import {
  CitationSearchResults,
  TabProvider,
  TabState
} from '../ReferenceList/components';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';

type ActionType =
  | 'make_shorter'
  | 'make_longer'
  | 'find_references'
  | 'ask_ai'
  | 'custom_prompt';

type InsertMode = 'replace' | 'before' | 'after';

interface BubbleMenuActionsData {
  isLoading?: boolean;
  title?: string;
  type?: ActionType;
  content?: string;
  loadingText?: string;
  enableEditing?: boolean;
  hiddeMenu?: boolean;
  insertMode?: InsertMode;
}

interface BubbleMenuProps {
  editor?: any;
  targetNode?: HTMLElement;
  isEntireDocumentSelected?: boolean;
  setFocusPosition: (_position: any) => void;
  handleTextContentChanged?: () => void;
}

const BubbleMenu = ({
  editor,
  targetNode,
  isEntireDocumentSelected = false,
  setFocusPosition = () => {},
  handleTextContentChanged = () => {}
}: BubbleMenuProps) => {
  const { setActivePopper } = useEditorStore();
  const { systemInfo } = useSystemStore();
  const { documentData, bibliographyList = [] } = useDocumentStore();
  const { limitType = '', isExpired, limitInfos = {} } = usePlanStatus();
  const [bubbleMenuActionsData, setBubbleMenuActionsData] =
    useState<BubbleMenuActionsData>({});
  const [queryTexts, setQueryTexts] = useState('');
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const aiImprovementInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const referenceListRef = useRef<ReferenceListRef>(null);
  const isTextIncludesTitle = isSelectionIncludeElementBySelector('title');

  const titleActionIcons = [
    {
      icon: <RestartAlt fontSize="xsmall" />,
      tooltip: 'Retry',
      onClick: (e) => {
        e.stopPropagation();
        handleRetryAction();
        sendGA4Event('ai_action_retry', {
          action_type: bubbleMenuActionsData.type
        });
      }
    },
    {
      icon: (
        <ContentCopyRounded
          htmlColor="#757575"
          cursor="pointer"
          fontSize="xsmall"
        />
      ),
      tooltip: isCopied ? 'Copied!' : 'Copy result',
      onClick: (e) => {
        e.stopPropagation();
        handleCopyText(bubbleMenuActionsData?.content);
        sendGA4Event('ai_action', {
          action_type: 'ai_action_copy'
        });
      },
      tooltipProps: {
        onMouseLeave: (e) => {
          e.stopPropagation();
          setIsCopied(false);
        }
      }
    }
  ];

  const getSelectionText = () => {
    return window.getSelection()?.toString() || '';
  };

  const handleCloseBubbleMenu = () => {
    setQueryTexts('');
    setBubbleMenuActionsData({});
    setIsAskAIOpen(false);
    editor.commands.unsetHighlight();
    abortControllerRef.current?.abort();
    referenceListRef.current?.abortSearch?.();
  };

  const handleCopyText = (text: string = '') => {
    //keep new line when copying
    const contentHtml = text
      .split('\n\n')
      .map((item) => item && `<p>${item}</p>`)
      .join('');
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([contentHtml], { type: 'text/plain' }),
        'text/html': new Blob([contentHtml], { type: 'text/html' })
      })
    ]);
    setIsCopied(true);
  };

  const handleInsertText = (mode: InsertMode) => {
    const { state } = editor || {};
    const { content = '' } = bubbleMenuActionsData || {};
    const { from = 0, to = 0 } = state?.selection || {};

    //Create animation for the inserted text
    createAIInsertTextAnimation();

    // Get the data-parent attribute from the current selection
    let parentId = targetNode?.getAttribute('data-parent') || '';

    if (!parentId) {
      //Fallback to get the parent id from the next sibling
      parentId =
        getSectionId(targetNode) ||
        targetNode?.nextElementSibling?.getAttribute('data-parent') ||
        '';
    }

    // Split content by double newlines
    const contentParts = content.split('\n\n');

    // Format the first item as a span and the rest as paragraphs
    const contentHtml = contentParts
      .map((item, index) => {
        if (!item) return '';

        // Add animation class to anchor tags while preserving existing classes
        const itemWithAnimatedLinks = item
          .replace(
            /<a([^>]*?)class=(['"])(.*?)(['"])/g,
            '<a$1class=$2$3 bgFadeOutAnimation$4'
          )
          .replace(/<a(?![^>]*?class=)/g, '<a class="bgFadeOutAnimation"');

        if (index === 0) {
          return `<span class='bgFadeOutAnimation' data-parent='${parentId}'>${itemWithAnimatedLinks}</span>`;
        } else {
          return `<p class='bgFadeOutAnimation' data-parent='${parentId}'>${itemWithAnimatedLinks}</p>`;
        }
      })
      .join('');

    if (mode === 'replace') {
      // Replace selected text
      editor?.commands.insertContentAt({ from: from - 1, to }, contentHtml);
    } else if (mode === 'before') {
      // Insert before the selected text
      editor?.commands.insertContentAt({ from }, contentHtml);
    } else if (mode === 'after') {
      // Insert below the selected text
      editor?.commands.insertContentAt({ from: to }, contentHtml);
    }

    editor?.commands.blur();
    editor?.commands.setTextSelection(0);
    handleTextContentChanged();
    handleCloseBubbleMenu();
    //Remove the animation class from the inserted text
    removeAIInsertTextAnimation();
  };

  //retry ai action
  const handleRetryAction = () => {
    const { type } = bubbleMenuActionsData;
    setBubbleMenuActionsData((prev) => ({
      ...prev,
      isLoading: true
    }));
    handleAIAction(type);
  };

  const handleAIAction = async (type) => {
    const targetSection = document.getElementById(
      targetNode?.getAttribute('data-parent')!
    );
    const startPos = editor.view.posAtDOM(targetSection, 0);
    const formattedContentWithPlaceholder = formatHtmlToTextWithPlaceholder(
      getEditorSelectionHtml(editor),
      [...(documentData?.bibliographies || []), ...bibliographyList]
    );
    const targetNodeFormattedContent = formatSentencesToPmidsAndChunkIds(
      editor,
      formattedContentWithPlaceholder,
      startPos
    );
    const { queryText: text = '', queryTextContext: text_context = '' } =
      targetNodeFormattedContent;

    const metadata = getSelectionMetadata(text_context, [
      ...(documentData?.bibliographies || []),
      ...bibliographyList
    ]);

    const { title } = bubbleMenuActionsData;

    if (!documentData?.id) return;

    const params = {
      document_id: documentData.id,
      action_type: type,
      text,
      text_context,
      metadata,
      ...(type === 'custom_prompt' && { custom_prompt: queryTexts || title })
    };

    //abort previous request
    if (abortControllerRef?.current) {
      abortControllerRef?.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await aiActions(params, abortControllerRef?.current);

    if (!response) return;

    setBubbleMenuActionsData((prev) => ({
      ...prev,
      isLoading: false,
      type,
      content: replaceRulesWithLink({
        htmlString: response,
        bibliographyList: [
          ...(documentData?.bibliographies || []),
          ...bibliographyList
        ]
      })
    }));
    setQueryTexts('');
  };

  const handleCustomPrompt = (e) => {
    e.preventDefault();
    setBubbleMenuActionsData({
      isLoading: true,
      title: queryTexts,
      loadingText: 'Improving',
      enableEditing: true
    });
    handleAIAction('custom_prompt');
  };

  const handleMenuItemClick = (event, item) => {
    event.stopPropagation();
    const {
      title,
      type,
      loadingText,
      onClick = () => {},
      hiddeMenu
    } = item || {};

    //detect if it is a safari browser
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    isSafari && editor?.commands.setHighlight();
    setBubbleMenuActionsData({
      isLoading: true,
      title,
      type,
      loadingText,
      hiddeMenu
    });
    onClick(type);
  };

  const bubbleButtons: Record<string, any>[] = [
    {
      icon: null,
      text: 'Summarize',
      title: 'Summarized version',
      type: 'make_shorter',
      loadingText: 'Summarizing',
      disabled: isTextIncludesTitle || isExpired,
      onClick: handleAIAction,
      ...(isTextIncludesTitle && {
        tooltipText: getBubbleMenuTooltipText('isTextIncludesTitle')
      })
    },
    {
      icon: null,
      text: 'Extend',
      title: 'Extended version',
      type: 'make_longer',
      loadingText: 'Extending',
      disabled: isTextIncludesTitle || isExpired,
      onClick: handleAIAction,
      ...(isTextIncludesTitle && {
        tooltipText: getBubbleMenuTooltipText('isTextIncludesTitle')
      })
    },
    {
      icon: null,
      text: 'Find references',
      type: 'find_references',
      loadingText: 'Getting references',
      disabled: isExpired || getSelectionText()?.length > 1000,
      hiddeMenu: !bubbleMenuActionsData.isLoading,
      ...((getSelectionText()?.length > 1000 || isEntireDocumentSelected) && {
        tooltipText: getBubbleMenuTooltipText('isTextTooLong')
      }),
      sx: {
        ...(!getSystemConfig(systemInfo, ['pmc', 'pubmed', 'websearch']) && {
          display: 'none'
        })
      }
    },
    {
      icon: null,
      text: 'Ask AI',
      type: 'ask_ai',
      loadingText: 'Asking AI',
      disabled: isExpired,
      hiddeMenu: !bubbleMenuActionsData.isLoading,
      tooltipText: '',
      onDefaultClick: () => setIsAskAIOpen(true)
    }
  ];

  const AIActionButtons: {
    text: string;
    icon: React.ReactNode;
    mode: InsertMode;
    dataGaEventInsertMode: string;
  }[] = [
    {
      text: 'Replace Selection',
      icon: <Sync fontSize="xsmall" />,
      mode: 'replace',
      dataGaEventInsertMode: 'replace'
    },
    {
      text: 'Insert After',
      icon: (
        <ArrowBack fontSize="xsmall" sx={{ transform: 'rotate(180deg)' }} />
      ),
      mode: 'after',
      dataGaEventInsertMode: 'after'
    },
    {
      text: 'Insert Before',
      icon: <ArrowBack fontSize="xsmall" />,
      mode: 'before',
      dataGaEventInsertMode: 'before'
    }
  ];

  useEffect(() => {
    if (bubbleMenuActionsData?.type !== 'find_references') return;
    if (referenceListRef.current) {
      referenceListRef.current?.abortSearch?.();
      referenceListRef.current?.findReferences(true);
    }
  }, [bubbleMenuActionsData.type]);

  useEffect(() => {
    if (!targetNode) {
      editor.commands.blur();
      editor.commands.setTextSelection(0);
      handleCloseBubbleMenu();
    }
  }, [targetNode]);

  return (
    <>
      <TiptapBubbleMenu
        className={classNames(
          'bubbleMenu',
          isEntireDocumentSelected && 'fixed'
        )}
        tippyOptions={{
          placement: 'bottom',
          duration: 100,
          maxWidth: 648,
          zIndex: 1,
          popperOptions: {
            modifiers: [
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['bottom', 'top']
                }
              },
              {
                name: 'preventOverflow',
                options: {
                  tether: false
                }
              }
            ]
          },
          onShow: () => {
            setActivePopper(null);
          },
          onClickOutside: () => {
            setFocusPosition({ x: 0, y: 0 });
            editor?.commands.setTextSelection(0);
            editor.commands.unsetHighlight();
          },
          onHidden: handleCloseBubbleMenu
        }}
        editor={editor}
        shouldShow={({ editor }) => {
          return isEnableBubbleMenu(editor);
        }}
      >
        {bubbleMenuActionsData.type === 'find_references' && (
          <TabProvider
            render={(tabState: TabState) => (
              <CitationSearchResults
                referenceListRef={referenceListRef}
                editor={editor}
                targetNode={targetNode}
                tabState={tabState}
                dataLoadedCallback={() => {
                  setBubbleMenuActionsData((prev) => ({
                    ...prev,
                    isLoading: false
                  }));
                }}
                handleClose={handleCloseBubbleMenu}
                enableTitle={!bubbleMenuActionsData.isLoading}
                isHidden={bubbleMenuActionsData.isLoading}
              />
            )}
          />
        )}
        {bubbleMenuActionsData.isLoading ? (
          <Stack
            sx={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 1,
              p: '2px 10px',
              minWidth: 483,
              width: '100%'
            }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2">
              {bubbleMenuActionsData.loadingText}...
            </Typography>
          </Stack>
        ) : (
          <>
            {bubbleMenuActionsData.content && (
              <Box maxWidth="100%" minWidth="82%">
                <Box
                  p="4px 12px 8px 12px"
                  bgcolor="#FAFAFA"
                  borderRadius="10px"
                >
                  <Typography
                    color="text.secondary"
                    variant="h6"
                    fontSize={12}
                    my={0.5}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Tooltip
                      title={bubbleMenuActionsData.enableEditing ? 'Edit' : ''}
                      placement="top"
                    >
                      <StyledPromptTitle
                        enableEditing={bubbleMenuActionsData.enableEditing}
                        onClick={(e) => {
                          if (!bubbleMenuActionsData.enableEditing) return;
                          e.stopPropagation();
                          setQueryTexts(bubbleMenuActionsData?.title || '');
                          aiImprovementInputRef?.current?.focus();
                        }}
                      >
                        {bubbleMenuActionsData?.title}
                      </StyledPromptTitle>
                    </Tooltip>
                    <Stack sx={{ flexDirection: 'row', gap: 1 }}>
                      {titleActionIcons.map((item, index) => (
                        <Tooltip
                          placement="top"
                          key={index}
                          title={item.tooltip}
                          slotProps={{
                            popper: {
                              style: { zIndex: 999999 }
                            }
                          }}
                          {...item.tooltipProps}
                        >
                          <IconButton
                            sx={{
                              p: 0.25,
                              '&:hover': {
                                backgroundColor: '#E6E6E6'
                              }
                            }}
                            onClick={item.onClick}
                          >
                            {item.icon}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Stack>
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="Roboto Slab"
                    lineHeight={1.8}
                    maxHeight={200}
                    overflow="auto"
                    pb={1}
                    sx={{
                      whiteSpace: 'pre-wrap',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#BDBDBD #f8f8f8',
                      scrollbarGutter: 'stable'
                    }}
                    marginRight="-14px"
                    dangerouslySetInnerHTML={{
                      __html: bubbleMenuActionsData?.content
                    }}
                  />
                </Box>
                <Stack
                  sx={{
                    flexDirection: 'row',
                    pt: 0.5,
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}
                >
                  {AIActionButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant="text"
                      color="primary"
                      sx={{
                        height: 30,
                        textTransform: 'none'
                      }}
                      endIcon={button.icon}
                      onClick={() => handleInsertText(button.mode)}
                      data-ga-event="ai_action_apply"
                    >
                      {button.text}
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}
            {!bubbleMenuActionsData.hiddeMenu && (
              <>
                {isAskAIOpen ? (
                  <Stack
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      ...(bubbleMenuActionsData?.content && {
                        borderRadius: 2,
                        border: '1px solid #BDBDBD',
                        padding: '0 5px'
                      })
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <TextField
                        inputRef={aiImprovementInputRef}
                        multiline
                        placeholder="Ask AI to improve..."
                        value={queryTexts}
                        maxRows={6}
                        disabled={isExpired}
                        onChange={(e) => setQueryTexts(e.target?.value)}
                        onFocus={(e) => {
                          e.stopPropagation();
                          editor?.commands.setHighlight();
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            !e.shiftKey &&
                            !!queryTexts.trim()
                          ) {
                            handleCustomPrompt(e);
                            // Send GA event for shortcut key
                            sendGA4Event('ai_action', {
                              action_type: 'improve'
                            });
                          }
                        }}
                        slotProps={{
                          input: {
                            sx: {
                              borderRadius: 2,
                              py: 1,
                              textarea: {
                                pr: 4.5,
                                pl: 1,
                                mr: -1.5,
                                lineHeight: 1.5,
                                scrollbarGutter: 'stable',
                                overflowY: 'auto'
                              }
                            },
                            startAdornment: (
                              <AutoAwesomeRounded
                                htmlColor="#BDBDBD"
                                sx={{
                                  fontSize: 16,
                                  m: '4px 0'
                                }}
                              />
                            )
                          }
                        }}
                        sx={{
                          mb: 0.25,
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          }
                        }}
                        fullWidth
                      />
                      {!bubbleMenuActionsData?.content && (
                        <Typography
                          variant="caption"
                          color="#919191"
                          textAlign="left"
                          width="100%"
                          px={2}
                        >
                          e.g., Reduce redundancy and improve coherence
                        </Typography>
                      )}
                    </div>

                    {!isExpired && (
                      <IconButton
                        data-ga-tracking
                        onClick={handleCustomPrompt}
                        sx={{
                          padding: 0.5,
                          borderRadius: 0.75,
                          ...(!queryTexts.trim()
                            ? {
                                pointerEvents: 'none',
                                backgroundColor: '#E0E0E0'
                              }
                            : {
                                backgroundColor: '#21965F',
                                '&:hover': {
                                  backgroundColor: '#1A7F4D'
                                }
                              })
                        }}
                        data-ga-event="ai_action"
                        data-ga-event-action-type="improve"
                      >
                        <AskAIIcon />
                      </IconButton>
                    )}
                  </Stack>
                ) : (
                  !bubbleMenuActionsData.content && (
                    <Tooltip
                      placement="top"
                      title={
                        isExpired
                          ? limitInfos[limitType]?.document ||
                            limitInfos[limitType]
                          : ''
                      }
                    >
                      <Stack
                        sx={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                          gap: 1
                        }}
                      >
                        {bubbleButtons.map((menu, index) => {
                          const {
                            text = '',
                            icon = null,
                            disabled = false,
                            tooltipText,
                            onDefaultClick,
                            sx = {}
                          } = menu;

                          const MenuItemElem = (
                            <Button
                              disableRipple
                              key={index}
                              onClick={(event) => {
                                event.stopPropagation();
                                sendGA4Event('ai_action', {
                                  action_type: menu.type
                                });
                                if (onDefaultClick) {
                                  onDefaultClick();
                                  return;
                                }
                                handleMenuItemClick(event, menu);
                              }}
                              disabled={disabled || isEntireDocumentSelected}
                              size="small"
                              sx={{
                                textTransform: 'capitalize',
                                ...sx
                              }}
                            >
                              {icon && (
                                <ListItemIcon sx={{ minWidth: 3, pr: 2 }}>
                                  {icon}
                                </ListItemIcon>
                              )}
                              <ListItemText
                                disableTypography
                                sx={{
                                  my: 0,
                                  letterSpacing: 0,
                                  lineHeight: '16px',
                                  fontWeight: 600
                                }}
                              >
                                {text}
                              </ListItemText>
                            </Button>
                          );

                          if (tooltipText && !isExpired) {
                            return (
                              <Tooltip
                                title={tooltipText}
                                key={index}
                                placement="top"
                              >
                                <div>{MenuItemElem}</div>
                              </Tooltip>
                            );
                          }

                          return MenuItemElem;
                        })}

                        <TextEditButtonGroups
                          editor={editor}
                          isEntireDocumentSelected={isEntireDocumentSelected}
                        />
                      </Stack>
                    </Tooltip>
                  )
                )}
              </>
            )}
          </>
        )}
      </TiptapBubbleMenu>
    </>
  );
};

export default memo(BubbleMenu);
