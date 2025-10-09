import { HttpService as axios } from './HttpService';
import { showErrorMessage } from './messages';
import type { Template } from 'types/template';

/**
 * Fetch all available document templates for generation
 * @returns {Promise<Template[] | []>} Array of template objects on success, empty array on error
 */
const getTemplates = async (): Promise<Template[] | []> => {
  return await axios
    .get('/templates/')
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return [];
    });
};

/**
 * Fetch detailed information for a specific document template
 * @param {string} id - Unique template identifier
 * @returns {Promise<Template>} Complete template data on success, null on error
 */
const getTemplate = async (id: string): Promise<Template> => {
  return await axios
    .get(`/templates/${id}/`)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return null;
    });
};

/**
 * Fetch AI agents configuration for a specific template
 * @param {string} id - Unique template identifier
 * @returns {Promise<Record<string, any> | false>} Template agents configuration on success, false on error
 */
const getAgents = async (id: string): Promise<Record<string, any>> => {
  return await axios
    .get(`/templates/${id}/agents/`)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return null;
    });
};

/**
 * Generate AI-powered template suggestions based on user requirements
 * @param {Record<string, any>} params - Suggestion criteria (topic, style, length, etc.)
 * @returns {Promise<boolean>} Suggested template configurations on success, false on error
 */
const createSuggestions = async (params: {
  suggest_type: string;
  description: string;
}): Promise<boolean> => {
  return await axios
    .post(`/templates/suggestions/`, params)
    .then(() => {
      return true;
    })
    .catch((err) => {
      showErrorMessage(err);
      return false;
    });
};

export { getTemplates, getTemplate, getAgents, createSuggestions };
