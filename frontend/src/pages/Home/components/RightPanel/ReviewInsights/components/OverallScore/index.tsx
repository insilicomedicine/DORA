import React, { memo, useState, useEffect } from 'react';
import { Typography, Alert, Box, Stack, useMediaQuery } from '@mui/material';
import { RadarChart } from '@mui/x-charts/RadarChart';
import { theme } from 'theme';

interface OverallScoreProps {
  score: {
    score: number;
    score_explanation: string;
  } | null;
  maxScore: number;
  highchartsRadarData: {
    xAxisData: string[];
    seriesData: number[];
  };
}

const OverallScore = ({
  score,
  maxScore,
  highchartsRadarData: { xAxisData, seriesData }
}: OverallScoreProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Responsive margin based on screen size
  const LARGE_SCREEN_MARGIN = 32;
  const MEDIUM_SCREEN_MARGIN = 45;
  const SMALL_SCREEN_MARGIN = 55;

  const isLargeScreen = useMediaQuery(theme.breakpoints.up('bp1800'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('bp1600'));
  const chartMargin = isLargeScreen
    ? LARGE_SCREEN_MARGIN
    : isMediumScreen
      ? MEDIUM_SCREEN_MARGIN
      : SMALL_SCREEN_MARGIN;

  useEffect(() => {
    const timeout = 1500;
    const timer = setTimeout(() => {
      setShouldAnimate(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack
      sx={{
        mb: 1,
        borderBottom: `1px solid #F2F2F2`
      }}
      data-testid="overallScore-wrapper"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pl: 1.5
        }}
      >
        <Typography variant="body2" fontSize={20}>
          Overall Score
        </Typography>
        <Box
          sx={{
            display: 'flex',
            padding: '4px 16px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 6,
            border: `1px solid #F2F2F2`
          }}
          data-testid="overallScore-score"
        >
          <Typography
            fontWeight={700}
            fontSize={20}
            color={score?.score ? 'text.primary' : 'grey.500'}
          >
            {score?.score ? `${score.score}/${maxScore}` : '—'}
          </Typography>
        </Box>
      </Box>
      {score?.score ? (
        <>
          <Typography
            variant="body2"
            sx={{ mt: 1, pl: 1.5 }}
            data-testid="overallScore-scoreExplanation"
          >
            {score?.score_explanation}
          </Typography>
          <Box data-testid="overallScore-radarPlot" sx={{ py: 3, mx: -1 }}>
            <RadarChart
              height={240}
              stripeColor={null}
              radar={{
                max: 10,
                metrics: xAxisData
              }}
              series={[
                {
                  data: seriesData?.map((value) => value) ?? [],
                  color: theme.palette.primary.main,
                  fillArea: true,
                  valueFormatter: (value, context) => {
                    if (context.dataIndex !== undefined) {
                      const metric = xAxisData[context.dataIndex];
                      return `${metric}: ${value}`;
                    }
                    return `${value}`;
                  }
                }
              ]}
              sx={{
                '& .MuiRadarAxisHighlight-root': { path: { display: 'none' } },
                '& .MuiRadarSeriesPlot-area': {
                  strokeWidth: 2,
                  ...(shouldAnimate && {
                    animation: 'scaleIn 0.8s ease-in-out both'
                  }),
                  transformOrigin: 'center',
                  '&+g': {
                    ...(shouldAnimate && {
                      animation: 'scaleIn 0.8s ease-in-out both'
                    }),
                    transformOrigin: 'center'
                  }
                },
                '& .MuiRadarGrid-divider, .MuiRadarGrid-radial': {
                  stroke: '#e6e6e6',
                  strokeWidth: 1,
                  strokeOpacity: 0.7
                },
                '@keyframes scaleIn': {
                  from: { transform: 'scale(0.2)' },
                  to: { transform: 'scale(1)' }
                }
              }}
              divisions={2}
              margin={chartMargin}
              slotProps={{
                tooltip: {
                  placement: 'top',
                  sx: {
                    backgroundColor: 'white',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    position: 'relative',
                    '&> div': {
                      border: 'none',
                      '& .MuiChartsTooltip-table': {
                        '& tbody tr td': {
                          padding: 1,
                          fontSize: 12,
                          fontWeight: 700
                        },
                        '& caption': {
                          display: 'none'
                        }
                      }
                    },
                    '& .MuiChartsTooltip-mark': {
                      display: 'none'
                    },
                    '& .MuiChartsTooltip-labelCell': {
                      display: 'none'
                    },
                    '& .MuiChartsTooltip-seriesName': {
                      display: 'none'
                    },
                    '& .MuiChartsTooltip-axisValueCell': {
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
            />
          </Box>
        </>
      ) : (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          data-testid="overallScore-errorAlert"
        >
          AI review generation failed. Please try again later.
        </Alert>
      )}
    </Stack>
  );
};

export default memo(OverallScore);
