import {
  forwardRef,
  memo,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextEvidences from '../../../../../../components/TextEvidences';
import {
  findCitations,
  findReferences,
  updateBibliographies
} from 'services/documents';
import { generateMetaData } from 'services/dwh';
import { convertToBibliographies } from 'utils/document';
import { generateLinkContent, INLINE_CITATION_TEXT } from 'utils/editor';
import { chunksAuthorFormatter } from 'utils/chunksAuthorFormatter';
import { useEditorStore } from 'contexts/editorStore';
import { Bibliography, ReferenceSourceType } from 'types/document';
import { addDynamicClassToStyle } from 'utils/utils';
import { useDocumentStore } from 'contexts/documentsStore';
import { getInitialTabFromSystemInfo } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import { ReferenceListActionType, ReferenceListResourceType } from './types';

export interface ReferenceListRef {
  findReferences: (_options?: any) => void;
  handleAddReferences?: (e: any) => void;
  getSelectedReferences?: () => any[];
  handleSetResourceType?: (resourceType?: ReferenceListResourceType) => void;
  abortSearch?: () => void;
}

interface ReferenceListProps {
  ref: ReferenceListRef;
  editor: any;
  targetNode: any;
  type?: ReferenceListActionType;
  enableTitle?: boolean;
  queryTexts?: string;
  notFound?: string | ReactNode;
  isAutoSearch?: boolean;
  setType?: (value?: ReferenceListActionType) => void;
  handleClose?: (e: any) => void;
  dataLoadedCallback?: (type: string) => void;
}

const ReferenceList = forwardRef<ReferenceListRef, ReferenceListProps>(
  (props, ref) => {
    const {
      editor,
      targetNode,
      type,
      queryTexts = '',
      notFound = '',
      isAutoSearch = false,
      handleClose = () => {},
      dataLoadedCallback = () => {}
    } = props;

    const {
      documentData,
      bibliographyList = [],
      setDocumentDetailData
    } = useDocumentStore();

    const {
      textEvidences = {},
      setTextEvidences,
      clearTextEvidences,
      setNewBibliographyList
    } = useEditorStore();
    const { systemInfo } = useSystemStore();

    const [resourceType, setResourceType] =
      useState<ReferenceListResourceType>('pubmed');
    const [isReset, setIsReset] = useState<boolean>(false);
    const [isShowSearchResult, setIsShowSearchResult] =
      useState<boolean>(false);
    const [isReferencesLoading, setIsReferencesLoading] =
      useState<Partial<Record<ReferenceListResourceType, boolean>>>();
    const [isAddReferencesLoading, setIsAddReferencesLoading] =
      useState<boolean>(false);
    const [selectedReferences, setSelectedReferences] = useState<
      Bibliography[]
    >([]);

    const textEvidencesRef = useRef<
      Partial<Record<ReferenceSourceType, Bibliography[]>>
    >(textEvidences ?? {});
    const abortControllerRef = useRef<AbortController>(undefined);

    // Check the type of the reference list
    const isAddCitations = type === 'AddCitations';

    const handleGetMetaData = async (
      data,
      chunks,
      resourceType: ReferenceListResourceType
    ) => {
      const isRequireMetadata = ['pubmed', 'pmc'].includes(resourceType);
      const response = isRequireMetadata
        ? await generateMetaData(data, abortControllerRef.current)
        : [];
      if (!response) return;
      const previousEvidences = textEvidencesRef.current || {};
      textEvidencesRef.current = {
        ...previousEvidences,
        [resourceType]: [
          ...(bibliographyList || []),
          ...convertToBibliographies(chunks, response)
        ]
      };

      setTextEvidences(textEvidencesRef.current);
      setIsShowSearchResult(true);
    };

    const handleFindReferences = async (
      sourceType?: ReferenceListResourceType
    ) => {
      const { state } = editor || {};
      const { from = 0, to = 0 } = state?.selection || {};
      const query = isAddCitations
        ? queryTexts
        : state?.doc.textBetween(from, to, ' ');
      if (!query) return;

      const searchResourceType = sourceType || resourceType;
      if (isAutoSearch) {
        setIsReferencesLoading((prev) => ({
          ...prev,
          [searchResourceType]: true
        }));
      }

      const apiFunction = isAddCitations ? findCitations : findReferences;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (!documentData?.id) return;
      const response = await apiFunction(
        documentData?.id,
        { query, search_resource_type: searchResourceType },
        abortControllerRef.current
      );
      if (!response) {
        if (isAutoSearch) {
          setIsReferencesLoading((prev) => ({
            ...prev,
            [searchResourceType]: false
          }));
        }
        return;
      }
      const data = {
        search_resource_type: searchResourceType,
        pubmed_ids: response.map((item) => item.pubmed_id),
        order_by: 'id'
      };
      await handleGetMetaData(data, response, searchResourceType);
      if (isAutoSearch) {
        setIsReferencesLoading((prev) => ({
          ...prev,
          [searchResourceType]: false
        }));
      }

      dataLoadedCallback(searchResourceType);
    };

    const handleAddReferences = async (e: any) => {
      if (!editor?.view || !targetNode) return;
      setIsAddReferencesLoading(true);
      const _responseBibliographies = await updateBibliographies({
        bibliographies: selectedReferences.map(
          ({ uid: _uid, isNew: _isNew, ...rest }) => rest
        )
      });
      if (!_responseBibliographies) {
        setIsAddReferencesLoading(false);
        return;
      }
      const newBiographies = [..._responseBibliographies, ...bibliographyList];
      const newBibliographyList = _responseBibliographies.map((item) => ({
        ...item,
        isNew: true
      }));
      setNewBibliographyList(newBibliographyList);

      const { state } = editor || {};
      const { to } = state?.selection || {};

      const referencesLinks =
        selectedReferences.map((item, index) => {
          const {
            uid = '',
            metadata: { pubmed_id = '' } = {},
            type: itemType = '',
            chunks = []
          } = item;

          const targetChunk = newBiographies?.find(
            (bibliography) =>
              bibliography.metadata?.pubmed_id === pubmed_id ||
              Object.keys(bibliography.chunks || {}).includes(uid)
          );
          const chunkIds = Object.keys(chunks);
          const isFirst = index === 0;
          const isLast = index === selectedReferences.length - 1;

          // Generate link content with the type (pubmed, websearch) of the item
          return generateLinkContent({
            id: targetChunk?.id || pubmed_id || uid,
            chunkIds,
            linkText: chunksAuthorFormatter({ ...item?.metadata }, itemType),
            isFirst,
            isLast,
            href: '#',
            className: 'bgFadeOutAnimation'
          });
        }) || [];

      //add dynamic animation to style
      addDynamicClassToStyle(
        'newReference',
        `.bgFadeOutAnimation{
        transition: background-color 0.8s linear;
        '-webkit-animation': referencesBgAnimation 1.8s linear forwards;
        animation: referencesBgAnimation 1.8s linear forwards;
        }`
      );
      //update content
      const referencesLinksString = referencesLinks.join('');
      const startPos = to - INLINE_CITATION_TEXT.length - 3;
      editor.commands.deleteRange({ from: startPos, to });
      editor?.commands.insertContentAt(startPos, referencesLinksString);
      setIsAddReferencesLoading(false);

      //clear search
      editor?.commands.blur();
      handleClose(e);
      setDocumentDetailData({
        bibliographyList: [
          ...newBiographies,
          ...bibliographyList,
          ...(documentData?.bibliographies || [])
        ]
      });

      clearTextEvidences();
    };

    const resetSearchResult = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearTextEvidences();
      setIsReferencesLoading({});
      textEvidencesRef.current = {};
    };

    useImperativeHandle(ref, () => ({
      abortSearch() {
        resetSearchResult();
      },
      findReferences(needReset?: boolean) {
        if (needReset) {
          const defaultResourceType = getInitialTabFromSystemInfo(systemInfo);
          setIsReset(true);
          setResourceType(defaultResourceType);
          handleFindReferences(defaultResourceType);
          return;
        }
        handleFindReferences();
      },
      handleAddReferences(e) {
        handleAddReferences(e);
      },
      getSelectedReferences() {
        return selectedReferences;
      },
      handleSetResourceType(resourceType?: ReferenceListResourceType) {
        setResourceType(resourceType || 'pubmed');
      }
    }));

    useEffect(() => {
      if (isReferencesLoading?.[resourceType] !== undefined) return;
      if (isAutoSearch) {
        handleFindReferences(resourceType);
      }
    }, [resourceType]);

    useEffect(() => {
      resetSearchResult();
    }, []);

    if (!isShowSearchResult) return null;

    const isCustomLoading =
      isReferencesLoading?.[resourceType] !== false && isAutoSearch;

    return (
      <Stack
        sx={{
          minWidth: 400,
          maxHeight: 'inherit',
          alignItems: 'flex-start'
        }}
      >
        <Box
          sx={{
            width: '100%',
            pt: 1,
            px: 1,
            maxHeight: 420,
            minHeight: 358,
            ...(!isAddCitations && {
              minWidth: 530
            }),
            scrollbarGutter: 'stable',
            overflowY: isCustomLoading ? 'hidden' : 'auto'
          }}
        >
          {isCustomLoading ? (
            <Stack
              sx={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 350,
                gap: 1
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="textSecondary">
                Searching
              </Typography>
            </Stack>
          ) : (
            Boolean(notFound) && <>{notFound}</>
          )}
          <Box display={Boolean(notFound) ? 'none' : 'block'}>
            <TextEvidences
              isReset={isReset}
              setIsReset={setIsReset}
              resourceType={resourceType as ReferenceSourceType}
              handleAction={setSelectedReferences}
            />
          </Box>
        </Box>
        <Divider sx={{ width: '100%' }} />
        <Button
          sx={{
            my: '12px',
            ml: '12px'
          }}
          variant="contained"
          onClick={handleAddReferences}
          disabled={!selectedReferences.length || isAddReferencesLoading}
          data-ga-event="Insert References"
          data-ga-event-location="modal"
        >
          {isAddReferencesLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <>
              ADD
              {selectedReferences.length > 0 && (
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ ml: 0.5, opacity: 0.6 }}
                >
                  {selectedReferences.length}
                </Typography>
              )}
            </>
          )}
        </Button>
      </Stack>
    );
  }
);
export default memo(ReferenceList);
