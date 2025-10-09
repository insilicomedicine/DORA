import React, { memo } from 'react';
import { Button } from '@mui/material';

interface BibliographyFileItemProps {
  fileName: string;
  handleClick: () => void;
}

const BibliographyFileItem = ({
  fileName,
  handleClick
}: BibliographyFileItemProps) => {
  return (
    <Button
      onClick={handleClick}
      sx={{
        width: 'calc(100% - 8px)',
        display: 'flex',
        justifyContent: 'flex-start',
        color: 'text.primary',
        pl: 1.5,
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '145%',
        letterSpacing: '0.15px',
        borderRadius: '12px',
        textTransform: 'none',
        minHeight: 36,
        textAlign: 'left',
        '&:hover': {
          backgroundColor: '#F5F5F5',
          borderRadius: '12px'
        }
      }}
    >
      {fileName}
    </Button>
  );
};

export default memo(BibliographyFileItem);
