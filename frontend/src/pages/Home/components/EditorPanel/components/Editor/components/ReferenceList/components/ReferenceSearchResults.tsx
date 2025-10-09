import React, { memo, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ReferenceList, { ReferenceListRef } from '..';
import { CitationTabs, PmcEmptyState, TabState } from '.';
import { getInitialTabFromSystemInfo, TabType } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import { ReferenceListActionType, ReferenceListResourceType } from '../types';
import { useEditorStore } from 'contexts/editorStore';
interface ReferenceSearchResultsProps {
  type?: ReferenceListActionType;
  editor: any;
  targetNode: any;
  referenceListRef: React.RefObject<ReferenceListRef | null>;
  queryTexts?: string;
  tabState?: TabState;
  enableTitle?: boolean;
  isHidden?: boolean;
  isReset?: boolean;
  setIsReset?: (isReset: boolean) => void;
  handleClose: () => void;
  dataLoadedCallback?: () => void;
}

const ReferenceSearchResults = ({
  type = 'FindReferences',
  editor,
  targetNode,
  tabState,
  enableTitle = false,
  queryTexts = '',
  referenceListRef,
  isHidden = false,
  isReset = false,
  handleClose,
  setIsReset = () => {},
  dataLoadedCallback = () => {}
}: ReferenceSearchResultsProps) => {
  if (!tabState) {
    return null;
  }

  const [isSearching, setIsSearching] = useState<boolean | undefined>(
    undefined
  );

  const { systemInfo } = useSystemStore();
  const { textEvidences = {}, clearTextEvidences } = useEditorStore();
  const { tabValue, setTabValue, isAutoSearch } = tabState;

  const hasNoData = !textEvidences?.[tabValue]?.filter((item) => !item.id)
    ?.length;

  const handleResetSearchingState = () => {
    setTabValue(TabType.PUBMED);
    setIsSearching(undefined);
    handleClose();
  };

  useEffect(() => {
    if (isReset) {
      clearTextEvidences();
      const defaultResourceType = getInitialTabFromSystemInfo(systemInfo);
      setTabValue(defaultResourceType);
      setIsReset(false);
    }
  }, [isReset]);

  useEffect(() => {
    if (referenceListRef.current) {
      referenceListRef.current?.handleSetResourceType?.(
        (tabValue as ReferenceListResourceType) || TabType.PUBMED
      );
    }
  }, [tabValue]);

  return (
    <Box hidden={isHidden} maxWidth={530} {...(enableTitle && { mx: '-10px' })}>
      {enableTitle && (
        <Typography variant="body2" fontWeight={600} margin="0 10px 16px">
          References found
        </Typography>
      )}

      <CitationTabs
        tabValue={tabValue}
        onTabChange={tabState.setTabValue}
        isSearching={isSearching && !isReset}
      />

      <Box maxHeight={412} overflow="hidden">
        <ReferenceList
          ref={referenceListRef}
          editor={editor}
          targetNode={targetNode}
          type={type}
          queryTexts={queryTexts}
          handleClose={handleResetSearchingState}
          dataLoadedCallback={(type: string) => {
            if ([TabType.PUBMED, TabType.PMC].includes(type as TabType)) {
              setIsSearching(type === TabType.PMC ? false : undefined);
            }
            dataLoadedCallback();
          }}
          notFound={
            hasNoData &&
            (tabValue === TabType.PMC ? (
              <PmcEmptyState
                onSearch={() => {
                  setIsSearching(true);
                  referenceListRef.current?.findReferences();
                }}
                isSearching={isSearching}
                isDisabled={
                  type === 'AddCitations' && !queryTexts.trim()?.length
                }
              />
            ) : (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  width: '100%',
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  m: 0,
                  p: 0
                }}
              >
                Nothing found. Try a different search query.
              </Typography>
            ))
          }
          enableTitle={enableTitle}
          isAutoSearch={isAutoSearch}
        />
      </Box>
    </Box>
  );
};

export default memo(ReferenceSearchResults);
