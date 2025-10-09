import { CitationSettings, UserInfo } from 'types/user';
import { HttpService as axios } from './HttpService';
import { showErrorMessage } from './messages';

/**
 * Retrieve CSRF token from server for authentication
 * @returns {Promise<any>} CSRF token response on success, error response object on failure
 */
const getCsrfToken = async (): Promise<any> => {
  return await axios.get('/users/csrf_token/').catch((error) => {
    return error.response;
  });
};

/**
 * Authenticate user with login credentials using multipart form data
 * @param {Record<string, any>} formData - Login credentials (username/email and password)
 * @returns {Promise<any>} Authentication response data on success, error payload on failure
 */
const login = async (formData: Record<string, any>): Promise<any> => {
  const config = { headers: { 'Content-Type': 'multipart/form-data' } };
  return await axios.post('/users/login/', formData, config).catch((error) => {
    return error.response?.data;
  });
};

/**
 * Authenticate user using Google OAuth social login
 * @param {string} id_token - Google OAuth ID token from frontend authentication
 * @returns {Promise<any>} Authentication response with user session data on success, error payload on failure
 */
export const googleLogin = async (id_token: string): Promise<any> => {
  const response = await axios
    .post(`/auth/social/google/`, {
      id_token: id_token
    })
    .catch((error) => {
      return error.response?.data;
    });
  return response;
};

/**
 * Logout currently authenticated user and clear session
 * @returns {Promise<any>} Logout confirmation response on success, error payload on failure
 */
const logout = async (): Promise<any> => {
  return await axios.post('/users/logout/').catch((error) => {
    return error.response?.data;
  });
};

/**
 * Fetch current authenticated user's profile information
 * @returns {Promise<UserInfo>} User profile data on success, empty object on error
 */
const getUserInfo = async (): Promise<UserInfo> => {
  return await axios
    .get('/users/info/')
    .then((res) => {
      return res.data;
    })
    .catch(() => {
      return {};
    });
};

/**
 * Fetch user's UI/display preferences and settings
 * @returns {Promise<UserInfo | {}>} User display preferences object on success, empty object on error
 */
const getUserDisplayPreferences = async (): Promise<UserInfo | {}> => {
  return await axios
    .get('/users/display_preferences/')
    .then((res) => {
      return res.data;
    })
    .catch(() => {
      return {};
    });
};

/**
 * Update user's UI/display preferences and settings
 * @param {Record<string, any>} params - Preference settings to update (theme, language, etc.)
 * @returns {Promise<boolean>} True if preferences updated successfully, false on error
 */
const setUserDisplayPreferences = async (
  params: Record<string, any>
): Promise<boolean> => {
  return await axios
    .post('/users/display_preferences/', params)
    .then(() => {
      return true;
    })
    .catch((error) => {
      showErrorMessage(error);
      return false;
    });
};

/**
 * Fetch user's AI token usage and limit information
 * @returns {Promise<any>} Token usage data (remaining, limit, etc.) on success, error response on failure
 */
const getAITokens = async (): Promise<any> => {
  return await axios
    .get('/users/tokens/')
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Register a new user account with form data
 * @param {} formData - Registration data (email)
 * @returns {Promise< Record<string, any>>} Error object with form data on failure
 */
const register = async (formData: {
  email: string;
}): Promise<Record<string, any>> => {
  return await axios
    .post('/users/register/', formData)
    .then(() => {
      return {};
    })
    .catch((error) => {
      showErrorMessage(error);
      return {
        error: true,
        ...formData
      } as { error: true } & Record<string, any>;
    });
};

/**
 * Create a new password for user account
 * @param {FormData | Record<string, any>} formData - Password creation data (new password, confirmations, etc.)
 * @returns {Promise<any>} Password creation response on success, error response on failure
 */
const createNewPassword = async (
  formData: FormData | Record<string, any>
): Promise<any> => {
  return await axios.post('/users/new_password/', formData).catch((error) => {
    return error.response;
  });
};

/**
 * Validate password strength and security requirements
 * @param {Record<string, any>} formData - Password validation data (password string)
 * @returns {Promise<any>} Validation result with strength score and requirements on success, error response on failure
 */
const validatePassword = async (
  formData: Record<string, any>
): Promise<any> => {
  return await axios
    .post('/users/validate_password/', formData)
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      showErrorMessage(error);
      return error.response;
    });
};

/**
 * Set a new password for the user account
 * @param {Record<string, any>} formData - New password data (current password, new password, etc.)
 * @returns {Promise<boolean | null>} True if password set successfully, null on error
 */
const setPassword = async (
  formData: Record<string, any>
): Promise<boolean | null> => {
  return await axios
    .post('/users/set_password/', formData)
    .then(() => {
      return true;
    })
    .catch((error) => {
      showErrorMessage(error);
      return null;
    });
};

/**
 * Request password reset email for user account
 * @param {Record<string, any>} formData - Reset request data (email address)
 * @returns {Promise<boolean>} True if reset email sent successfully, error object with form data on failure
 */
const resetPassword = async (
  formData: Record<string, any>
): Promise<boolean> => {
  return await axios
    .post('/users/reset_password/', formData)
    .then(() => {
      return true;
    })
    .catch((error) => {
      showErrorMessage(error);
      return false;
    });
};

/**
 * Validate password reset token from email link
 * @param {Record<string, any>} formData - Token validation data (token string)
 * @returns {Promise<boolean | { error: true; isInvalidToken: boolean }>} True if token is valid, error object with invalid token flag on failure
 */
const validateToken = async (
  formData: Record<string, any>
): Promise<boolean | { error: true; isInvalidToken: boolean }> => {
  return await axios
    .post('/users/validate_token/', formData)
    .then(() => {
      return true;
    })
    .catch((error) => {
      const isInvalidToken = error.response?.data?.detail === 'Invalid token';
      isInvalidToken && showErrorMessage(error);
      return {
        error: true,
        isInvalidToken
      };
    });
};

/**
 * Accept terms of service and privacy policy for user account
 * @returns {Promise<boolean>} True if acceptance recorded successfully, false on error
 */
const acceptTermsAndPrivacy = async (): Promise<boolean> => {
  return await axios
    .post('/users/terms_and_privacy/')
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

/**
 * Fetch user's publication and citation formatting settings
 * @returns {Promise<CitationSettings>} Citation settings (style, format, etc.) on success, empty object on error
 */
const getCitationSettings = async (): Promise<CitationSettings> => {
  return await axios
    .get('/users/publication_settings/')
    .then((res) => {
      return res.data;
    })
    .catch(() => {
      return {};
    });
};

/**
 * Update user's publication and citation formatting settings
 * @param {CitationSettings} params - New citation settings (style, format, preferences, etc.)
 * @returns {Promise<boolean>} True if settings updated successfully, false on error
 */
const updateCitationSettings = async (
  params: CitationSettings
): Promise<boolean> => {
  return await axios
    .post('/users/publication_settings/', params)
    .then(() => {
      return true;
    })
    .catch((error) => {
      showErrorMessage(error);
      return false;
    });
};

export {
  getCsrfToken,
  login,
  logout,
  getUserInfo,
  getAITokens,
  register,
  createNewPassword,
  validatePassword,
  setPassword,
  resetPassword,
  validateToken,
  acceptTermsAndPrivacy,
  getCitationSettings,
  updateCitationSettings,
  getUserDisplayPreferences,
  setUserDisplayPreferences
};
