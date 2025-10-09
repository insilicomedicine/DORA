import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { RefreshRounded } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          gap={2}
          p={3}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Failed to load component
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There was an error loading this page. Please check your connection
              and try again.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshRounded />}
            onClick={this.handleRetry}
          >
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
