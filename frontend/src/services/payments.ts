import { HttpService as axios } from './HttpService';
import { showErrorMessage } from './messages';

/**
 * Fetch subscription plans and pricing information
 * @returns {Promise<{ 'pricing-table-id': string; 'publishable-key': string }>} Pricing table data with plans and features on success, empty array on error
 */
const getPricingTableInfo = async (): Promise<{
  'pricing-table-id': string;
  'publishable-key': string;
}> => {
  return await axios
    .get('/payments/pricing_table/')
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return [];
    });
};

/**
 * Create customer portal session for subscription management
 * @returns {Promise<{ portal_url: string }>} Portal URL and session data on success, empty object on error
 */
const getPaymentsPortal = async (): Promise<{ portal_url: string }> => {
  return await axios
    .post('/payments/customer_portal/')
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      showErrorMessage(err);
      return {};
    });
};

export { getPricingTableInfo, getPaymentsPortal };
