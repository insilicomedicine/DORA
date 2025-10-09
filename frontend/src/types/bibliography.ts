import { Metadata } from './document';
export interface PublicationsViewModel extends Metadata {
  abstractChunks?: [];
  isNew?: boolean;
  showWithLink?: boolean;
  isCustomLink?: boolean;
}
export interface TextEvidencesChunkItemProps extends PublicationsViewModel {
  object_id?: string;
  chunks: any;
}

export type FileUploadStatusType =
  | 'beforeUpload'
  | 'uploaded'
  | 'uploading'
  | 'processed'
  | 'failed';

export type UploadedFileItemType = {
  pk: string;
  name: string;
  status: FileUploadStatusType;
  created_at: string;
  updated_at: string;
};

export type BibliographyFilesResType = {
  next: string | null;
  previous: string | null;
  results: UploadedFileItemType[];
};
