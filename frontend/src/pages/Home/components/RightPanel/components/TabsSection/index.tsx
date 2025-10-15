import React, { memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CircularProgress from '@mui/material/CircularProgress';
import { RightPanelComponentIds } from 'types/document';
import Bibliography from '../../Bibliography';
import ReviewInsights from '../../ReviewInsights';
import SidebarCollapse from 'components/SidebarCollapse';
import useRightPanelStore from 'contexts/useRightPanelStore';
import { useDocumentStore } from 'contexts/documentsStore';
import useReviewInsightsStore from 'contexts/useReviewInsightsStore';

const TABS = [
  {
    id: RightPanelComponentIds.bibliography,
    title: 'Bibliography',
    Component: Bibliography
  },
  {
    id: RightPanelComponentIds.reviewInsights,
    title: 'Review Insights',
    Component: ReviewInsights
  }
];

interface TabsSectionProps {
  activedComponentId: string;
  handleChange: (event: React.SyntheticEvent, newValue: string) => void;
}

const TabsSection = ({
  activedComponentId,
  handleChange
}: TabsSectionProps) => {
  const { documentData, isDocumentLoading = false } = useDocumentStore();

  const { isRightPanelCollapsed, toggleCollapseRightPanel } =
    useRightPanelStore();

  const { status: reviewInsightsStatus } = useReviewInsightsStore();

  const bibliographyIsActived =
    activedComponentId === RightPanelComponentIds.bibliography;

  const isDocumentInProgress = documentData?.status === 'in_progress';
  const documentIsInProgress = isDocumentInProgress || isDocumentLoading;

  return (
    <Box
      id="rightPanelAccordions"
      data-testid="rightPanelAccordions"
      flex={1}
      sx={{ pl: 1.5, overflow: 'hidden', mt: 1 }}
      flexDirection="column"
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Tabs
          value={activedComponentId}
          sx={{
            mb: 0.5,
            ml: 1.5,
            '& .MuiTabs-flexContainer, & .MuiTabs-scroller': {
              height: 40
            },
            '& .MuiTabs-indicator': {
              ...(bibliographyIsActived && {
                width: '68px !important'
              })
            }
          }}
          onChange={handleChange}
        >
          {TABS.map(({ title, id }) => {
            const reviewTabIsDisabled =
              documentIsInProgress &&
              id === RightPanelComponentIds.reviewInsights;

            const isInProgress =
              reviewInsightsStatus === 'in_progress' &&
              id === RightPanelComponentIds.reviewInsights;

            return (
              <Tab
                disableRipple
                key={id}
                value={id}
                disabled={reviewTabIsDisabled}
                icon={
                  <CircularProgress
                    size={16}
                    sx={{ display: isInProgress ? 'block' : 'none' }}
                  />
                }
                iconPosition="end"
                sx={{
                  display: 'flex',
                  overflow: 'hidden',
                  minWidth: 0,
                  minHeight: 0,
                  padding: 0,
                  mr: 3,
                  mt: 2,
                  textTransform: 'none',
                  alignItems: 'flex-start',
                  '&.Mui-disabled': {
                    bgcolor: 'transparent !important'
                  }
                }}
                label={
                  <Typography variant="caption" fontWeight={500}>
                    {title}
                  </Typography>
                }
              />
            );
          })}
        </Tabs>
        <SidebarCollapse
          direction="right"
          sx={{ mr: 3 }}
          toggleCollapse={() => toggleCollapseRightPanel(true)}
          isCollapsed={isRightPanelCollapsed}
        />
      </Box>

      <Box sx={{ overflow: 'auto', height: 'calc(100% - 50px)' }}>
        {TABS.map(({ Component, id }) => (
          <Box
            sx={{
              height: '100%',
              ...(id !== activedComponentId && {
                width: 0,
                height: 0,
                overflow: 'hidden'
              })
            }}
            data-testid={id}
          >
            <Component />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default memo(TabsSection);
