import React from 'react';
import {
  TableHead as MuiTableHead,
  TableRow,
  TableCell,
  Checkbox,
  TableSortLabel,
  Box
} from '@mui/material';
import { Column } from '../../types';

interface TableHeadProps {
  columns: Column[];
  orderBy: string;
  order: 'asc' | 'desc';
  handleSort: (property: string) => void;
  isPageSelected: boolean;
  handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasSelectedItems: boolean;
}

const TableHead = ({
  columns,
  orderBy,
  order,
  handleSort,
  isPageSelected,
  handleSelectAllClick,
  hasSelectedItems
}: TableHeadProps) => {
  return (
    <MuiTableHead
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#FFFFFF'
      }}
    >
      <TableRow
        sx={{
          backgroundColor: '#FFFFFF',
          '& th': {
            fontWeight: 500,
            fontSize: 12,
            lineHeight: 1.37,
            color: '#212121',
            p: 0,
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            top: 0
          }
        }}
      >
        <TableCell>
          <Checkbox
            size="small"
            indeterminate={hasSelectedItems && !isPageSelected}
            checked={isPageSelected}
            onChange={handleSelectAllClick}
            slotProps={{ input: { 'aria-label': 'select all files' } }}
            sx={{
              padding: 1,
              color: 'grey.600'
            }}
          />
        </TableCell>
        {columns.map((column) => (
          <TableCell key={column.id}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {column.sortable ? (
                <TableSortLabel
                  active={orderBy === column.id}
                  direction={orderBy === column.id ? order : 'asc'}
                  onClick={() => handleSort(column.id)}
                  sx={{
                    '&:hover': {
                      color: 'text.primary',
                      opacity: 1,
                      '& .MuiTableSortLabel-icon': {
                        opacity: 1
                      }
                    },
                    '& .MuiTableSortLabel-icon': {
                      color: 'grey.600',
                      ml: 1,
                      '&:hover': {
                        color: 'primary.main'
                      }
                    }
                  }}
                >
                  {column.label}
                </TableSortLabel>
              ) : (
                column.label
              )}
            </Box>
          </TableCell>
        ))}
      </TableRow>
    </MuiTableHead>
  );
};

export default TableHead;
