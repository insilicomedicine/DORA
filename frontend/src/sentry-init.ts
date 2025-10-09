// Sentry initialization module for optimized bundle size with tree shaking
// This module uses named imports for better tree shaking performance
import { SENTRY_DSN, ENVIRONMENT } from 'config/env';

export const initSentry = async (): Promise<void> => {
  // Only initialize Sentry in production to reduce bundle size
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    // Use named imports for better tree shaking instead of namespace import
    const { init, browserTracingIntegration, replayIntegration } = await import(
      '@sentry/react'
    );

    init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      integrations: [browserTracingIntegration(), replayIntegration()],
      // Reduced Performance Monitoring sample rate to reduce impact
      tracesSampleRate: 0.1, // Sample 10% instead of 100%
      // Reduced Session Replay sample rates
      replaysSessionSampleRate: 0.01, // Sample 1% instead of 10%
      replaysOnErrorSampleRate: 0.1 // Sample 10% instead of 100%
    });
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
};
