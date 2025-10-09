import { CustomFile } from '../../types';

export interface BibliographyFile extends CustomFile {
  filename?: string;
  [key: string]: any;
}

export interface Column {
  id: string;
  label: string;
  sortable: boolean;
}
