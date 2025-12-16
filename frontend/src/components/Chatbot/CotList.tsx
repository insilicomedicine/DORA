import { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ChatCot } from './types';
import Stack from '@mui/material/Stack';
import CheckRounded from '@mui/icons-material/CheckRounded';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import Paper from '@mui/material/Paper';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  list: ChatCot[];
};

const CotList = memo(function CotList({ list }: Props) {
  if (!list?.length) {
    return (
      <Box sx={{ mb: 0.5 }}>
        <Paper
          variant="outlined"
          sx={{
            borderStyle: 'dashed',
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: 'action.hover'
          }}
        >
          <Stack
            spacing={1}
            alignItems="center"
            justifyContent="center"
            minHeight={280}
          >
            <InboxOutlined color="disabled" sx={{ fontSize: 40 }} />
            <Typography color="text.secondary" variant="body2">
              No CoT steps found
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 0.5 }}>
      {list.map((item, idx) => (
        <Stack key={idx} direction="row" spacing={1}>
          <CheckRounded
            htmlColor="primary"
            sx={{
              p: 0.5,
              visibility: idx !== 0 ? 'visible' : 'hidden'
            }}
          />

          <Box key={idx} sx={{ mb: idx < list.length - 1 ? 2 : 0 }}>
            {item.title && (
              <Typography fontWeight={500}>{item.title}</Typography>
            )}
            {item.content && (
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <Typography
                      variant="body1"
                      {...props}
                      color="text.secondary"
                    />
                  )
                }}
                remarkPlugins={[remarkGfm]}
              >
                {item.content}
              </ReactMarkdown>
            )}
          </Box>
        </Stack>
      ))}
    </Box>
  );
});

export default CotList;
