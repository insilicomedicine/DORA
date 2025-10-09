import { memo } from 'react';
import { Stack, CircularProgress } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { formatDateWithNewRule } from 'utils/utils';
import { openFilePreview } from 'services/files';
import Menu from './Menu';
import {
  CustomListItem,
  ListItemGrey,
  ColName,
  ColUploaded,
  ColActions,
  Name
} from '../StyledComponents';
import { FileUploadStatusType } from 'types/bibliography';

interface FileItemProps {
  name: string;
  pk: string;
  status: FileUploadStatusType;
  created_at: string;
  handleDeleteFile: (id: string) => Promise<any>;
  handleUpdateBibliography: (id: string, name: string) => Promise<any>;
  isDragReject: boolean;
}

const FileItem = ({
  name,
  pk,
  status,
  created_at,
  handleDeleteFile,
  handleUpdateBibliography,
  isDragReject
}: FileItemProps) => {
  const processedFile = status === 'processed';
  const failedFile = status === 'failed';

  const ItemComponent = processedFile ? CustomListItem : ListItemGrey;

  const renderFailedIndicator = () =>
    failedFile && (
      <div
        style={{
          color: '#AB2F26',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        Failed
        <InfoOutlined fontSize={'small'} style={{ marginLeft: '8px' }} />
      </div>
    );

  const renderUploadedDate = () => {
    if (processedFile || failedFile) {
      return formatDateWithNewRule(created_at);
    }
    return <CircularProgress size={14} />;
  };

  return (
    <ItemComponent key={pk}>
      <Stack
        component={ColName}
        direction={'row'}
        onClick={() => {
          if (processedFile) {
            openFilePreview(pk);
          }
        }}
      >
        <Name>{name}</Name>
        {renderFailedIndicator()}
      </Stack>
      <ColUploaded>{renderUploadedDate()}</ColUploaded>
      <ColActions>
        <Menu
          target={{
            id: pk,
            title: name,
            status:
              status === 'processed'
                ? 'processed'
                : status === 'failed'
                  ? 'failed'
                  : 'processing'
          }}
          handleDeleteFile={handleDeleteFile}
          handleRenameFile={handleUpdateBibliography}
          deleteDisabled={status === 'beforeUpload'}
          isDragReject={isDragReject}
        />
      </ColActions>
    </ItemComponent>
  );
};

export default memo(FileItem);
