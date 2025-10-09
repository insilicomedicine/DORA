import { memo, useCallback, useEffect, useMemo } from 'react';
import TextEvidencesChunkItem from '../RightPanel/components/TextEvidencesChunkItem';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import { Bibliography, RightPanelComponentIds } from 'types/document';
import { getAllAbstractChunkTexts } from 'utils/editor';
import { useEditorStore } from 'contexts/editorStore';

interface TextEvidenceItemProps {
  itemData: Bibliography;
  showWithLink?: boolean;
  enableCheckbox?: boolean;
  checkedList?: Bibliography[];
  isHidden?: boolean;
  handleCheck?: (target: Bibliography) => void;
}

const TextEvidenceItem = ({
  itemData,
  showWithLink = false,
  enableCheckbox = false,
  checkedList = [],
  isHidden = false,
  handleCheck = () => {}
}: TextEvidenceItemProps) => {
  const { referenceLinkTarget, setRightPanel } = useEditorStore();

  const { type = 'pubmed', uid: itemId, chunks = {} } = itemData || {};

  const activeChunkId = referenceLinkTarget?.chunkid;

  const chunksMap = useMemo<Record<string, string>>(
    () => (chunks as unknown as Record<string, string>) || {},
    [chunks]
  );

  const linkedChunks = useMemo(() => {
    if (!showWithLink || !activeChunkId) return [] as string[];
    return getAllAbstractChunkTexts(chunksMap, activeChunkId);
  }, [showWithLink, activeChunkId, chunksMap]);

  const firstChunk = useMemo(() => {
    const values = Object.values(chunksMap);
    return (values?.[0] as string) || '';
  }, [chunksMap]);

  const chunksToRender = useMemo(() => {
    return showWithLink && activeChunkId ? linkedChunks : [firstChunk];
  }, [showWithLink, activeChunkId, linkedChunks, firstChunk]);

  const selectedIdsSet = useMemo(() => {
    return new Set((checkedList || []).map((it) => it.uid));
  }, [checkedList]);

  const handleItemCheck = useCallback(() => {
    handleCheck(itemData);
  }, [handleCheck, itemData]);

  useEffect(() => {
    if (!showWithLink || !activeChunkId) return;
    if (linkedChunks.length > 0) return;
    setRightPanel({ activedComponentId: RightPanelComponentIds.bibliography });
  }, [showWithLink, activeChunkId, linkedChunks.length, setRightPanel]);

  return (
    <Stack
      flexDirection={enableCheckbox ? 'row' : 'column'}
      alignItems="flex-start"
      height="100%"
      overflow="auto"
      display={isHidden ? 'none' : 'flex'}
      onClick={handleItemCheck}
    >
      {enableCheckbox && (
        <Checkbox
          size="small"
          sx={{ p: '6px' }}
          tabIndex={-1}
          disableRipple
          checked={selectedIdsSet.has(itemId)}
          onChange={handleItemCheck}
        />
      )}
      <TextEvidencesChunkItem
        {...(itemData?.metadata || {})}
        chunks={chunksToRender}
        isCustomLink={['file', 'websearch'].includes(type)}
        showWithLink={showWithLink}
        isSearchResult={enableCheckbox}
      />
    </Stack>
  );
};

export default memo(TextEvidenceItem);
