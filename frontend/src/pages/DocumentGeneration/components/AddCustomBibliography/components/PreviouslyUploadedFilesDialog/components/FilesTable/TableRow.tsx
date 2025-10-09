import React from 'react';
import { TableRow as MuiTableRow, TableCell, Checkbox } from '@mui/material';
import { prepareDate } from 'utils/prepareDate';
import { BibliographyFile } from '../../types';

interface FileRowProps {
  row: BibliographyFile;
  index: number;
  isSelected: boolean;
  isPreviouslyAdded: boolean;
  onRowClick: (index: number) => void;
}

const FileRow = ({
  row,
  index,
  isSelected,
  isPreviouslyAdded,
  onRowClick
}: FileRowProps) => {
  return (
    <MuiTableRow
      hover={!isPreviouslyAdded}
      onClick={() => !isPreviouslyAdded && onRowClick(index)}
      role="checkbox"
      aria-checked={isSelected}
      selected={isSelected}
      sx={{
        '&.MuiTableRow-hover:hover': {
          backgroundColor: 'grey.50'
        },
        '&:last-child td, &:last-child th': {
          border: 0
        },
        '& td': {
          padding: '4px 24px 4px 4px',
          borderBottom: '1px solid #F2F2F2',
          '&:first-of-type': {
            px: 0
          }
        },
        cursor: 'pointer',
        '&.MuiTableRow-root.Mui-selected': {
          backgroundColor: 'transparent',
          '&.MuiTableRow-hover:hover': {
            backgroundColor: 'grey.50'
          }
        },
        ...(isPreviouslyAdded && {
          opacity: 0.7,
          cursor: 'default'
        })
      }}
    >
      <TableCell>
        <Checkbox
          size="small"
          checked={isSelected}
          disabled={isPreviouslyAdded}
          slotProps={{
            input: {
              'aria-labelledby': `file-${row.pk}`,
              id: `checkbox-${row.pk}`
            }
          }}
          sx={{
            padding: 1,
            color: 'grey.600'
          }}
        />
      </TableCell>
      <TableCell id={`file-${row.pk}`}>{row.name || row.filename}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 160 }}>
        {prepareDate(row.created_at, 'today')}
      </TableCell>
    </MuiTableRow>
  );
};

export default FileRow;
