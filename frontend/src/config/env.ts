// Environment configuration for Vite
// This provides a centralized and type-safe way to access environment variables

interface AppConfig {
  ENVIRONMENT: string;
  API_URL: string;
  API_VERSION: string;
  WS_PORT: string;
  PROXY_TARGET: string;
  GOOGLE_CLIENT_ID: string;
  SENTRY_DSN: string;
  GA_MEASUREMENT_ID: string;
  JIRA_SERVICE_DESK_KEY: string;
}

// Simplified function to get environment variables safely
const getEnvVar = (key: string, fallback: string = ''): string => {
  // In Vite, import.meta.env is the primary way to access environment variables
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }

  // Fallback for process.env (mainly for Node.js environments like testing)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  return fallback;
};

export const appConfig: AppConfig = {
  ENVIRONMENT: getEnvVar('VITE_ENVIRONMENT', 'local'),
  API_URL: getEnvVar('VITE_API_URL', '/api/'),
  API_VERSION: getEnvVar('VITE_API_VERSION', 'v1'),
  WS_PORT: getEnvVar('VITE_WS_PORT', ''),
  PROXY_TARGET: getEnvVar('VITE_PROXY_TARGET', 'http://127.0.0.1:8080'),
  GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', ''),
  SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN', ''),
  GA_MEASUREMENT_ID: getEnvVar('VITE_GA_MEASUREMENT_ID', ''),
  JIRA_SERVICE_DESK_KEY: getEnvVar('VITE_JIRA_SERVICE_DESK_KEY', '')
};

// Export individual values for convenience
export const {
  ENVIRONMENT,
  API_URL,
  API_VERSION,
  WS_PORT,
  PROXY_TARGET,
  GOOGLE_CLIENT_ID,
  SENTRY_DSN,
  GA_MEASUREMENT_ID,
  JIRA_SERVICE_DESK_KEY
} = appConfig;
