import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { LanguageMetrics } from 'types/document';
import MetricItem from '../MetricItem';

interface LanguageCategoryMetricsProps {
  metricsData: LanguageMetrics;
  title: string;
}

const LanguageCategoryMetrics = ({
  metricsData,
  title
}: LanguageCategoryMetricsProps) => {
  const tooltipText = Object.keys(
    metricsData.section_word_character_counts
  ).map((section) => {
    return `${section}: ${metricsData.section_word_character_counts[section]?.[1]} words, ${metricsData.section_word_character_counts[section]?.[0]} characters. \n`;
  });

  const showInfoIcon =
    Object.keys(metricsData.section_word_character_counts).length > 1;

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
        <Typography variant="body2" fontWeight={500}>
          {title}
        </Typography>
        {showInfoIcon && (
          <Tooltip
            disableFocusListener={true}
            placement="top"
            title={tooltipText}
          >
            <InfoOutlined sx={{ fontSize: 20 }} />
          </Tooltip>
        )}
      </Box>
      <MetricItem
        label="Total word count"
        value={metricsData.total_word_count}
      />
      <MetricItem
        label="Total character count"
        value={metricsData.total_character_count}
      />
      <MetricItem
        label="Reading time"
        value={Math.round(metricsData.reading_time_minutes)}
        unit="minutes"
      />
    </>
  );
};

export default LanguageCategoryMetrics;
