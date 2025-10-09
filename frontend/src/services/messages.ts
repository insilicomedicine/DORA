import Snackbar from 'utils/snackbar';

/**
 * Display error message in snackbar notification
 * @param {any} err - Error object (typically Axios error with response.data.detail)
 */
export function showErrorMessage(err: any): void {
  const errorMessage =
    typeof err.response?.data?.detail === 'string'
      ? err.response?.data?.detail
      : err.message || 'An error occurred. Please try again later.';
  Snackbar.error(errorMessage);
}

/**
 * Display success message in snackbar notification
 * @param {string} message - Success message text to display
 * @param {any} options - Optional snackbar configuration (duration, position, etc.)
 */
export function showSuccessMessage(message: string, options?: any): void {
  Snackbar.success(message || 'Success.', options);
}

/**
 * Display informational message in snackbar notification
 * @param {string} message - Info message text to display
 * @param {any} options - Optional snackbar configuration (duration, position, etc.)
 */
export function showInfoMessage(message: string, options?: any): void {
  Snackbar.info(message || 'Success.', options);
}
