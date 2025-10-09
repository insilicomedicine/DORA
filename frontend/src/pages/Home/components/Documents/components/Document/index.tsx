import React, { memo, MouseEvent, useState } from 'react';
import { Box, CardContent, Typography, Stack, CardHeader } from '@mui/material';
import Grid from '@mui/material/Grid';
import { templateIcons } from 'utils/templates';
import { AddRounded } from '@mui/icons-material';
import Menu from 'pages/Home/components/LeftPanel/components/Menu';

import { DocumentItem } from 'types/document';
import { convertToKey, formatDateWithNewRule } from 'utils/utils';
import { sendGA4Event } from 'utils/ga';
import { Link, useNavigate } from 'react-router';
import { useDocumentStore } from 'contexts/documentsStore';

import documentStatusIcon from './components/DocumentStatusIcon';

interface UserDocumentProps extends Partial<DocumentItem> {}

const UserDocument = ({
  id = '',
  template_type = '',
  template_name = '',
  title = '',
  stage = 'section_generated',
  status = 'in_progress',
  created_at = '',
  isNew = false
}: UserDocumentProps) => {
  const navigate = useNavigate();
  const { setDocumentDetailData } = useDocumentStore();
  const [isActivated, setIsActivated] = useState(false);
  const isDraft = stage === 'draft';
  const isPolishing = stage === 'polishing';
  const isContentGenerating = stage === 'content_generating';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isInProgress = status === 'in_progress';

  const PaperStatus =
    (isPolishing && isCompleted) || isDraft
      ? documentStatusIcon[stage]
      : documentStatusIcon[status];

  const shouldShowStatus =
    isDraft || isPolishing || isContentGenerating || isFailed;

  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 3 }}>
        {isNew ? (
          <Stack
            onClick={() => {
              sendGA4Event('new_document');
              navigate('/templates');
            }}
            direction="row"
            sx={{
              minWidth: 160,
              height: 168,
              justifyContent: 'center',
              bgcolor: '#E5F6ED',
              borderRadius: 6,
              boxShadow: 'none',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#C4E9D5'
              }
            }}
          >
            <Typography
              variant="body2"
              color="primary.main"
              fontWeight={500}
              display="flex"
              alignItems="center"
              gap={0.5}
            >
              <AddRounded fontSize="small" /> New Document
            </Typography>
          </Stack>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              padding: '20px 24px',
              boxShadow: 'none',
              borderRadius: 6,
              ...(!isFailed && {
                cursor: 'pointer'
              }),
              height: 168,
              border: '1px solid',
              ...(isActivated
                ? {
                    backgroundColor: '#F2F2F2',
                    borderColor: '#F2F2F2'
                  }
                : {
                    backgroundColor: 'common.white',
                    borderColor: 'grey.50',
                    '& .MuiButtonBase-root': {
                      zIndex: -1
                    }
                  }),
              '& .documentIcon': {
                display: 'block',
                width: 24,
                height: 24,
                lineHeight: '24px',
                textAlign: 'center',
                borderRadius: '7px',
                fontSize: 14,
                backgroundColor: 'grey.50'
              },

              '&:hover': {
                backgroundColor: '#F2F2F2',
                borderColor: '#F2F2F2',
                '& .MuiButtonBase-root': {
                  zIndex: 1
                }
              }
            }}
            component={Link}
            to={
              isFailed
                ? '#'
                : isDraft
                  ? `/documents/generation/${id}`
                  : `/documents/${id}`
            }
            onClick={() => setDocumentDetailData({ isDocumentLoading: true })}
          >
            <CardHeader
              sx={{ p: 0 }}
              action={
                <div onClick={(e: MouseEvent) => e.stopPropagation()}>
                  <Menu
                    target={{ id, status, stage, title }}
                    hanleMenuClick={(activated) => setIsActivated(activated)}
                  />
                </div>
              }
              title={
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                  <span className="documentIcon">
                    {templateIcons[convertToKey(template_type)]?.icon}
                  </span>
                  <Typography
                    color="text.secondary"
                    variant="caption"
                    letterSpacing={0}
                  >
                    {template_name}
                  </Typography>
                </Stack>
              }
            />
            <CardContent sx={{ p: 0, mt: 1 }}>
              <Typography
                variant="body2"
                color="#000"
                sx={{
                  '@keyframes blink': {
                    from: {
                      opacity: 0.4
                    },
                    to: {
                      opacity: 1
                    }
                  },
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                  ...(isInProgress && {
                    animation: 'blink 0.5s ease-out 600ms infinite alternate'
                  })
                }}
              >
                {isInProgress ? 'Generating...' : title}
              </Typography>
            </CardContent>
            <Stack
              direction="row"
              sx={{ mt: 'auto', justifyContent: 'space-between' }}
            >
              <Typography color="text.secondary" variant="caption">
                {formatDateWithNewRule(created_at)}
              </Typography>
              <span>{shouldShowStatus && PaperStatus && PaperStatus()}</span>
            </Stack>
          </Box>
        )}
      </Grid>
    </>
  );
};

export default memo(UserDocument);
