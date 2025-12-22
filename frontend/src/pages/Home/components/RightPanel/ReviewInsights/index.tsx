import React, { memo, useEffect } from 'react';
import { useDocumentStore } from 'contexts/documentsStore';
import { Stack } from '@mui/material';
import ReviewInsightsLoader from './components/ReviewInsightsLoader';
import OverallScore from './components/OverallScore';
import NoData from './components/NoData';
import ReviewCategory from './components/ReviewCategory';
import { type ReviewCategoryItem } from 'types/document';
import usePlanStatus from 'hooks/usePlanStatus';
import PlanExpired from './components/PlanExpired';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';

const ReviewInsights = () => {
  const { documentData, isDocumentLoading } = useDocumentStore();

  const {
    data,
    isLoading: reviewInsightsIsLoading,
    status: reviewInsightsStatus,
    isReload,
    fetchReview,
    generateReview,
    reset
  } = useReviewInsightsStore();

  const { isExpired } = usePlanStatus();

  const isPolishing = documentData?.stage === 'polishing';
  const isDocumentInProgress = documentData?.status === 'in_progress';

  useEffect(() => {
    if (documentData?.id) {
      fetchReview(documentData.id);
    }

    return () => {
      reset();
    };
  }, [documentData?.id, fetchReview, reset, isReload]);

  const { overall_impression, categories } = data || {};

  const maxScore = 10;

  const handleGenerateReview = async () => {
    if (documentData?.id) {
      await generateReview(documentData.id);
    }
  };

  const highchartsRadarData = () => {
    const xAxisData: string[] = [];
    const seriesData: number[] = [];
    categories?.forEach((category) => {
      xAxisData.push(category.title);
      seriesData.push(category.score);
    });
    if (overall_impression?.title && overall_impression?.score !== undefined) {
      xAxisData.push(overall_impression.title);
      seriesData.push(overall_impression.score);
    }
    return {
      xAxisData,
      seriesData
    };
  };

  if (reviewInsightsIsLoading || reviewInsightsStatus === 'in_progress') {
    return <ReviewInsightsLoader />;
  }

  if (Object.keys(data || {}).length === 0) {
    if (isExpired) {
      return <PlanExpired />;
    }
    return (
      <NoData
        generateReviewButtonIsDisabled={
          isPolishing || isDocumentInProgress || isDocumentLoading
        }
        handleGenerateReview={handleGenerateReview}
      />
    );
  }

  return (
    <Stack sx={{ pb: 3, pr: 2 }}>
      <OverallScore
        score={overall_impression || null}
        maxScore={maxScore}
        highchartsRadarData={highchartsRadarData()}
      />
      {categories?.map((category: ReviewCategoryItem) => (
        <ReviewCategory
          key={category.id}
          category={category}
          maxScore={maxScore}
        />
      ))}
    </Stack>
  );
};

export default memo(ReviewInsights);
