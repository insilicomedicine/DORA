import React, { useState, memo } from 'react';
import { Typography, Divider, IconButton, Stack, Box } from '@mui/material';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';

const VISIBLE_ITEMS_THRESHOLD = 3;
const CONTENT_HEIGHT = {
  EXPANDED: 452,
  COLLAPSED: 184
} as const;

interface UserInputBlockProps {
  title: string;
  content: string[];
}

const CustomBibliographyBlock = ({
  title,
  content = []
}: UserInputBlockProps) => {
  const [expanded, setExpanded] = useState(false);
  const showExpandButton = content?.length > VISIBLE_ITEMS_THRESHOLD;

  return (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography
          fontWeight={500}
          textTransform="capitalize"
          data-testid="customBibliographyBlock-title"
        >
          {title}
        </Typography>
        {showExpandButton && (
          <IconButton
            data-testid="customBibliographyBlock-expandButton"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Show less' : 'Show more'}
            sx={{ p: 0.5 }}
          >
            {expanded ? <UnfoldLessRounded /> : <UnfoldMoreRounded />}
          </IconButton>
        )}
      </Stack>

      <Stack
        spacing={1}
        sx={{
          bgcolor: '#F5F5F5',
          p: '8px 16px',
          borderRadius: 2,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          transition: 'max-height 0.3s ease-in-out',
          maxHeight: expanded
            ? CONTENT_HEIGHT.EXPANDED
            : CONTENT_HEIGHT.COLLAPSED,
          '&::-webkit-scrollbar': { display: 'none' }
        }}
        data-testid="customBibliographyBlock-contentWrapper"
      >
        {content?.map((item, index) => (
          <Box key={`bibliography-item-${index}`}>
            <Typography variant="body2" lineHeight={1.45}>
              {item}
            </Typography>
            <Divider sx={{ bgcolor: '#E0E0E0', mt: 1 }} />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
};

export default memo(CustomBibliographyBlock);
