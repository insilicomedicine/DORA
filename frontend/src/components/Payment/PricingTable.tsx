import React, { useEffect, useState } from 'react';
import { getPricingTableInfo } from 'services/payments';
import { useUserStore } from 'contexts/useUserStore';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const PricingTable = () => {
  const { userInfo } = useUserStore();
  const [pricingTable, setPricingTable] = useState<{
    pricingTableId?: string;
    publishableKey?: string;
  }>({});

  useEffect(() => {
    const fetchPricingTable = async () => {
      const response = await getPricingTableInfo();
      setPricingTable({
        pricingTableId: response['pricing-table-id'],
        publishableKey: response['publishable-key']
      });
    };
    fetchPricingTable();
  }, []);

  const { pricingTableId, publishableKey } = pricingTable;

  if (!pricingTableId || !publishableKey) {
    return (
      <Box display="flex" justifyContent="center" mt={20}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return React.createElement('stripe-pricing-table', {
    'pricing-table-id': pricingTableId,
    'publishable-key': publishableKey,
    'customer-email': userInfo.email
  });
};

export default PricingTable;
