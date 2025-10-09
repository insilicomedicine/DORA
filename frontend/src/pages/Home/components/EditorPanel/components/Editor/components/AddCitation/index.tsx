import React, { memo, useRef, useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Popper,
  Stack,
  TextField,
  Typography,
  ClickAwayListener
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {
  CitationSearchResults,
  TabProvider,
  TabState
} from '../ReferenceList/components';
import { ReferenceListRef } from '../ReferenceList';
import { INLINE_CITATION_TEXT } from 'utils/editor';

interface AddCitationProps {
  editor: any;
  targetNode: any;
  focusPosition: any;
  showAddCitationPopup: boolean;
  setFocusPosition?: (value: any) => void;
  handleCloseAddCitationPopup: () => void;
}

const AddCitation = (props: AddCitationProps) => {
  const [queryTexts, setQueryTexts] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean | undefined>(
    undefined
  );
  const [isReset, setIsReset] = useState<boolean>(false);
  const referenceListRef = useRef<ReferenceListRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);

  const {
    editor,
    targetNode,
    showAddCitationPopup,
    setFocusPosition = () => {},
    handleCloseAddCitationPopup
  } = props;

  const handleCloseAddCitation = () => {
    setQueryTexts('');
    setIsSearching(undefined);
    setIsReset(false);
    setFocusPosition({ x: 0, y: 0 });
    // Delete citation placeholder when closing
    if (editor && editor.state) {
      // Try to find and remove the citation placeholder
      const placeholderElement = document.getElementById(
        'citation-placeholder'
      );
      if (placeholderElement) {
        // Get position from the editor view's DOM position
        const view = editor.view;
        const pos = view.posAtDOM(placeholderElement, 0);
        if (pos !== null && pos !== undefined) {
          // Calculate end position based on placeholder text length
          const endPos = pos + INLINE_CITATION_TEXT.length;
          // Delete the citation placeholder with surrounding marks
          editor.commands.deleteRange({
            from: Math.max(0, pos - 1),
            to: endPos + 1
          });
        }
      }
    }
    referenceListRef.current?.abortSearch?.();
    handleCloseAddCitationPopup();
  };

  const handleSearch = () => {
    setIsSearching(true);
    setIsReset(true);
    referenceListRef.current?.abortSearch?.();
    referenceListRef.current?.findReferences(true);
  };

  const renderSearchResults = (tabState: TabState) => {
    return (
      <CitationSearchResults
        type="AddCitations"
        editor={editor}
        tabState={tabState}
        isReset={isReset}
        setIsReset={setIsReset}
        queryTexts={queryTexts}
        targetNode={targetNode}
        referenceListRef={referenceListRef}
        isHidden={isSearching || isSearching === undefined}
        dataLoadedCallback={() => setIsSearching(false)}
        handleClose={handleCloseAddCitation}
      />
    );
  };

  useEffect(() => {
    if (showAddCitationPopup) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [showAddCitationPopup]);

  return (
    <ClickAwayListener
      onClickAway={handleCloseAddCitation}
      mouseEvent="onPointerDown"
    >
      <Popper
        open={showAddCitationPopup}
        anchorEl={document.getElementById('citation-placeholder')}
        container={document.getElementById('editorContentContainer')}
        sx={{
          py: 1,
          maxWidth: 424,
          width: 424,
          zIndex: 10
        }}
        ref={popperRef}
      >
        <Stack
          sx={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)',
            border: '1px solid #EEEEEE'
          }}
        >
          <TabProvider render={renderSearchResults}>
            <Box p="12px 12px 8px" width="100%">
              <Stack sx={{ gap: 1, alignItems: 'center' }}>
                <TextField
                  inputRef={inputRef}
                  autoComplete="off"
                  fullWidth
                  placeholder="Search by keyword, DOI, PMID…"
                  value={queryTexts}
                  onChange={(e) => {
                    const value = e.target?.value;
                    setQueryTexts(value);
                  }}
                  size="small"
                  slotProps={{
                    input: {
                      sx: { pr: 0.75 },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            disableRipple
                            aria-label="search"
                            onClick={handleSearch}
                            disabled={!queryTexts.trim()?.length || isSearching}
                            edge="end"
                            sx={{
                              mr: 0,
                              width: 30,
                              padding: '5px',
                              color: !queryTexts.trim()?.length
                                ? '#9e9e9e'
                                : '#21965F',
                              borderRadius: '6px',
                              '&:hover': {
                                bgcolor: isSearching
                                  ? 'transparent'
                                  : 'primary.light'
                              }
                            }}
                            data-ga-tracking
                            data-ga-event-type="Search Citation"
                            data-ga-event-location="modal"
                          >
                            {isSearching ? (
                              <CircularProgress size={16} />
                            ) : (
                              <SearchIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && queryTexts.trim()?.length >= 1) {
                      handleSearch();
                    }
                  }}
                />
                {(isSearching === undefined || isSearching) && (
                  <Typography variant="caption" color="info.main" pl={2}>
                    Search by title, keywords, PMID, PMCID, DOI, or paste URLs
                    separated by comma or space
                  </Typography>
                )}
              </Stack>
            </Box>
          </TabProvider>
        </Stack>
      </Popper>
    </ClickAwayListener>
  );
};

export default memo(AddCitation);
