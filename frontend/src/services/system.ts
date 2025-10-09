import { SystemInfo } from 'utils/system';
import { HttpService as axios } from './HttpService';

/**
 * Fetch general system configuration and status information
 * @returns {Promise<SystemInfo>} System info (version, features, limits, etc.) on success, empty object on error
 */
const getSystemInfo = async (): Promise<SystemInfo> => {
  return await axios
    .get('/system/info/')
    .then((res) => {
      return res.data;
    })
    .catch(() => {
      return {};
    });
};

/**
 * Fetch available social authentication providers (Google, GitHub, etc.)
 * @returns {Promise<string[]>} Array of enabled social login provider names on success, empty array on error
 */
const getSocialAccountProviders = async (): Promise<string[]> => {
  return await axios
    .get('/system/social_account_providers/')
    .then((res) => {
      return res.data?.providers || [];
    })
    .catch(() => {
      return [];
    });
};

export { getSystemInfo, getSocialAccountProviders };
