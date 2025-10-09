import React, { useMemo, memo, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { getLandingPageURL, filterRoutesByFeatures } from 'utils/router';
import { publicRoutes, protectedRoutes } from './routes';
import { MAIN_PATHS, ROUTES, AuthState } from 'types/routes';
import ErrorBoundary from '../components/ErrorBoundary';
import User from '../pages/User';
import { useUserStore } from 'contexts/useUserStore';
import useSystemStore from 'contexts/useSystemStore';

const useAuth = (): AuthState => {
  const { userInfo } = useUserStore();
  return useMemo(
    () => ({
      isAuthorized: Boolean(userInfo?.terms_and_privacy_accepted)
    }),
    [userInfo?.terms_and_privacy_accepted]
  );
};

const ProtectedRoute = memo(() => {
  const { isAuthorized } = useAuth();
  const { pathname } = useLocation();
  const isMainPagePath = useMemo(
    () => MAIN_PATHS.some((path) => pathname.startsWith(path)),
    [pathname]
  );

  if (!isAuthorized) {
    if (isMainPagePath) {
      window.location.href = getLandingPageURL();
      return null;
    }
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
});

const PublicRoute = memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthorized } = useAuth();
  return isAuthorized ? (
    <Navigate to={ROUTES.TEMPLATES} replace />
  ) : (
    <>{children}</>
  );
});

const Router = () => {
  const { systemInfo } = useSystemStore();

  const filteredProtectedRoutes = useMemo(() => {
    return filterRoutesByFeatures(protectedRoutes, systemInfo);
  }, [systemInfo]);

  return (
    <Suspense fallback={<></>}>
      <Routes>
        {/* Public Routes */}
        {publicRoutes.map(({ path, step, extraProps }) => (
          <Route
            key={path}
            path={path}
            element={
              <PublicRoute>
                <ErrorBoundary>
                  <User step={step} {...(extraProps || {})} />
                </ErrorBoundary>
              </PublicRoute>
            }
          />
        ))}

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {filteredProtectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ErrorBoundary>{element}</ErrorBoundary>}
            />
          ))}
          <Route
            path="/"
            element={<Navigate to={ROUTES.TEMPLATES} replace />}
          />
        </Route>

        {/* Catch-All */}
        <Route path="/*" element={<Navigate to={ROUTES.TEMPLATES} replace />} />
      </Routes>
    </Suspense>
  );
};

export default memo(Router);
