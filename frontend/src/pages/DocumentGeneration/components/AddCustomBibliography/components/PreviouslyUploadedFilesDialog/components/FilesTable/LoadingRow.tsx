import React from 'react';
import { TableRow, TableCell, CircularProgress } from '@mui/material';

const LoadingRow = () => {
  return (
    <TableRow>
      <TableCell colSpan={3} align="center" sx={{ padding: 2 }}>
        <CircularProgress size={24} />
      </TableCell>
    </TableRow>
  );
};

export default LoadingRow;
