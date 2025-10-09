import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useInfiniteScroll } from 'ahooks';
import {
  getBibliographyFiles,
  deleteBibliographyFile,
  postBibliographyFileName,
  updateBibliography
} from 'services/files';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import {
  FileUploadOutlined,
  ErrorOutlineRounded,
  CloseRounded
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useWebsocketStore } from 'contexts/useWebsocketStore';
import { uniqBy } from 'utils/utils';
import { sendGA4Event } from 'utils/ga';
import Box from '@mui/material/Box';
import LeftPanelButtons from '../../../Home/components/LeftPanel/components/Buttons/SingleMode';
import ContentWrapper from './components/ContentWrapper';
import {
  UploadedFileItemType,
  BibliographyFilesResType
} from 'types/bibliography';

const PAGE_SIZE = 20;

const common_upload_file_config = {
  accept: {
    'application/pdf': ['.pdf']
  },
  maxFiles: 20,
  maxSize: 20000000
};

const Bibliography = () => {
  const { uploadedFileUpdatesWS } = useWebsocketStore();
  const scrollElemRef = useRef<HTMLUListElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showDragRejectInfo, setShowDragRejectInfo] = useState(false);
  const [localTempFiles, setLocalTempFiles] = useState<UploadedFileItemType[]>(
    []
  );

  const handleUploadFiles = (files: File[]) => {
    if (files?.length) {
      const PK_STRING_LENGTH = 32;
      const fileList = files.map((file) => ({
        pk: Math.random().toString(PK_STRING_LENGTH).substring(2),
        file
      }));

      setLocalTempFiles([
        ...fileList.map(
          (it) =>
            ({
              name: it.file.name,
              pk: it.pk,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              status: 'beforeUpload'
            }) as UploadedFileItemType
        ),
        ...localTempFiles
      ]);

      fileList.forEach(({ pk, file }) => {
        postBibliographyFileName(
          file.name,
          file,
          (pkVal) => {
            setLocalTempFiles((prev) =>
              prev.map((it) => {
                if (it.pk === pk) {
                  return {
                    ...it,
                    pk: pkVal,
                    status: 'uploaded'
                  };
                }
                return it;
              })
            );
          },
          () => {}
        );
      });

      sendGA4Event('upload_files', {
        file_count: files.length
      });
    }
  };

  const { acceptedFiles, getRootProps, getInputProps, fileRejections } =
    useDropzone({
      ...common_upload_file_config,
      noDrag: true
    });

  const {
    getRootProps: dragGetRootProps,
    getInputProps: dragGetInputProps,
    isDragAccept
  } = useDropzone({
    ...common_upload_file_config,
    noClick: true,
    onDrop: (acceptedFiles) => {
      setShowDragRejectInfo(false);
      handleUploadFiles(acceptedFiles);
    },
    onDropRejected: (fileRejections) => {
      if (fileRejections?.length > 20) {
        setSnackbarOpen(true);
      }
    },
    onDragEnter: (event) => {
      event.preventDefault();
      const items = event.dataTransfer.items;
      let fileCount = 0;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            fileCount++;
          }
        }
      }
      if (fileCount > 20) {
        setShowDragRejectInfo(true);
      }
    },
    onDragLeave: () => {
      setShowDragRejectInfo(false);
    }
  });

  const loadFilesData = async (nextCursor?: string | null) => {
    if (nextCursor === null) return { list: [], next: null };
    const res = await getBibliographyFiles({
      pageSize: PAGE_SIZE,
      cursor: nextCursor
    });
    if (!res) return { list: [], next: null };
    const resData: BibliographyFilesResType = res.data;
    const { next, results } = resData;
    const _localFilePks = localTempFiles.map((it) => it.pk);
    return {
      list: results.filter((file) => _localFilePks.indexOf(file.pk) === -1),
      next
    };
  };

  const {
    data: scrollData,
    loading,
    loadingMore,
    mutate
  } = useInfiniteScroll<{
    list: UploadedFileItemType[];
    next: string | null;
  }>(
    (data) => {
      return loadFilesData(data?.next);
    },
    {
      target: scrollElemRef,
      isNoMore: (data) => data?.next === null
    }
  );

  const data = useMemo(() => {
    if (!scrollData?.list) return scrollData;
    return {
      ...scrollData,
      list: uniqBy(scrollData.list, 'pk')
    };
  }, [scrollData]);

  const isEmpty =
    !loading && data?.list?.length === 0 && localTempFiles.length === 0;

  const handleDeleteFile = async (id: string) => {
    if (!id) return;
    const res = await deleteBibliographyFile(id);
    if (res && data) {
      sendGA4Event('delete_bibliography');
      mutate({
        ...data,
        list: data.list?.filter((item) => item.pk !== id)
      });
      setLocalTempFiles((prev) => prev.filter((it) => it.pk !== id));
      return res;
    }
  };

  const handleUpdateBibliography = async (id: string, name: string) => {
    if (!id) return;
    const res = await updateBibliography(id, { name });
    if (res && data) {
      mutate({
        ...data,
        list: data.list?.map((item) => {
          if (item.pk === id) {
            return {
              ...item,
              name
            };
          }
          return item;
        })
      });
      setLocalTempFiles((prev) =>
        prev.map((it) => {
          if (it.pk === id) {
            return {
              ...it,
              name
            };
          }
          return it;
        })
      );
      return res;
    }
  };

  useEffect(() => {
    if (acceptedFiles?.length) {
      handleUploadFiles(Array.from(acceptedFiles));
    }
  }, [acceptedFiles]);

  useEffect(() => {
    if (fileRejections?.length > 20) {
      setSnackbarOpen(true);
    }
  }, [fileRejections?.length]);

  useEffect(() => {
    if (uploadedFileUpdatesWS?.pk) {
      if (data?.list?.find((it) => it.pk === uploadedFileUpdatesWS.pk)) {
        mutate({
          ...data,
          list: data.list?.map((it) => {
            if (it.pk === uploadedFileUpdatesWS.pk) {
              return {
                ...it,
                status: uploadedFileUpdatesWS.status
              };
            }
            return it;
          })
        });
        return;
      }

      setLocalTempFiles((prev) =>
        prev.map((file) => {
          if (file.pk === uploadedFileUpdatesWS.pk) {
            return {
              ...file,
              status: uploadedFileUpdatesWS.status
            };
          }
          return file;
        })
      );
    }
  }, [uploadedFileUpdatesWS?.pk]);

  const getUploadButton = (isContained?: boolean) => {
    return (
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <Button
          variant={isContained ? 'contained' : 'text'}
          sx={{ textTransform: 'none', maxHeight: 36 }}
          size={isContained ? 'large' : 'medium'}
          startIcon={
            <FileUploadOutlined fontSize={isContained ? 'small' : 'xsmall'} />
          }
        >
          Upload File
        </Button>
      </div>
    );
  };

  return (
    <Stack
      sx={{
        bgcolor: 'white',
        height: '100%',
        width: '60%',
        borderRadius: 4,
        p: '16px 24px 8px 24px',
        flex: 1
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
          <LeftPanelButtons />
          <Typography variant="body2" fontWeight={500}>
            Custom Bibliography
          </Typography>
        </Box>
        {!isEmpty && getUploadButton()}
      </Stack>

      <ContentWrapper
        isDragAccept={isDragAccept}
        showDragRejectInfo={showDragRejectInfo}
        dragRootProps={dragGetRootProps()}
        dragInputProps={dragGetInputProps()}
        isEmpty={isEmpty}
        localTempFiles={localTempFiles}
        dataList={data?.list || []}
        loading={loading}
        loadingMore={loadingMore}
        handleDeleteFile={handleDeleteFile}
        handleUpdateBibliography={handleUpdateBibliography}
        getUploadButton={getUploadButton}
        scrollElemRef={scrollElemRef}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => {
          setSnackbarOpen(false);
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        slotProps={{
          content: {
            sx: {
              boxShadow: 'none',
              borderRadius: '8px',
              backgroundColor: '#FEECEB'
            }
          }
        }}
        message={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FEECEB'
            }}
          >
            <ErrorOutlineRounded
              style={{
                color: '#F44336',
                fontSize: '22px',
                marginRight: 12
              }}
            />
            <div
              style={{
                fontSize: 14,
                lineHeight: '22px',
                marginRight: 28,
                color: '#621B16'
              }}
            >
              Upload failed – too many files. Try again with up to 20 at a time
            </div>
          </div>
        }
        action={
          <IconButton
            onClick={() => {
              setSnackbarOpen(false);
            }}
          >
            <CloseRounded style={{ color: '#621B16', fontSize: '20px' }} />
          </IconButton>
        }
      />
    </Stack>
  );
};

export default memo(Bibliography);
