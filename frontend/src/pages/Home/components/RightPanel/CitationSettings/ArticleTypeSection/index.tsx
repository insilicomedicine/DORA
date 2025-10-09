import {
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';

import JournalArticleIcon from 'assets/rightPanel/JournalArticle.svg?react';
import SystematicReviewIcon from 'assets/rightPanel/SystematicReview.svg?react';
import withSettingsSectionHeader, {
  SettingsSectionHeaderProps
} from '../SettingSection';
import { memo } from 'react';
import { sendGA4Event } from 'utils/ga';

//Article types
export const articleTypes = [
  {
    icon: <JournalArticleIcon />,
    text: 'Research article and Journal article',
    value: 'Journal Article'
  },
  {
    icon: <SystematicReviewIcon />,
    text: 'Review and Systematic review',
    value: 'Review, Systematic Review'
  }
];

interface ArticleTypeSectionProps extends SettingsSectionHeaderProps {
  settingsConfig: any;
  settings: any;
  handleUpdateSettings: (data: { article_types: string[] }) => void;
}

const ArticleTypeSection = (props: ArticleTypeSectionProps) => {
  const { isDisabled, settingsConfig, settings, handleUpdateSettings } = props;

  const renderArticleType = (type) => {
    if (type === 'checkbox') {
      return (
        <FormGroup sx={{ gap: 1, ml: 1 }}>
          {articleTypes.map((option, index) => {
            const isChecked = settingsConfig.article_types?.includes(
              option.value
            );
            return (
              <FormControlLabel
                key={index}
                control={
                  <Checkbox
                    size="small"
                    sx={{ p: 1 }}
                    checked={isChecked}
                    onChange={() => {
                      const articleTypes = settingsConfig.article_types || [];
                      const selectedTypes = articleTypes.includes(option.value)
                        ? articleTypes.filter((type) => type !== option.value)
                        : [...articleTypes, option.value];
                      handleUpdateSettings({
                        article_types: selectedTypes
                      });
                      sendGA4Event(
                        `click_checkbox_${isChecked ? 'off' : 'on'}`,
                        {
                          button_type: `${option.text}`,
                          location: 'search_settings'
                        }
                      );
                    }}
                  />
                }
                label={<Typography variant="body2">{option.text}</Typography>}
                disabled={isDisabled}
              />
            );
          })}
        </FormGroup>
      );
    }

    return (
      <ToggleButtonGroup
        color="primary"
        value={settingsConfig.article_types}
        sx={{
          display: 'flex',
          gap: 1
        }}
        onChange={(_e, value) => {
          handleUpdateSettings({
            article_types: value.filter(Boolean)
          });
        }}
        disabled={isDisabled}
      >
        {articleTypes.map((type, index) => (
          <ToggleButton
            disableRipple
            key={index}
            value={type.value}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center',
              padding: '16px 10px',
              borderRadius: '8px !important',
              border: '1px solid #E0E0E0',
              maxWidth: '50%',
              textTransform: 'none',
              color: 'text.primary',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.45,
              cursor: 'pointer',
              gap: 1,
              '&:hover': {
                borderColor: '#C4C4C4',
                backgroundColor: 'grey.50'
              },
              '&.Mui-selected': {
                color: 'text.primary',
                borderColor: '#9FDBBB',
                backgroundColor: 'primary.light',
                fontWeight: 500
              },
              '&.MuiToggleButtonGroup-grouped.Mui-selected.Mui-disabled': {
                borderColor: '#C4C4C4',
                backgroundColor: '#F2F2F2',
                color: 'text.secondary',

                '&.MuiToggleButtonGroup-lastButton': {
                  borderLeft: '1px solid #C4C4C4'
                },
                '& svg': {
                  fill: '#666666'
                }
              },
              '&.Mui-disabled': {
                '&.MuiToggleButtonGroup-lastButton': {
                  borderLeftColor: 'grey.300'
                },
                '& svg': {
                  height: 17.5
                }
              }
            }}
          >
            {type.icon}
            {type.text}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  };
  return (
    <>
      {renderArticleType(settingsConfig.type)}
      {!settingsConfig.article_types?.length && (
        <Alert severity="info" color="info">
          {settings
            ? 'All types (over 50) used since no filter was set'
            : `If nothing is selected in this filter, all existing types (over 50)
        will be used.`}
        </Alert>
      )}
    </>
  );
};

export default memo(withSettingsSectionHeader(ArticleTypeSection));
