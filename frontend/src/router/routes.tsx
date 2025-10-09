import { lazy } from 'react';
import { RouteConfig } from 'types/routes';

const Main = lazy(() => import('pages/Home/home'));
const Home = lazy(() => import('pages/Home'));

export const publicRoutes: RouteConfig[] = [
  { path: '/login', step: 0 },
  { path: '/signup', step: 1 },
  { path: '/accounts/register/activate/:uid/:token', step: 5 },
  { path: '/reset-password', step: 3 },
  {
    path: '/password-recovery/:uid/:token',
    step: 5,
    extraProps: { isResetPassword: true }
  }
];

export const protectedRoutes: RouteConfig[] = [
  { path: '/templates', element: <Home componentKey="Templates" /> },
  { path: '/documents', element: <Main /> },
  { path: '/documents/:id', element: <Home componentKey="DocumentDetail" /> },
  {
    path: '/documents/generation/:id?/*',
    element: <Home componentKey="DocumentGeneration" />
  },
  {
    path: '/bibliography',
    element: <Home componentKey="Bibliography" />,
    requiresFeatures: ['custom_bibliography']
  }
];
