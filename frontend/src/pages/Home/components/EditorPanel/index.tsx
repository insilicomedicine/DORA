import React, { Suspense } from 'react';
import { useDocumentStore } from 'contexts/documentsStore';
import PageSkeleton from 'components/PageSkeleton';
import { Box } from '@mui/material';
import Editor from './components/Editor';

const EditorPanel = () => {
  const { isDocumentLoading = true } = useDocumentStore();

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 480,
        position: 'relative',
        height: '100%',
        overflowY: 'auto',
        transition: 'all 200ms ease-out',
        scrollbarWidth: 'none',
        scrollbarGutter: 'stable',
        '&::-webkit-scrollbar': {
          display: 'none'
        }
      }}
    >
      <Suspense>
        {isDocumentLoading ? (
          <PageSkeleton />
        ) : (
          <Box
            sx={{
              height: '100%',
              backgroundColor: 'common.white',
              borderRadius: 4,
              overflow: 'hidden',
              userSelect: 'text'
            }}
          >
            <Editor />
          </Box>
        )}
      </Suspense>
    </Box>
  );
};

export default EditorPanel;
