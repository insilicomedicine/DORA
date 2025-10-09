import { memo, forwardRef } from 'react';
import { List, CircularProgress } from '@mui/material';
import FileItem from './FileItem';
import FileListHeader from './FileListHeader';
import NoData from '../../Documents/components/NoData';
import { ListWrapper } from '../StyledComponents';
import { UploadedFileItemType } from 'types/bibliography';

interface FileListProps {
  isEmpty: boolean;
  localTempFiles: UploadedFileItemType[];
  dataList: UploadedFileItemType[];
  loading: boolean;
  loadingMore: boolean;
  handleDeleteFile: (id: string) => Promise<any>;
  handleUpdateBibliography: (id: string, name: string) => Promise<any>;
  isDragReject: boolean;
  getUploadButton: (isContained?: boolean) => React.ReactElement;
}

const FileList = forwardRef<HTMLUListElement, FileListProps>(
  (
    {
      isEmpty,
      localTempFiles,
      dataList,
      loading,
      loadingMore,
      handleDeleteFile,
      handleUpdateBibliography,
      isDragReject,
      getUploadButton
    },
    ref
  ) => {
    return (
      <ListWrapper ref={ref}>
        {!isEmpty && <FileListHeader />}

        {isEmpty ? (
          <NoData
            title="No files uploaded yet"
            description="Drag and drop files here, or select files from your computer"
            style={{
              background: '#f8f8f8',
              border: '1px solid #f2f2f2',
              marginTop: 0
            }}
            Actions={getUploadButton(true)}
          />
        ) : (
          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              paddingTop: 0,
              scrollbarWidth: 'thin',
              scrollbarGutter: 'stable'
            }}
          >
            {[...localTempFiles, ...dataList].map(
              ({ name, pk, status, created_at }) => (
                <FileItem
                  key={pk}
                  name={name}
                  pk={pk}
                  status={status}
                  created_at={created_at}
                  handleDeleteFile={handleDeleteFile}
                  handleUpdateBibliography={handleUpdateBibliography}
                  isDragReject={isDragReject}
                />
              )
            )}
            {(loadingMore || loading) && (
              <div
                style={{
                  height: '100px',
                  textAlign: 'center',
                  padding: '14px 0'
                }}
              >
                <CircularProgress size={24} />
              </div>
            )}
          </List>
        )}
      </ListWrapper>
    );
  }
);

export default memo(FileList);
