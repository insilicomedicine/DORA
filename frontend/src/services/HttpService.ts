import axios, { AxiosInstance } from 'axios';
import { API_URL, API_VERSION } from 'config/env';

/**
 * Pre-configured Axios instance for all API communication
 * Includes base URL, CSRF token handling, and default headers
 */
const HttpService: AxiosInstance = axios.create({
  baseURL: `${API_URL}${API_VERSION}`,
  // Configure CSRF so axios automatically attaches the token from cookies
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken'
});

export { HttpService };
