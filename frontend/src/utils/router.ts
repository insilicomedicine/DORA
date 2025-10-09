import { RouteConfig } from 'types/routes';
import { getSystemConfig, SystemInfo } from './system';
import { ENVIRONMENT } from 'config/env';

/**
 * Filters routes based on system configuration and feature requirements
 * @param routes - Array of route configurations
 * @param systemInfo - System information object
 * @returns Filtered array of routes that meet feature requirements
 */
export const filterRoutesByFeatures = (
  routes: RouteConfig[],
  systemInfo: SystemInfo
): RouteConfig[] => {
  return routes.filter((route) => {
    // If route has no feature requirements, include it
    if (
      !route.requiresFeatures ||
      route.requiresFeatures.length === 0 ||
      !systemInfo
    ) {
      return true;
    }

    // Check if all required features are enabled
    return route.requiresFeatures.every((feature) =>
      getSystemConfig(systemInfo, [feature])
    );
  });
};

export function getLandingPageURL() {
  const landingPageUrl =
    ENVIRONMENT === 'local' ? '/login' : 'https://pharma.ai/dora';
  return landingPageUrl;
}
