import React, { HTMLAttributes, memo, useState } from 'react';
import {
  Box,
  Popover,
  Tooltip,
  Typography,
  TextField,
  IconButton,
  Stack
} from '@mui/material';
import {
  ThumbDownAltRounded,
  ThumbDownOffAltRounded,
  ThumbUpAlt,
  ThumbUpOffAlt
} from '@mui/icons-material';
import { useDocumentStore } from 'contexts/documentsStore';
import { feedback } from 'services/documents';
import { sendGA4Event } from 'utils/ga';
import { FeedbackButton } from './StyledComponents';

interface FeedbackProps extends HTMLAttributes<HTMLDivElement> {
  setcionId?: string;
}

const Feedback = ({ setcionId }: FeedbackProps) => {
  const { documentData } = useDocumentStore();

  const initEnableFeedback =
    (documentData?.like === null || !!setcionId) &&
    documentData?.stage !== 'polishing';

  const [activeKey, setActiveKey] = useState('');
  const [feedbackDetail, setFeedbackDetail] = useState('');
  const [feedbackPopoverAnchorEl, setFeedbackPopoverAnchorEl] =
    useState<null | HTMLElement>(null);
  const isFeedbackPopoverOpen = Boolean(feedbackPopoverAnchorEl);

  const handleGAEvent = (hasDetail = false) => {
    sendGA4Event('submit_feedback', {
      like: activeKey === 'like',
      has_detail: hasDetail,
      position: setcionId ? 'editor_main' : 'editor_tool_bar'
    });
  };

  const handleFeedBack = async (e, key) => {
    const { currentTarget } = e;
    const response = await feedback({
      document_id: documentData?.id,
      ...{ ...(setcionId ? { section_id: setcionId } : {}) },
      like: key === 'like'
    });
    if (!response) return;
    setActiveKey(key);
    setFeedbackPopoverAnchorEl(currentTarget);
  };

  const buttons = [
    {
      icon: (isActive, props) =>
        isActive ? <ThumbUpAlt {...props} /> : <ThumbUpOffAlt {...props} />,
      key: 'like'
    },
    {
      icon: (isActive, props) =>
        isActive ? (
          <ThumbDownAltRounded {...props} />
        ) : (
          <ThumbDownOffAltRounded {...props} />
        ),
      key: 'dislike',
      message: 'What should be improved? (Optional)'
    }
  ];

  if (!initEnableFeedback) {
    return null;
  }

  //detect the space between the feedback button and the bottom of the window
  const offsetTop = feedbackPopoverAnchorEl?.getBoundingClientRect().top || 0;
  const bottomSapce = window.innerHeight - offsetTop;
  const isShowOnTop = bottomSapce < 200;

  return (
    <Box sx={{ pointerEvents: 'auto' }}>
      <Stack direction="row" sx={{ gap: 0.5, pr: 0.5 }}>
        {buttons.map((button) => {
          const { icon, key } = button;
          const isActive = key === activeKey;
          return (
            <Tooltip
              title={`Share feedback on ${setcionId ? 'section' : 'document'}`}
              placement="top"
              key={key}
              sx={{
                '& .MuiTooltip-popper': {
                  maxHeight: 37
                }
              }}
            >
              <IconButton
                data-testid={`feedback-IconButton-${key}`}
                onClick={(e) => handleFeedBack(e, key)}
                sx={{
                  p: 0.25,
                  color: isActive ? '#21965F' : '#757575',
                  '& .MuiSvgIcon-root': {
                    fontSize: 17
                  }
                }}
              >
                {icon(isActive, {})}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>
      {isFeedbackPopoverOpen && (
        <Popover
          open={isFeedbackPopoverOpen}
          anchorEl={feedbackPopoverAnchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
          onClose={() => {
            setFeedbackPopoverAnchorEl(null);
            handleGAEvent();
          }}
          sx={{
            '& .MuiPopover-paper': {
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 16px 16px 20px',
              minWidth: 344,
              maxHeight: 400,
              borderRadius: 2,
              boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
              marginTop: `${10 - (isShowOnTop ? bottomSapce : 0)}px`
            }
          }}
        >
          <Typography fontSize={14} fontWeight={500}>
            Thanks for your feedback!
          </Typography>
          <TextField
            placeholder={
              activeKey === 'dislike'
                ? 'What should be improved? (Optional)'
                : 'Tell us more (Optional)'
            }
            variant="outlined"
            multiline
            maxRows={10}
            onChange={(e) => setFeedbackDetail(e.target.value)}
            sx={{
              p: '16px 0',
              minWidth: 308,
              '& .MuiOutlinedInput-root.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3A3A3A'
                }
              }
            }}
            slotProps={{
              input: {
                sx: {
                  borderRadius: 2,
                  p: '0 1px 0 16px',
                  textarea: {
                    p: '8px 16px 8px 0',
                    overflowY: 'auto',
                    minHeight: 24,
                    '&::placeholder': {
                      fontSize: 14
                    }
                  }
                }
              }
            }}
          />
          <Stack
            direction="row"
            sx={{ display: 'flex', justifyContent: 'end' }}
          >
            <FeedbackButton
              variant="text"
              onClick={() => {
                setFeedbackPopoverAnchorEl(null);
                handleGAEvent();
              }}
              data-testid={`feedback-buttonSkip`}
            >
              Skip
            </FeedbackButton>
            <FeedbackButton
              variant="text"
              onClick={async () => {
                await feedback({
                  document_id: documentData?.id,
                  ...{ ...(setcionId ? { section_id: setcionId } : {}) },
                  detail: feedbackDetail
                });
                handleGAEvent(!!feedbackDetail);
                setTimeout(() => {
                  setFeedbackPopoverAnchorEl(null);
                }, 1000);
              }}
              disabled={!feedbackDetail.trim()}
            >
              Submit
            </FeedbackButton>
          </Stack>
        </Popover>
      )}
    </Box>
  );
};

export default memo(Feedback);
