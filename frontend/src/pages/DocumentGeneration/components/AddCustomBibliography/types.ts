import { FileWithPath } from 'react-dropzone';
import { FileUploadStatuses } from 'types/file';

export interface CustomFile extends FileWithPath {
  pk: string | number;
  status: FileUploadStatuses | string;
  created_at: string;
  updated_at: string;
}
