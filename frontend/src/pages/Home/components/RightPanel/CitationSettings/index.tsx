import React, { ReactNode, useEffect, useState, memo } from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Switch,
  SxProps,
  Theme,
  Typography
} from '@mui/material';

import { getCitationSettings, updateCitationSettings } from 'services/user';
import InfoButton from 'components/InfoButton';
import { useDebounce } from 'hooks/useDebounce';
import PublicationDateSection from './PublicationDateSection';
import ArticleTypeSection, { articleTypes } from './ArticleTypeSection';
import { sendGA4Event } from 'utils/ga';
import { theme } from 'theme';

const citationSettingsInfos = {
  citationSettings: `DORA automatically creates a bibliography tailored to your research, curating relevant papers based on your settings. It refines queries across millions of scientific texts for precise and reliable document generation.`,
  publicationDate: `Articles will be filtered by publication date to generate the document.`,
  articleTypes: `Articles will be filtered by type to generate the document.
  If none are selected, all existing types (over 50) will be used.`
};

type CitationSettingsState = {
  publication_date: string;
  article_types: string[];
  top_cited: boolean;
};

interface CitationSettingsProps {
  sx?: SxProps<Theme>;
  title?: string | ReactNode;
  mode?: 'readonly' | 'normal' | 'disabled';
  settings?: Partial<CitationSettingsState>;
  className?: string;
  configs?: any;
}

const CitationSettings = ({
  sx = {},
  mode = 'normal',
  title = 'Citation settings',
  settings,
  className,
  configs: {
    header: headerConfig = {},
    publicationDate: publicationDateConfig = {},
    articleType: articleTypeConfig = {}
  } = {}
}: CitationSettingsProps) => {
  const convertArticleTypes = (types: string[] = []) => {
    if (types.includes('Review')) {
      const { value = '' } =
        articleTypes.find((type) => type.value.includes('Review')) || {};
      if (types.length > 2) {
        return ['Journal Article', value];
      }
      return [value];
    }
    return types;
  };
  const isReadOnly = mode === 'readonly';
  const isDisabled = isReadOnly || mode === 'disabled';
  const [isLoading, setIsLoading] = useState<boolean>(!settings);
  const [updateSettingCount, setUpdateSettingCount] = useState<number>(0);
  const [citationSettings, setCitationSettings] = useState<
    Partial<CitationSettingsState>
  >({
    ...settings,
    article_types: convertArticleTypes(settings?.article_types)
  });
  const debounceUpdateSettingCount = useDebounce(updateSettingCount, 800);

  const handleUpdateCitationSettings = (setting) => {
    setCitationSettings({
      ...citationSettings,
      ...setting
    });
    setUpdateSettingCount(updateSettingCount + 1);
  };

  const handleSaveCitationSettings = async () => {
    let articleTypes = citationSettings.article_types || [];
    if (articleTypes?.length) {
      articleTypes = articleTypes
        .map((type) => type.split(', '))
        .flat()
        .filter(Boolean);
    }
    await updateCitationSettings({
      ...citationSettings,
      article_types: articleTypes
    });
  };

  useEffect(() => {
    if (settings) return;
    const fetchCitationSettings = async () => {
      const response = await getCitationSettings();
      if (!response) {
        setIsLoading(false);
        return;
      }

      setCitationSettings({
        ...response,
        article_types: convertArticleTypes(response.article_types)
      });
      setIsLoading(false);
    };
    fetchCitationSettings();
  }, []);

  useEffect(() => {
    if (!debounceUpdateSettingCount) {
      return;
    }
    handleSaveCitationSettings();
  }, [debounceUpdateSettingCount]);

  if (isLoading) {
    return (
      <Stack
        sx={{
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minWidth: '50%'
        }}
      >
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Box
      gap={2}
      display="flex"
      flexDirection="column"
      p="8px 16px"
      maxWidth={392}
      sx={{
        ...(sx || {}),
        ...(isReadOnly && {
          pointerEvents: 'none',
          padding: 0,
          gap: 1,
          '& .MuiTypography-body1, & .MuiTypography-subtitle1': {
            fontSize: 14
          },
          '& .MuiTypography-subtitle2': {
            fontSize: 12,
            '& svg': {
              display: 'none'
            }
          },
          '& button, & .MuiTypography-body2, & .MuiAlert-root': {
            fontSize: 12,
            letterSpacing: 0,
            '& .MuiAlert-message': {
              padding: '4px 0'
            },
            '& img': {
              width: '13%'
            }
          },
          '& .MuiAlert-icon': {
            display: 'none'
          },
          '& .MuiFormControlLabel-root': {
            padding: 0
          },
          '& .MuiFormControlLabel-label.Mui-disabled': {
            color: theme.palette.text.primary
          },
          '& .MuiRadio-root': {
            padding: '2px 9px'
          }
        })
      }}
      className={className}
    >
      {title || (
        <Typography
          variant="body2"
          p="4px 0"
          fontWeight={500}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {title}
          {!isReadOnly && !headerConfig.disableInfoButton && (
            <InfoButton
              sx={{ marginLeft: 'auto' }}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
              popoverInfo={citationSettingsInfos.citationSettings}
            />
          )}
        </Typography>
      )}

      <PublicationDateSection
        title="Publication date"
        isDisabled={isDisabled}
        popoverInfo={citationSettingsInfos.publicationDate}
        settingsConfig={{
          publication_date: citationSettings.publication_date,
          sx: publicationDateConfig?.sx
        }}
        handleUpdateSettings={handleUpdateCitationSettings}
      />

      <ArticleTypeSection
        title="Article type"
        isDisabled={isDisabled}
        popoverInfo={citationSettingsInfos.articleTypes}
        settingsConfig={{
          type: articleTypeConfig?.type,
          article_types: citationSettings.article_types
        }}
        settings={settings}
        handleUpdateSettings={handleUpdateCitationSettings}
      />

      <Stack
        sx={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: '6px 0'
        }}
      >
        <Stack sx={{ p: '4px 0' }}>
          <Typography variant="subtitle1">Top-cited</Typography>
          <Typography color="text.secondary" variant="body2">
            {settings
              ? settings.top_cited
                ? 'Top-cited articles prioritized'
                : 'Top-cited articles were not prioritized'
              : 'Prioritizing top-cited articles for generation'}
          </Typography>
        </Stack>
        <Switch
          onChange={() => {
            const isChecked = citationSettings.top_cited;
            handleUpdateCitationSettings({
              top_cited: !isChecked
            });
            sendGA4Event(`click_checkbox_${isChecked ? 'off' : 'on'}`, {
              button_type: 'Top-cited',
              location: 'search_settings'
            });
          }}
          checked={citationSettings.top_cited}
          disabled={isDisabled}
          size={settings ? 'small' : 'medium'}
          sx={{ switchBase: { color: '#F8F8F8' } }}
        />
      </Stack>
    </Box>
  );
};

export default memo(CitationSettings);
