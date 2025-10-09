import React from 'react';
import { Typography, Tooltip, Box } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { ReadabilityMetrics } from 'types/document';
import MetricItem from '../MetricItem';

interface ReadabilityCategoryMetricsProps {
  metricsData: ReadabilityMetrics;
  title: string;
}

const ReadabilityCategoryMetrics = ({
  metricsData,
  title
}: ReadabilityCategoryMetricsProps) => {
  if (!metricsData) return null;

  const { flesch_kincaid_grade } = metricsData;

  const tooltipText =
    'The Flesch-Kincaid Grade Level indicates the education level needed to understand the text, based on sentence and word complexity. \n A score of 8 ensures general readability, while 12+ is suited for academic or professional audiences.';

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1
        }}
      >
        <Typography variant="body2">{title}</Typography>
        <Tooltip
          title={tooltipText}
          disableFocusListener
          placement="top"
          slotProps={{
            popper: {
              sx: {
                width: 390
              }
            }
          }}
        >
          <InfoOutlined fontSize="small" />
        </Tooltip>
      </Box>
      <MetricItem label="Flesch Reading Ease" value={flesch_kincaid_grade} />
    </>
  );
};

export default ReadabilityCategoryMetrics;
