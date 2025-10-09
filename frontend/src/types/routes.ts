export enum PageType {
  Login = 'Login Page',
  Signup = 'Sigup Page',
  Activate = 'Activate Page',
  Documents = 'Documents Page',
  Bibliography = 'Bibliography Page',
  DocumentDetails = 'Document Details Page',
  DocumentGenerationPage = 'Document Generation Page'
}

export const RoutePatterns: { [key: string]: PageType } = {
  '^/login': PageType.Login,
  '^/signup': PageType.Signup,
  '^/accounts/register/activate': PageType.Activate,
  '^/documents/generation/*': PageType.DocumentGenerationPage,
  '^/documents/[a-f0-9-]+': PageType.DocumentDetails,
  '^/documents': PageType.Documents,
  '^/bibliography': PageType.Bibliography
};

export interface RouteConfig {
  path: string;
  element?: React.ReactNode;
  step?: number;
  extraProps?: Record<string, unknown>;
  requiresFeatures?: string[]; // Features required for this route to be accessible
}

export interface AuthState {
  isAuthorized: boolean;
}

//Main Path
export const ROUTES = {
  LOGIN: '/login',
  TEMPLATES: '/templates',
  DOCUMENTS: '/documents',
  BIBLIOGRAPHY: '/bibliography'
} as const;

export const MAIN_PATHS = [
  ROUTES.DOCUMENTS,
  ROUTES.TEMPLATES,
  ROUTES.BIBLIOGRAPHY
] as const;
