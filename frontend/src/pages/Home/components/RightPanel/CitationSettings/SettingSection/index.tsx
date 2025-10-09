import React, { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import InfoButton from 'components/InfoButton';

export interface SettingsSectionHeaderProps {
  title: string;
  className?: string;
  isDisabled?: boolean;
  popoverInfo: string | ReactNode;
}

const withSettingsSectionHeader = <P extends SettingsSectionHeaderProps>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => {
    const { title, isDisabled, popoverInfo } = props;
    return (
      <Stack sx={{ gap: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{title}</Typography>
          <InfoButton isDisabled={isDisabled} popoverInfo={popoverInfo} />
        </Stack>
        <WrappedComponent {...props} />
      </Stack>
    );
  };
};
export default withSettingsSectionHeader;
