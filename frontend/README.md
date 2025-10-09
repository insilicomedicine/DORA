# DORA Frontend

A modern React frontend application for the DORA platform, built with TypeScript, Vite, and Material-UI.

## 🚀 Tech Stack

- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI) v7
- **MUI X**: Charts, Tree View
- **Rich Text Editor**: TipTap
- **HTTP Client**: Axios
- **Routing**: React Router v7
- **State Management**: Zustand
- **Notifications**: Notistack
- **Error Monitoring**: Sentry
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier
- **Build Tool**: Vite 7
- **Package Manager**: pnpm

## 📋 Prerequisites

- **Node.js**: Version 20.19+ or 22.12+ (Vite - [see guide](https://vite.dev/guide/))
- **pnpm**: Latest version (`npm install -g pnpm`)
- **Git**: For version control

## 🛠️ Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/insilicomedicine/DORA.git
cd DORA/frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory (Vite auto-loads it):

```bash
# App environment: local | development | staging | production
VITE_ENVIRONMENT=

# Base API path used by services (usually '/api/')
VITE_API_URL=

# API version segment appended to base path
VITE_API_VERSION=

# WebSocket port used by realtime features (if applicable)
VITE_WS_PORT=

# Dev server proxy target for API requests (Vite proxies '/api' → backend)
VITE_PROXY_TARGET=

# Google OAuth 2.0 client ID (enable Google login)
VITE_GOOGLE_CLIENT_ID=

# Sentry DSN for error monitoring (leave empty to disable)
VITE_SENTRY_DSN=

# Google Analytics 4 measurement ID (leave empty to disable GA)
VITE_GA_MEASUREMENT_ID=

# Enable bundle analysis during build: 'true' | 'false'
VITE_ENABLE_BUNDLE_ANALYZER=
```

Notes:

- Only variables prefixed with `VITE_` are exposed to the client
- Never commit secrets to version control - use `.env.local` for local configuration
- Update `VITE_PROXY_TARGET` to point to your backend server's address and port
- The frontend will proxy API requests from `/api/*` to your backend server

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `pnpm dev`           | Start development server (alias)  |
| `pnpm build`         | Build for production              |
| `pnpm build:analyze` | Build with bundle analysis report |
| `pnpm preview`       | Preview production build          |
| `pnpm test`          | Run tests with Vitest             |
| `pnpm lint`          | Run ESLint                        |
| `pnpm lint:fix`      | Run ESLint with auto-fix          |
| `pnpm format`        | Format code with Prettier         |
| `pnpm prettier:fix`  | Fix formatting issues             |

## 🏗️ Project Structure

```
src/
├── assets/          # Static assets (images, icons, etc.)
├── components/      # Reusable UI components
│   ├── Header/
│   ├── Dialog/
│   ├── ErrorBoundary/
│   └── ...
├── contexts/        # React context providers
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── router/          # Routing configuration
├── services/        # API services and external integrations
├── styles/          # Global styles and theme customization
├── theme/           # MUI theme configuration
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── config/          # Application configuration
```

## 🔧 Development Guidelines

### Code Quality

The project uses automated code quality tools:

- **Pre-commit hooks** with Husky
- **Lint-staged** for staged file linting
- **ESLint** for code linting
- **Prettier** for code formatting

### Testing

Run tests during development:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

## 🐛 Error Monitoring

The application uses Sentry for error tracking and performance monitoring. Source maps are automatically uploaded during the build process.

## 📊 Bundle Analysis

Generate a bundle analysis report:

```bash
pnpm build:analyze
```

This will create a `bundle-analysis.html` file showing the bundle composition and size analysis.

## 📚 Additional Resources

- [Material-UI Documentation](https://mui.com/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

For questions or support, please open an issue in the repository or refer to the project documentation.

