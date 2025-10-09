import { useState, useMemo, useCallback } from 'react';
import { BibliographyFile } from '../../../types';

interface UseSortedDataProps {
  data: BibliographyFile[];
  onOrderChange?: (ordering: string) => void;
}

interface UseSortedDataReturn {
  sortedData: BibliographyFile[];
  orderBy: string;
  order: 'asc' | 'desc';
  handleSort: (property: string) => void;
  getOrderingValue: () => string;
}

const useSortedData = ({
  data,
  onOrderChange
}: UseSortedDataProps): UseSortedDataReturn => {
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Convert MUI sorting to backend API ordering format
  const getOrderingValue = useCallback(() => {
    return order === 'asc' ? orderBy : `-${orderBy}`;
  }, [order, orderBy]);

  const handleSort = useCallback(
    (property: string) => {
      const newOrder = orderBy === property && order === 'asc' ? 'desc' : 'asc';
      setOrder(newOrder);
      setOrderBy(property);

      // If we have a callback for ordering changes, call it with the new ordering value
      if (onOrderChange) {
        const orderingValue = newOrder === 'asc' ? property : `-${property}`;
        onOrderChange(orderingValue);
      }
    },
    [orderBy, order, onOrderChange]
  );

  // Use client-side sorted data only if we don't have onOrderChange (server-side sorting)
  const sortedData = useMemo(() => {
    // If we're using server-side sorting, just return the data as-is
    if (onOrderChange) {
      return data;
    }

    // Otherwise, sort the data client-side
    return [...data].sort((a, b) => {
      // Special handling for name column which can be either name or filename
      if (orderBy === 'name') {
        const aName = a.name || a.filename || '';
        const bName = b.name || b.filename || '';

        if (order === 'asc') {
          return aName.localeCompare(bName);
        } else {
          return bName.localeCompare(aName);
        }
      }

      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  }, [data, orderBy, order, onOrderChange]);

  return {
    sortedData,
    orderBy,
    order,
    handleSort,
    getOrderingValue
  };
};

export default useSortedData;
