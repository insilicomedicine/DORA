import React from 'react';
import Typography from '@mui/material/Typography';
import { templateIcons as originalTemplateIcons } from 'utils/templates';
import { convertToKey } from 'utils/utils';
import DeepResearchIcon from 'assets/icons/DeepResearchIcon.svg?react';

function Icons({ type, size = 20, color = '' }) {
  const key = convertToKey(type);
  if (key === 'deepresearch') {
    return (
      <Typography
        variant="caption"
        lineHeight={0}
        sx={{ minWidth: size, '& svg': { color } }}
      >
        <DeepResearchIcon width={size} height={size} />
      </Typography>
    );
  }

  const icon = originalTemplateIcons[key]?.icon;
  if (!icon) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        lineHeight: `${size}px`
      }}
    >
      {icon}
    </span>
  );
}

export default Icons;
