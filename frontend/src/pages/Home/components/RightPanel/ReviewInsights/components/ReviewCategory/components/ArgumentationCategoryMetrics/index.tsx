import React, { memo } from 'react';
import { Typography, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import MetricItem from '../MetricItem';
import { ArgumentationMetrics } from 'types/document';
import { theme } from 'theme';
import { Stack } from '@mui/system';

interface ArgumentationCategoryMetricsProps {
  metricsData: ArgumentationMetrics;
  title: string;
}

const ArgumentationCategoryMetrics = ({
  metricsData,
  title
}: ArgumentationCategoryMetricsProps) => {
  const xAxisData = Object.keys(metricsData.publication_year_distribution);
  const seriesData = Object.values(metricsData.publication_year_distribution);

  const conditionToShowGraph =
    metricsData.unique_references > 3 &&
    !!Object.keys(metricsData.publication_year_distribution).length;
  const tooltipText =
    'Counts only the cited publications in the Bibliography that have associated article metadata, such as title, authors, and publication year';

  return (
    <>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <MetricItem
        label="Total references"
        value={metricsData.total_references}
      />
      <MetricItem
        label="Unique references"
        value={metricsData.unique_references}
      />
      {conditionToShowGraph && (
        <>
          <Stack
            sx={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              my: 1
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              References by year:
            </Typography>
            <Tooltip
              disableFocusListener={true}
              placement="bottom"
              title={tooltipText}
              sx={{ width: 420 }}
            >
              <InfoOutlined sx={{ fontSize: 20 }} />
            </Tooltip>
          </Stack>
          <BarChart
            height={270}
            series={[
              {
                data: seriesData,
                color: theme.palette.primary.main,
                valueFormatter: (value, context) => {
                  if (context.dataIndex !== undefined) {
                    const year = xAxisData[context.dataIndex];
                    return `${year}: ${value}`;
                  }
                  return `${value}`;
                }
              }
            ]}
            xAxis={[
              {
                data: xAxisData,
                scaleType: 'band',
                categoryGapRatio: 0.55,
                tickSize: 15,
                tickLabelInterval: () => true,
                height: 48,
                tickPlacement: 'middle',
                tickLabelStyle: {
                  angle: -90
                }
              }
            ]}
            yAxis={[{ position: 'none' }]}
            grid={{ horizontal: true }}
            borderRadius={3}
            margin={{ top: 20, right: 10, bottom: 0, left: 10 }}
            axisHighlight={{
              x: 'none',
              y: 'none'
            }}
            slotProps={{
              tooltip: {
                trigger: 'item',
                placement: 'top',
                sx: {
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  position: 'relative',
                  '&> div': {
                    border: 'none',
                    '& *': {
                      fontSize: 12,
                      fontWeight: 700
                    }
                  },
                  '& .MuiChartsTooltip-mark': {
                    display: 'none'
                  },
                  '& .MuiChartsTooltip-labelCell': {
                    display: 'none'
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    marginLeft: '-5px',
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '5px 5px 0 5px',
                    borderColor: 'white transparent transparent transparent'
                  }
                }
              }
            }}
            sx={{
              '.MuiChartsAxis-tickLabel': {
                textAnchor: 'end'
              },
              '.MuiChartsAxis-tick': {
                opacity: 0
              },
              '.MuiChartsAxis-line': {
                display: 'none'
              },
              '.MuiChartsGrid-line': {
                stroke: '#E6E6E6'
              }
            }}
          />
        </>
      )}
    </>
  );
};

export default memo(ArgumentationCategoryMetrics);
