import React from 'react';
import { Stack, Typography } from '@mui/material';

const MetricItem = ({
  label,
  value,
  unit = ''
}: {
  label: string;
  value: number | string;
  unit?: string;
}) => (
  <Stack direction="row" sx={{ alignItems: 'center', fontSize: 14 }}>
    {label}:
    <Typography variant="body2" fontWeight={700} sx={{ ml: 0.5 }}>
      {value}
    </Typography>
    {unit && (
      <Typography variant="body2" fontWeight={700} sx={{ ml: 0.5 }}>
        {unit}
      </Typography>
    )}
  </Stack>
);

export default MetricItem;
