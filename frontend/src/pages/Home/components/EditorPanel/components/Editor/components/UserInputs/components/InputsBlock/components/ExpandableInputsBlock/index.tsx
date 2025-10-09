import React, { useState } from 'react';
import { Typography, IconButton, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';

const COLLAPSED_MAX_HEIGHT = 82;
const EXPANDED_MAX_HEIGHT = 216;

const ExpandableUserInputBlockWrapper = styled('div')(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}));

const CollapseStyles = styled(Box)(() => ({
  overflowY: 'auto',
  scrollbarWidth: 'none'
}));

interface ExpandableCustomDataBlockProps {
  title: string;
  content: string;
}

const ExpandableInputsBlock = ({
  title,
  content
}: ExpandableCustomDataBlockProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <ExpandableUserInputBlockWrapper data-testid="expandableInputsBlock-wrapper">
        <Typography
          variant="body2"
          color="textSecondary"
          textTransform={'capitalize'}
          data-testid="expandableInputsBlock-title"
        >
          {title}
        </Typography>
        <IconButton
          onClick={handleExpandClick}
          aria-expanded={expanded}
          sx={{ padding: 4 }}
          aria-label="show more"
          data-testid="expandableInputsBlock-expandButton"
        >
          {expanded ? <UnfoldLessRounded /> : <UnfoldMoreRounded />}
        </IconButton>
      </ExpandableUserInputBlockWrapper>
      <CollapseStyles
        data-testid="expandableInputsBlock-contentWrapper"
        sx={{
          maxHeight: expanded ? EXPANDED_MAX_HEIGHT : COLLAPSED_MAX_HEIGHT
        }}
      >
        <Typography variant="body2">{content}</Typography>
      </CollapseStyles>
    </>
  );
};

export default ExpandableInputsBlock;
