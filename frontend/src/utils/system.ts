export enum TabType {
  PUBMED = 'pubmed',
  PMC = 'pmc',
  WEBSEARCH = 'websearch'
}

const isOnlyOneAvailableSource = (systemInfo: SystemInfo): boolean => {
  const { search_sources = [] } = systemInfo || {};
  return (
    search_sources.filter(
      (source) =>
        source.available &&
        Object.values(TabType).includes(source.name as TabType)
    ).length === 1
  );
};

const getSystemConfig = (
  systemInfo: SystemInfo,
  keys: string[] = [TabType.PUBMED, TabType.PMC]
): boolean => {
  const { search_sources = [] } = systemInfo || {};
  // Check if any of the specified keys/sources are available
  const isSourceAvailable = keys.some((key) => {
    const source = search_sources.find((source) => source.name === key);
    return source && source.available;
  });

  return isSourceAvailable;
};

// Helper function to get initial tab based on first available source
const getInitialTabFromSystemInfo = (
  systemInfo: SystemInfo | null
): TabType => {
  if (!systemInfo) {
    return TabType.PUBMED; // Default fallback
  }

  const firstAvailableSource =
    systemInfo.search_sources?.find((source) => source.available)?.name ||
    TabType.PUBMED;

  // Check if the source is a valid TabType
  if (
    firstAvailableSource &&
    Object.values(TabType).includes(firstAvailableSource as TabType)
  ) {
    return firstAvailableSource as TabType;
  }

  return TabType.PUBMED; // Default fallback
};
interface SearchSource {
  name: TabType | 'custom_bibliography';
  available?: boolean;
}
export interface SystemInfo {
  search_sources?: SearchSource[];
}
export {
  getSystemConfig,
  getInitialTabFromSystemInfo,
  isOnlyOneAvailableSource
};
