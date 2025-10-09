import React, { useState, memo } from 'react';
import {
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  LinearProgress,
  Box
} from '@mui/material';
import { ExpandMore, ErrorOutline } from '@mui/icons-material';
import { calculateSeriousnessCounts } from 'utils/reviewInsights';
import SortButtonsGroup from './components/SortButtonsGroup';
import SuggestionsList from './components/SuggestionsList';
import {
  type ReviewCategoryItem,
  ReviewSuggestionSeriousnessLevels,
  PredefinedCategoryIds,
  LanguageMetrics,
  ReadabilityMetrics,
  ArgumentationMetrics
} from 'types/document';
import LanguageCategoryMetrics from './components/LanguageCategoryMetrics';
import ReadabilityCategoryMetrics from './components/ReadabilityCategoryMetrics';
import ArgumentationCategoryMetrics from './components/ArgumentationCategoryMetrics';

interface ReviewCategoryProps {
  category: ReviewCategoryItem;
  maxScore: number;
}

const ReviewCategory = ({ category, maxScore }: ReviewCategoryProps) => {
  const { suggestions, title, score, score_explanation } = category;

  const [activeFilter, setActiveFilter] =
    useState<ReviewSuggestionSeriousnessLevels | null>(null);

  const linearProgressValue = score * 10; // Multiply to 10, cuz 100 is the max LinearProgress value
  const seriousnessCounts = calculateSeriousnessCounts(suggestions);

  const handleFilterClick = (filter) => {
    setActiveFilter((prevFilter) => (prevFilter === filter ? null : filter));
  };

  const getPredefinedMetricsById = () => {
    switch (category.id) {
      case PredefinedCategoryIds.language:
        return (
          <LanguageCategoryMetrics
            title="Document Statistics:"
            metricsData={category.code_based_metrics as LanguageMetrics}
          />
        );
      case PredefinedCategoryIds.readability:
        return (
          <ReadabilityCategoryMetrics
            title="Text Complexity:"
            metricsData={category.code_based_metrics as ReadabilityMetrics}
          />
        );
      case PredefinedCategoryIds.argumentation:
        return (
          <ArgumentationCategoryMetrics
            title="Citation Overview:"
            metricsData={category.code_based_metrics as ArgumentationMetrics}
          />
        );
      default:
        return null;
    }
  };

  const filteredSuggestions =
    activeFilter === null
      ? suggestions
      : suggestions.filter(
          (suggestion) => suggestion.seriousness === activeFilter
        );

  return (
    <Accordion
      data-testid={`reviewCategory-wrapperWithId-${category.title}`}
      sx={{
        boxShadow: 'none',
        border: 'none',
        mb: 1,
        padding: 0,
        '&.Mui-expanded': {
          padding: 0
        },
        '&::before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={!!score ? <ExpandMore /> : null}
        disabled={!!!score}
        sx={{
          padding: '8px 16px',
          borderRadius: '12px',
          '&.Mui-expanded': {
            padding: '8px 16px',
            '& .MuiAccordionSummary-content': {
              margin: 0
            }
          },
          '&:hover': {
            backgroundColor: (theme) => theme.palette?.grey[50],
            padding: '8px 16px'
          },
          '& .MuiAccordionSummary-expandIconWrapper': {
            position: 'absolute',
            right: 10
          },
          '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
            transform: 'rotate(180deg)'
          },
          '& .MuiAccordionSummary-content': {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            margin: 0,
            padding: 0
          },
          '&.Mui-disabled': {
            opacity: 1
          }
        }}
      >
        <Typography variant="body2" data-testid="reviewCategory-title">
          {title}
        </Typography>
        {!!score ? (
          <Typography
            variant="h6"
            fontWeight={700}
            data-testid="reviewCategory-score"
          >
            {score}/{maxScore}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 0.25,
              marginBottom: 1
            }}
            data-testid="reviewCategory-errorMessage"
          >
            <Typography variant="caption" color="error.dark">
              AI review generation failed. Please try again later.
            </Typography>
            <ErrorOutline
              sx={{
                color: (theme) => theme.palette?.error.dark,
                width: 16,
                height: 16
              }}
            />
          </Box>
        )}
        <LinearProgress
          variant="determinate"
          value={linearProgressValue}
          aria-disabled={!!!score}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Typography
          variant="body2"
          data-testid="reviewCategory-scoreExplanation"
          sx={{ mb: 3 }}
        >
          {score_explanation}
        </Typography>
        {category?.code_based_metrics && getPredefinedMetricsById()}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '16px 0 24px 0'
          }}
        >
          <Typography variant="body2" fontWeight={500} sx={{ mt: 1 }}>
            Suggestions:
          </Typography>
          <SortButtonsGroup
            activeFilter={activeFilter}
            handleFilterClick={handleFilterClick}
            seriousnessCounts={seriousnessCounts}
          />
        </Box>
        <SuggestionsList
          filteredSuggestions={filteredSuggestions}
          totalSuggestionsLength={suggestions.length}
        />
      </AccordionDetails>
    </Accordion>
  );
};

export default memo(ReviewCategory);
