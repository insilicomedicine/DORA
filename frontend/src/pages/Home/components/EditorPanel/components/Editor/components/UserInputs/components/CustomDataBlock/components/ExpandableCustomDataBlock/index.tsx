import React, { useState } from 'react';
import { Typography, IconButton, Collapse, Box } from '@mui/material';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';

interface ExpandableCustomDataBlockProps {
  title: string;
  content: string;
}

const ExpandableCustomDataBlock = ({
  title,
  content
}: ExpandableCustomDataBlockProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography
          variant="body2"
          fontWeight={500}
          textTransform={'capitalize'}
          data-testid="expandableCustomDataBlock-title"
        >
          {title}
        </Typography>
        <IconButton
          data-testid="expandableCustomDataBlock-expandButton"
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
          sx={{ p: 0.5 }}
        >
          {expanded ? (
            <UnfoldLessRounded data-testid="expandableCustomDataBlock-unfoldLessRoundedIcon" />
          ) : (
            <UnfoldMoreRounded data-testid="expandableCustomDataBlock-unfoldMoreRoundedIcon" />
          )}
        </IconButton>
      </Box>
      <Collapse
        in={expanded}
        timeout="auto"
        unmountOnExit
        sx={{
          maxHeight: 150,
          overflowY: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        <Typography
          variant="body2"
          data-testid="expandableCustomDataBlock-contentText"
        >
          {content}
        </Typography>
      </Collapse>
    </>
  );
};

export default ExpandableCustomDataBlock;
