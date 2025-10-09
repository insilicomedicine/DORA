import React, { memo } from 'react';
import {
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Typography
} from '@mui/material';
import withSettingsSectionHeader, {
  SettingsSectionHeaderProps
} from '../SettingSection';
import { sendGA4Event } from 'utils/ga';

const publicationDateOptions = [
  {
    value: 'all',
    label: 'All',
    subLabel: 'Since 2010'
  },
  {
    value: 'last_5_years',
    label: 'Last 5 years'
  },
  {
    value: 'last_10_years',
    label: 'Last 10 years'
  }
];

interface SettingsConfig {
  publication_date?: string;
  type?: string;
  article_types?: string[];
  sx?: any;
}

interface PublicationDateSectionProps extends SettingsSectionHeaderProps {
  settingsConfig: SettingsConfig;
  isDisabled: boolean;
  handleUpdateSettings: (data: { publication_date: string }) => void;
}

const PublicationDateSection = (props: PublicationDateSectionProps) => {
  const { settingsConfig, handleUpdateSettings, isDisabled } = props;
  return (
    <RadioGroup
      value={settingsConfig.publication_date}
      sx={{ width: '100%', ...settingsConfig?.sx }}
    >
      {publicationDateOptions.map((option, index) => (
        <FormControlLabel
          key={index}
          value={option.value}
          control={<Radio size="small" disabled={isDisabled} />}
          label={
            <Stack sx={{ p: '5px 0' }}>
              <Typography variant="body2">{option.label}</Typography>
              {option.subLabel && (
                <Typography color="text.secondary" variant="caption">
                  {option.subLabel}
                </Typography>
              )}
            </Stack>
          }
          onChange={() => {
            handleUpdateSettings({
              publication_date: option.value
            });
            sendGA4Event('click_button', {
              button_type: option.label,
              location: 'search_settings'
            });
          }}
          sx={{ p: '5px 0', mr: 0 }}
        />
      ))}
    </RadioGroup>
  );
};

export default memo(withSettingsSectionHeader(PublicationDateSection));
