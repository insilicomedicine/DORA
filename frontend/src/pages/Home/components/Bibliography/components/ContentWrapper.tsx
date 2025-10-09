import { memo } from 'react';
import { CloudUploadRounded, ErrorOutlineRounded } from '@mui/icons-material';
import FileList from './FileList';
import {
  Content,
  ContentDragAccept,
  ContentDragReject,
  DragInfo,
  DragFailInfo
} from '../StyledComponents';
import { UploadedFileItemType } from 'types/bibliography';

interface ContentWrapperProps {
  isDragAccept: boolean;
  showDragRejectInfo: boolean;
  dragRootProps: any;
  dragInputProps: any;
  isEmpty: boolean;
  localTempFiles: UploadedFileItemType[];
  dataList: UploadedFileItemType[];
  loading: boolean;
  loadingMore: boolean;
  handleDeleteFile: (id: string) => Promise<any>;
  handleUpdateBibliography: (id: string, name: string) => Promise<any>;
  getUploadButton: (isContained?: boolean) => React.ReactElement;
  scrollElemRef: React.RefObject<HTMLUListElement | null>;
}

const ContentWrapper = ({
  isDragAccept,
  showDragRejectInfo,
  dragRootProps,
  dragInputProps,
  isEmpty,
  localTempFiles,
  dataList,
  loading,
  loadingMore,
  handleDeleteFile,
  handleUpdateBibliography,
  getUploadButton,
  scrollElemRef
}: ContentWrapperProps) => {
  const renderDragInfo = () => (
    <DragInfo>
      <CloudUploadRounded style={{ color: '#FFFFFF' }} />
      <p>Drop PDF files here (up to 20MB each)</p>
      <p>You can upload up to 20 files at once</p>
    </DragInfo>
  );

  const renderDragFailInfo = () => (
    <DragFailInfo>
      <ErrorOutlineRounded style={{ color: '#FFFFFF', marginBottom: '12px' }} />
      <p>Too many files at once!</p>
      <p>You can upload up to 20 files in a single batch. </p>
    </DragFailInfo>
  );

  const fileListProps = {
    isEmpty,
    localTempFiles,
    dataList,
    loading,
    loadingMore,
    handleDeleteFile,
    handleUpdateBibliography,
    getUploadButton
  };

  if (isDragAccept) {
    return (
      <ContentDragAccept
        sx={{ transition: 'all 200ms ease-out' }}
        {...dragRootProps}
      >
        <input {...dragInputProps} />
        <FileList {...fileListProps} ref={scrollElemRef} isDragReject={false} />
        {renderDragInfo()}
      </ContentDragAccept>
    );
  }

  if (showDragRejectInfo) {
    return (
      <ContentDragReject
        sx={{ transition: 'all 200ms ease-out' }}
        {...dragRootProps}
      >
        <input {...dragInputProps} />
        <FileList {...fileListProps} ref={scrollElemRef} isDragReject={true} />
        {renderDragFailInfo()}
      </ContentDragReject>
    );
  }

  return (
    <Content sx={{ transition: 'all 200ms ease-out' }} {...dragRootProps}>
      <input {...dragInputProps} />
      <FileList {...fileListProps} ref={scrollElemRef} isDragReject={false} />
    </Content>
  );
};

export default memo(ContentWrapper);
