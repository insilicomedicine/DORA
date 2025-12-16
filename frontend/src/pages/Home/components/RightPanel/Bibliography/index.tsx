import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router';
import { CircularProgress, Divider, Stack, Typography } from '@mui/material';
import NoData from '../components/NoData';
import BibliographyPublicationItem from '../components/BibliographyPublicationItem';
import BibliographyCustomItem from '../components/BibliographyCustomItem';
import BibliographyFileItem from '../components/BibliographyFileItem';
import { useEditorStore } from 'contexts/editorStore';
import { useDocumentStore } from 'contexts/documentsStore';
import { openFilePreview } from 'services/files';
import { getDocument } from 'services/documents';
import { removeDuplicates } from 'utils/utils';
import { Bibliography } from 'types/document';
import BibliographyNoData from 'assets/rightPanel/bibliography.svg';

const BibliographyList = () => {
  const {
    documentData,
    bibliographyList: storedBibliographyList = [],
    isDocumentLoading = false,
    setDocumentDetailData,
    isBibliographyChanged = false,
    setIsBibliographyChanged,
    setUpdatedDocument
  } = useDocumentStore();

  const { id: viewedPaperId = '' } = useParams();
  const {
    reloadBibliography,
    setReloadBibliography,
    newBibliographyList = []
  } = useEditorStore((state) => state);
  const [loading, setLoading] = useState(false);
  const [bibliographyList, setBibliographyList] = useState<Bibliography[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isDocumentInProgress = documentData?.status === 'in_progress';

  // Fetch bibliography data from API
  const fetchBibliographyData = async (updateState = true) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await getDocument(
      viewedPaperId,
      abortControllerRef.current
    );

    if (!response) return null;
    setBibliographyList(response.bibliographies);

    if (updateState) {
      setLoading(false);
      setReloadBibliography(undefined);
      setDocumentDetailData({
        bibliographyList: response.bibliographies
      });
    }

    return response;
  };

  // Initialize bibliography list from document when loading completes
  useEffect(() => {
    if (!isDocumentLoading && documentData?.bibliographies) {
      setBibliographyList(removeDuplicates(documentData.bibliographies, 'id'));
    }
  }, [isDocumentLoading, documentData?.bibliographies]);

  // Update bibliography list when new items are added
  useEffect(() => {
    if (newBibliographyList?.length && documentData?.id === viewedPaperId) {
      setBibliographyList((prevList) => [...newBibliographyList, ...prevList]);
    }
  }, [newBibliographyList, documentData?.id, viewedPaperId]);

  // Handle reload bibliography
  useEffect(() => {
    if (reloadBibliography === undefined) return;

    if (reloadBibliography) {
      setLoading(true);
      return;
    }

    fetchBibliographyData();

    return () => {
      // Abort any in-progress API calls on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [reloadBibliography]);

  // Handle bibliography changes
  useEffect(() => {
    if (!isBibliographyChanged) return;

    const updateBibliography = async () => {
      const response = await fetchBibliographyData(false);
      if (!response) return;

      setDocumentDetailData({
        documentData: {
          ...documentData,
          ...response
        },
        bibliographyList: response.bibliographies
      });
      setUpdatedDocument(response);
      setIsBibliographyChanged(false);
    };

    updateBibliography();
  }, [isBibliographyChanged]);

  // Loading state
  if (isDocumentLoading || isBibliographyChanged || loading) {
    return (
      <Stack
        justifyContent="center"
        alignItems="center"
        height="100%"
        px={3}
        pb={2}
      >
        <CircularProgress size={24} />
      </Stack>
    );
  }

  // Document in progress state
  if (
    !bibliographyList?.length &&
    !documentData?.bibliographies?.length &&
    isDocumentInProgress
  ) {
    return (
      <Stack
        justifyContent="center"
        alignItems="center"
        height="100%"
        px={3}
        pb={2}
      >
        <NoData
          imgSrc={BibliographyNoData}
          styles={{ width: 70, height: 70 }}
          content={
            <Typography variant="body1" color="text.secondary" mt={2}>
              Bibliography is not ready yet.
              <br />
              Don't worry, it will populate this space once the document is
              generated.
            </Typography>
          }
        />
      </Stack>
    );
  }

  // No bibliography state
  if (
    !bibliographyList?.length &&
    !storedBibliographyList?.length &&
    !isDocumentLoading
  ) {
    return (
      <Stack
        justifyContent="center"
        alignItems="center"
        height="100%"
        px={3}
        pb={2}
        textAlign="center"
      >
        <Typography
          variant="body2"
          fontWeight={500}
          color="text.main"
          fontStyle="normal"
        >
          There is no bibliography for your document.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          fontStyle="normal"
          sx={{ mt: 1 }}
        >
          Use AI tools or the Add Citation option to include references and
          enrich your document.
        </Typography>
      </Stack>
    );
  }

  // Group bibliography items by type
  const { publicationItems, webSearchItems, customBibliographies } =
    bibliographyList?.reduce<{
      publicationItems: Bibliography[];
      webSearchItems: Bibliography[];
      customBibliographies: Bibliography[];
    }>(
      (res, item: Bibliography) => {
        const hasAuthors = item.metadata?.authors?.length;
        if (
          item.type === 'pubmed' ||
          (item.type === 'websearch' && hasAuthors)
        ) {
          res.publicationItems.push(item);
        } else if (item.type === 'websearch' && !hasAuthors) {
          res.webSearchItems.push(item);
        } else if (item.type === 'file') {
          res.customBibliographies.push(item);
        }
        return res;
      },
      { publicationItems: [], webSearchItems: [], customBibliographies: [] }
    );

  const deduplicatedWebSearchItems = removeDuplicates(
    webSearchItems,
    (item) => {
      const url = item?.metadata?.url;
      return url ? String(url).trim().split('#')[0].trim() : null;
    },
    (item, key) => ({
      ...item,
      metadata: { ...(item.metadata || {}), url: key }
    })
  );

  return (
    <>
      {customBibliographies?.map((item: Bibliography) => (
        <BibliographyFileItem
          key={item.metadata?.object_id || ''}
          fileName={item.metadata?.file_name || ''}
          handleClick={() => openFilePreview(item.metadata?.object_id || '')}
        />
      ))}

      {!!customBibliographies?.length && !!publicationItems.length && (
        <Divider sx={{ my: 2, mx: 1.5, borderColor: '#F2F2F2' }} />
      )}

      {publicationItems.map((item: Bibliography, index: number) => {
        const { metadata, isNew = false, id = '' } = item || {};

        return (
          <BibliographyPublicationItem
            key={id || metadata?.pubmed_id || index}
            {...metadata}
            isNew={isNew}
            pub_year={metadata?.pub_year || 0}
          />
        );
      })}

      {deduplicatedWebSearchItems.map((item: Bibliography) => (
        <BibliographyCustomItem
          key={item?.id || ''}
          title={item?.metadata?.title || ''}
          url={item?.metadata?.url || ''}
          sx={{ ml: 1.5, mr: 2, pt: 1.5 }}
        />
      ))}
    </>
  );
};

export default BibliographyList;
