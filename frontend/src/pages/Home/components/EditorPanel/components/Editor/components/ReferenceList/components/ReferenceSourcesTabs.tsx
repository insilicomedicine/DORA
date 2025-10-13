import React, { memo, useEffect, useState } from 'react';
import { Box, CircularProgress, Tab, Tabs } from '@mui/material';
import { keyframes } from '@mui/system';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import {
  isOnlyOneAvailableSource,
  getSystemConfig,
  getInitialTabFromSystemInfo,
  TabType
} from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';
import { defaultTabItems, TabItem, TabState } from '../types';

// Define keyframes for opacity animation
const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;
interface TabProviderProps {
  children?: React.ReactNode;
  initialTab?: string;
  render: (tabState: TabState) => React.ReactNode;
}

// TabProvider component to manage tab state
export const TabProvider = memo(
  ({ children, initialTab, render }: TabProviderProps) => {
    const systemInfo = useSystemStore((state) => state.systemInfo);

    // Calculate the initial tab based on system info if not explicitly provided
    const calculatedInitialTab =
      initialTab ?? getInitialTabFromSystemInfo(systemInfo);

    const [tabValue, setTabValue] = useState<string>(calculatedInitialTab);
    const tabState: TabState = {
      tabValue,
      isEnabledTabContent: tabValue !== TabType.PUBMED,
      isPMCTabActive: tabValue === TabType.PMC,
      isAutoSearch:
        defaultTabItems.find((tabItem) => tabItem.type === tabValue)
          ?.isAutoSearch && !isOnlyOneAvailableSource(systemInfo),
      setTabValue
    };

    return (
      <>
        {children}
        {render(tabState)}
      </>
    );
  }
);

interface ReferenceSourcesTabsProps {
  tabValue: string;
  onTabChange: (newValue: string) => void;
  isSearching?: boolean;
}

const ReferenceSourcesTabs = ({
  tabValue,
  onTabChange,
  isSearching
}: ReferenceSourcesTabsProps) => {
  const systemInfo = useSystemStore((state) => state.systemInfo);

  // Use dynamic initial tab if tabValue is not provided
  const effectiveTabValue = tabValue ?? getInitialTabFromSystemInfo(systemInfo);
  const [isSearchDone, setIsSearchDone] = useState<boolean | undefined>(false);

  // Process tab items with system configuration
  const processedTabItems = defaultTabItems.map((tabItem) => ({
    ...tabItem,
    hidden: systemInfo
      ? !getSystemConfig(systemInfo, [tabItem.id])
      : tabItem.hidden,
    isLoading:
      tabItem.showLoadingIcon && tabItem.type === TabType.PMC
        ? isSearching
        : false
  }));

  useEffect(() => {
    if (isSearching || effectiveTabValue === TabType.PMC) return;
    setIsSearchDone(isSearching !== undefined && !isSearching);
    const timeout = setTimeout(() => {
      setIsSearchDone(undefined);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isSearching]);

  const renderTabLabel = (tabItem: TabItem) => {
    const baseLabel = tabItem.label;

    if (!tabItem.showLoadingIcon && !tabItem.showDoneIcon) {
      return baseLabel;
    }

    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {baseLabel}
        {tabItem.showDoneIcon &&
          isSearchDone &&
          effectiveTabValue !== TabType.PMC && (
            <DoneRoundedIcon
              color="primary"
              fontSize="xsmall"
              sx={{
                animation: `${fadeOut} 1.5s forwards`
              }}
            />
          )}
        {tabItem.showLoadingIcon && tabItem.isLoading && (
          <CircularProgress size={16} />
        )}
      </span>
    );
  };

  // If there is only one tab, hide the tabs
  const isOnlyOneTab = isOnlyOneAvailableSource(systemInfo);

  return (
    <Box sx={{ borderBottom: '1px solid #eee' }}>
      <Tabs
        value={effectiveTabValue}
        onChange={(_, newValue) => onTabChange(newValue)}
        aria-label="citation tabs"
        sx={{
          minHeight: 32,
          px: 2,
          ...(isOnlyOneTab && { display: 'none' }),
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 2,
            ...(effectiveTabValue === TabType.PUBMED && {
              minWidth: 60
            }),
            transition: 'none'
          }
        }}
      >
        {processedTabItems.map((tabItem) => (
          <Tab
            disableRipple
            key={tabItem.id}
            value={tabItem.type}
            label={renderTabLabel(tabItem)}
            sx={{
              minHeight: 32,
              p: 1,
              minWidth: 40,
              overflowX: 'unset',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '12px',
              letterSpacing: 0,
              lineHeight: 1.37,
              color: '#616161',
              ...(tabItem.hidden && {
                display: 'none'
              }),
              '&.Mui-selected': {
                color: '#21965F'
              }
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default memo(ReferenceSourcesTabs);
