import { Fragment, SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import { useLocation, useSearchParams } from 'react-router';
import { SimpleTreeView } from '@mui/x-tree-view';
import CustomTreeItem from '../CustomTreeItem';
import { useNavigate, useParams } from 'react-router';
import { closeSnackbar } from 'notistack';
import Snackbar, { getSnackbarInstance } from 'utils/snackbar';
import CloseRounded from '@mui/icons-material/CloseRounded';
import useFetchDocuments from 'hooks/useFetchDocuments';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import { convertToEditorDocument } from 'utils/document';
import { getDocument } from 'services/documents';
import { theme } from 'theme';
import BookIcon from 'assets/icons/BookIcon';
import BookIconEmpty from 'assets/icons/BookIconEmpty';
import Buttons from '../Buttons';
import { useDocumentStore } from 'contexts/documentsStore';
import NoData from '../NoData';
import { parseISO, isWithinInterval, subDays } from 'date-fns';
import { useEditorStore } from 'contexts/editorStore';
import { getSectionsWithSubSections } from 'utils/documents';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';

const loading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70%',
        mt: 2
      }}
    >
      <CircularProgress size={24} />
    </Box>
  );
};

const SideMenu = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { id: viewedDocumentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const { setDocumentDetailData } = useDocumentStore();
  const { systemInfo } = useSystemStore();
  const { setReferenceLinkTarget, setNewBibliographyList } = useEditorStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    viewedDocumentId
  ]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bibliographyListIsOpen = location.pathname.includes('bibliography');
  const treeViewRef = useRef<HTMLUListElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    setIsNewDocument,
    newDocument,
    isNewDocumentGenerating,
    setIsNewDocumentGenerating
  } = useDocumentStore((state) => state);

  // Get previous document ID to check if it changed
  const prevDocumentId = useRef<string | undefined>(undefined);

  const {
    documentList = [],
    setDocumentsData,
    isDocumentsLoading = false,
    isLoadingMore,
    hasMore,
    loadMore,
    polishingDocument,
    setPolishingDocument
  } = useFetchDocuments();

  const isCustomBibliographyEnabled = getSystemConfig(systemInfo, [
    'custom_bibliography'
  ]);

  // Use the infinite scroll hook
  const { targetRef } = useInfiniteScroll(loadMore, {
    threshold: 0.1,
    rootMargin: '200px',
    enabled: hasMore && !isDocumentsLoading && !isLoadingMore,
    root: scrollContainerRef.current
  });

  //Fetch the document
  const handleGetDocument = async (id, isNewDocumentGenerating = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await getDocument(id, abortControllerRef.current);
    if (!response) return;

    if (response.status === 'failed') {
      nav('/templates');
      return;
    }

    const { bibliographies = [] } = response;
    setReferenceLinkTarget({ pmid: undefined });

    setDocumentDetailData({
      documentData: convertToEditorDocument(response, bibliographies).doc,
      bibliographyList: bibliographies,
      isDocumentLoading: false,
      allSectionsPolished: false
    });
    setNewBibliographyList(null);

    if (isNewDocumentGenerating) {
      //Update the document list to show the new document as in progress
      const newDocumentList = documentList.map((doc) => {
        if (viewedDocumentId === doc.id) {
          return { ...response };
        }
        return doc;
      });
      setDocumentsData((prevData) => ({
        count: prevData.count,
        list: newDocumentList
      }));
    }
  };

  //Expand all sections and subsections
  const handleExpandItems = (documentId: string) => {
    //Get the document
    const document = documentList.find((item) => item.id === documentId);
    if (!document) return;

    // Don't expand if document is in draft stage
    if (document.stage === 'draft') {
      setExpandedItems([documentId]);
      return;
    }

    // Start with the document ID
    const itemsToExpand = [documentId];

    // Add section IDs if available
    if (document.sections && document.sections.length) {
      //Get all sections which have sub-sections
      const sectionsWithSubSections = getSectionsWithSubSections(
        document.sections
      );
      const allSectionsIds = sectionsWithSubSections.map(
        (section) => section.id
      );
      itemsToExpand.push(...allSectionsIds);
    }

    //Set expanded items
    setExpandedItems(itemsToExpand);
  };

  //Handle item click
  const handleItemClick = async (_event: SyntheticEvent | null, itemId) => {
    const rootItemIDs = documentList.map((item) => item.id);
    const isRootItem = rootItemIDs.includes(itemId);

    // When clicking on a root item
    if (isRootItem) {
      // Navigation logic
      const viewedDocument = documentList.find((item) => item.id === itemId);
      const isDraft = viewedDocument.stage === 'draft';
      if (isDraft) {
        const redirectPath = viewedDocument.status
          ? itemId
          : `?template=${itemId}`;
        nav(`/documents/generation/${redirectPath}`);
        setExpandedItems([]);
        setIsNewDocument(false);
        return;
      }

      nav(`/documents/${itemId}`);
      return;
    }

    // Also toggle the clicked section itself
    const _expandedItems: string[] = [...expandedItems];
    if (expandedItems.includes(itemId)) {
      _expandedItems.splice(expandedItems.indexOf(itemId), 1);
    } else {
      _expandedItems.push(itemId);
    }
    setExpandedItems(_expandedItems);
  };

  //When the viewedDocumentId changes, fetch the document
  useEffect(() => {
    // If there's no document ID in the URL or no documents, nothing to do
    if (!viewedDocumentId || !documentList.length) return;

    // Skip if only documentList changed but not the viewedDocumentId
    // This prevents unnecessary fetches when just the list changes
    if (prevDocumentId.current === viewedDocumentId) return;
    prevDocumentId.current = viewedDocumentId;

    // Expand the document if it's in our list
    const viewedDocument = documentList.find(
      (item) => item.id === viewedDocumentId
    );

    const isDraft = viewedDocument?.stage === 'draft';
    if (isDraft) {
      setExpandedItems([viewedDocumentId]);
      return;
    }

    setDocumentDetailData({ isDocumentLoading: true });

    const fetchData = async () => {
      handleExpandItems(viewedDocumentId);
      await handleGetDocument(viewedDocumentId);
    };
    fetchData();
  }, [viewedDocumentId, documentList]);

  //Show snackbar notification for document polishing when the document is not actived
  useEffect(() => {
    const { id, title } = polishingDocument || {};
    if (!id || id === viewedDocumentId) return;
    !getSnackbarInstance() &&
      Snackbar.info(
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <label style={{ minWidth: 413 }}>
            <span
              style={{
                display: 'inline-block',
                verticalAlign: 'bottom',
                maxWidth: 309,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              {title}
            </span>
            &nbsp;has been unified
          </label>
          <div style={{ color: '#fff' }}>
            <Button
              sx={{
                color: '#fff',
                fontWeight: 700,
                letterSpacing: 0.4
              }}
              onClick={() => {
                handleExpandItems(id);
                nav(`/documents/${id}`);
                closeSnackbar();
              }}
            >
              View
            </Button>
            <IconButton onClick={() => closeSnackbar()}>
              <CloseRounded sx={{ fontSize: '20px', color: '#fff' }} />
            </IconButton>
          </div>
        </Stack>,
        {
          autoHideDuration: 18000
        }
      );
    setPolishingDocument(null);
  }, [polishingDocument?.id]);

  //Add new document
  useEffect(() => {
    if (!newDocument) {
      //Remove the new document from the list if the document is not saved
      setDocumentsData((prev) => ({
        ...prev,
        list: prev.list.filter((doc) => doc.status)
      }));
      setIsNewDocument(false);
      return;
    }
    if (!newDocument?.id || isDocumentsLoading) return;
    //Update new document list if the document status is initialized
    setDocumentsData((prev) => ({
      ...prev,
      list:
        newDocument.status === 'initialized'
          ? [newDocument, ...prev.list.slice(1)]
          : [newDocument, ...prev.list]
    }));
    // Expand the new document and all its sections
    setExpandedItems([newDocument.id]);
  }, [newDocument?.id, isDocumentsLoading]);

  //When the isNewDocumentGenerating changes, fetch the document
  useEffect(() => {
    if (!isNewDocumentGenerating) return;
    setDocumentDetailData({ isDocumentLoading: true });

    const fetchData = async () => {
      await handleGetDocument(viewedDocumentId, true);
      setIsNewDocumentGenerating(false);
    };
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isNewDocumentGenerating]);

  //When the viewedDocumentId or templateId changes, clear the expanded items
  useEffect(() => {
    if (!viewedDocumentId && !templateId) {
      setExpandedItems([]);
    }
  }, [viewedDocumentId, templateId]);

  //Group documents by this week and previously
  const today = new Date();
  const last7DaysDocuments = documentList.filter((doc) =>
    isWithinInterval(parseISO(doc?.created_at || ''), {
      start: subDays(today, 7),
      end: today
    })
  );
  const groups = [
    {
      title: 'Last 7 days',
      documents: last7DaysDocuments
    },
    {
      title: 'Previously',
      documents: documentList.filter((doc) => !last7DaysDocuments.includes(doc))
    }
  ];

  return (
    <>
      <Stack
        sx={{
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Stack
          flexDirection="row"
          alignItems="center"
          minHeight={52}
          p="16px 24px 12px 24px"
        >
          <Typography fontWeight={500} variant="caption" color="text.secondary">
            My documents
          </Typography>
          <Buttons />
        </Stack>
        {isDocumentsLoading && !documentList.length ? (
          loading()
        ) : (
          <Box
            ref={scrollContainerRef}
            sx={{
              flex: 1,
              pr: 0.25,
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative'
            }}
          >
            {!documentList.length ? (
              <NoData />
            ) : (
              <SimpleTreeView
                onSelectedItemsChange={handleItemClick}
                expandedItems={expandedItems}
                ref={treeViewRef}
                sx={{
                  px: 1,
                  pb: 1,
                  height: '100%',
                  overflowX: 'hidden',
                  scrollbarWidth: 'thin',
                  scrollbarGutter: 'stable',
                  '& >.MuiTreeItem-root': {
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition:
                      'background-color 200ms ease-in-out, max-height 150ms ease-in-out',
                    '& .MuiTreeItem-groupTransition': {
                      transition: 'height 200ms ease-in-out'
                    },
                    '&:hover': {
                      '& .documentTitle': {
                        color: 'text.primary'
                      }
                    }
                  }
                }}
              >
                {groups.map((group, index) => {
                  const { title, documents = [] } = group;
                  const isShowGroupTitle =
                    groups[0].documents.length > 0 && documents.length > 0;

                  return (
                    <Fragment key={title}>
                      {isShowGroupTitle && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            position: 'sticky',
                            top: 0,
                            pl: 2,
                            py: 1,
                            backgroundColor: 'white',
                            zIndex: ++index
                          }}
                        >
                          {title}
                        </Typography>
                      )}
                      {documents.map((item) => {
                        const { id } = item;
                        return <CustomTreeItem key={id} {...item} />;
                      })}
                    </Fragment>
                  );
                })}

                {/* Loading indicator for infinite scroll */}
                {hasMore && (
                  <Box
                    ref={targetRef}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '20px 0',
                      width: '100%',
                      minHeight: '30px'
                    }}
                  >
                    {isLoadingMore ? (
                      <CircularProgress size={20} />
                    ) : (
                      <Box sx={{ height: 20 }} />
                    )}
                  </Box>
                )}
              </SimpleTreeView>
            )}
          </Box>
        )}
        {!isDocumentsLoading && isCustomBibliographyEnabled && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            p={1}
            sx={{
              height: 56,
              borderTop: '1px solid',
              borderColor: theme.palette.grey[200]
            }}
          >
            <Button
              disableRipple
              sx={{
                backgroundColor: bibliographyListIsOpen
                  ? 'grey.50'
                  : 'transparent',
                justifyContent: 'flex-start',
                textTransform: 'none',
                width: '100%',
                borderRadius: '12px',
                color: 'text.secondary',
                p: '8px 16px',
                height: 40,
                lineHeight: 'normal',
                letterSpacing: 0,
                '&:hover': {
                  backgroundColor: 'grey.50',
                  color: 'text.primary'
                }
              }}
              onClick={() => nav('/bibliography')}
              startIcon={
                bibliographyListIsOpen ? (
                  <BookIcon color={theme.palette.text.secondary} />
                ) : (
                  <BookIconEmpty color={theme.palette.text.secondary} />
                )
              }
            >
              Custom Bibliography
            </Button>
          </Stack>
        )}
      </Stack>
    </>
  );
};

export default SideMenu;
