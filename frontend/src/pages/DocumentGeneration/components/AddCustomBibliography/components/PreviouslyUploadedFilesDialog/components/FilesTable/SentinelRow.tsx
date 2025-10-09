import React from 'react';
import { TableRow, TableCell } from '@mui/material';

interface SentinelRowProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
}

const SentinelRow = ({ targetRef }: SentinelRowProps) => {
  return (
    <TableRow>
      <TableCell colSpan={3} padding="none" sx={{ height: 20, border: 0 }}>
        <div ref={targetRef} style={{ height: '20px', width: '100%' }} />
      </TableCell>
    </TableRow>
  );
};

export default SentinelRow;
