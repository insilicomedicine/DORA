import { PageType, RoutePatterns } from 'types/routes';

interface GA4EventParams {
  button_type?: string;
  location?: string;
  page_location?: string;
  page_type?: string;
}

// Get page type from RoutePatterns
// Need to add more patterns in RoutePatterns if new routes are added
export const getPageType = (): PageType | string => {
  const pathname = window.location.pathname;
  for (const [pattern, pageType] of Object.entries(RoutePatterns)) {
    if (new RegExp(pattern).test(pathname)) {
      return pageType;
    }
  }
  //Templates is the default page
  const locationName = pathname?.split('/')[1] || 'Templates';
  return `${locationName?.charAt(0).toUpperCase()}${locationName?.slice(1)} Page`;
};

// Set GA4 dimensions for user (user_type, user_plan)
export const setGADimensions = (
  key: string,
  userProperties: Record<string, string | null>
): void => {
  if (window?.gtag) {
    window.gtag('set', key, userProperties);
  }
};

// Send GA4 event
export const sendGA4Event = (
  eventName: string,
  params?: Record<string, any> | GA4EventParams
): void => {
  if (window?.gtag) {
    window.gtag('event', eventName, {
      category: eventName,
      page_type: getPageType(),
      ...params
    });
  }
};
