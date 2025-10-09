import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  Typography,
  styled
} from '@mui/material';
import { CustomTextField } from '../StyledComponents';
import SettingHeader from '../SettingsHeader';
import { useDebounce } from 'hooks/useDebounce';
import useSettingsStore from 'contexts/useSettingsStore';
import { UserInput } from 'types/template';
import { getMatchesByRegex } from 'utils/utils';

const CustomStack = styled(Stack)(({ theme }) => ({
  backgroundColor: theme.palette.common.white,
  '&.small': {
    width: '33.33%'
  },
  '&.auto': {
    flex: 1
  },
  '&.middle': {
    width: 'calc(50% - 8px)'
  },
  '&.large': {
    width: '100%'
  },
  '& textarea': {
    scrollbarWidth: 'none'
  }
}));

interface TemplateInputsProps {
  templateUserInputs?: UserInput[];
  handleUpdateDocument: (settings: any) => void;
}

const TemplateInputs = ({
  templateUserInputs = [],
  handleUpdateDocument
}: TemplateInputsProps) => {
  const matchedSlugRegex = /\{([^\}]+)\}/g;

  const { setUserInputs, user_inputs: userInputs = {} } = useSettingsStore(
    (state) => state
  );
  const [templateInputs, setTemplateInputs] = useState<Record<string, string>>(
    {}
  );
  const debouncedTemplateInputs = useDebounce(templateInputs, 800);

  const userInputRef = useRef<string | null>(null);
  const insertedRef = useRef<boolean>(false);

  const getSuggestedText = useCallback(
    (defaultValue: string, isPlaceholder = false) => {
      if (!getMatchesByRegex(defaultValue, matchedSlugRegex)) {
        return defaultValue;
      }

      const defaultValuesInputs = isPlaceholder
        ? templateUserInputs.reduce<Record<string, string>>(
            (acc, { slug, default_value }) => {
              acc[slug] = default_value ?? '';
              return acc;
            },
            {}
          )
        : {};

      return defaultValue.replace(matchedSlugRegex, (_, slug) => {
        return isPlaceholder
          ? defaultValuesInputs[slug]
          : templateInputs[slug] || userInputs[slug] || '';
      });
    },
    [templateInputs, userInputs]
  );

  const isEnableSuggestionContext = useCallback(
    (defaultValue: string, key: string, value: string) => {
      const matches = getMatchesByRegex(defaultValue, matchedSlugRegex);
      if (!matches) return false;

      const suggestedText = getSuggestedText(defaultValue);
      const nonEmptyInputs = matches.every((match) => {
        const slug = match.replace(/\{|\}/g, '');
        const value = templateInputs[slug] || userInputs[slug] || '';
        return value.trim() !== '';
      });

      return (
        (userInputRef.current === key
          ? !insertedRef.current && value !== suggestedText
          : (templateInputs?.[key] ?? value) !== suggestedText) &&
        nonEmptyInputs
      );
    },
    [getSuggestedText, templateInputs, userInputs]
  );

  const handleInsert = useCallback(
    (slug: string, defaultValue: string) => {
      const suggestedText = getSuggestedText(defaultValue);
      setTemplateInputs((prev) => ({ ...prev, [slug]: suggestedText }));
      insertedRef.current = true;
    },
    [getSuggestedText]
  );

  const handleChange = useCallback(
    (slug: string, value: string, defaultValue: string) => {
      if (!getMatchesByRegex(defaultValue, matchedSlugRegex)) {
        insertedRef.current = false;
      }
      userInputRef.current = slug;

      setTemplateInputs((prev) => ({
        ...prev,
        [slug]: value.trim() === '' ? '' : value
      }));
    },
    []
  );

  const renderSuggestedContext = useCallback(
    (defaultValue: string) => {
      return defaultValue.split(matchedSlugRegex).map((part, index) => {
        if (index % 2 !== 0) {
          const slug = part;
          const value = templateInputs[slug] || userInputs[slug] || '';
          return (
            <span key={index} style={{ fontWeight: 500, letterSpacing: 0.1 }}>
              {value}
            </span>
          );
        }
        return part;
      });
    },
    [templateInputs, userInputs]
  );

  useEffect(() => {
    if (!Object.keys(debouncedTemplateInputs).length) return;
    const allInputs = { ...userInputs, ...debouncedTemplateInputs };
    handleUpdateDocument({ user_inputs: allInputs });
    setUserInputs(allInputs);
  }, [debouncedTemplateInputs]);

  return (
    <Box pb={3} className="draftSettings">
      <SettingHeader
        title="Input"
        titleLevel="subtitle1"
        isRequired
        popoverInfo={{
          content:
            'Provide detailed information about your topic to generate precise research tasks for your document. Use complete names for clarity and avoid using unclear abbreviations'
        }}
      />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '24px 16px'
        }}
      >
        {templateUserInputs.map(
          ({
            slug,
            text_limit,
            display_name,
            display_size = 'auto',
            default_value = '',
            value = ''
          }) => {
            const isMultiline = display_size.includes('large');
            const multilineRows = isMultiline
              ? display_size.match(/\d+(\.\d+)?/g)?.[0]
              : 1;
            const inputSize = isMultiline ? 'large' : display_size;
            return (
              <CustomStack key={slug} className={`${inputSize}`} gap={1}>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  lineHeight={1.37}
                  letterSpacing={0}
                >
                  {display_name}
                </Typography>
                <CustomTextField
                  multiline={isMultiline}
                  rows={multilineRows}
                  placeholder={`e.g. ${getSuggestedText(default_value, true)}`}
                  value={templateInputs?.[slug] ?? value}
                  slotProps={{
                    htmlInput: { maxLength: text_limit },
                    inputLabel: { sx: { scrollbarWidth: 'none' } }
                  }}
                  onChange={(e) =>
                    handleChange(slug, e.target.value, default_value)
                  }
                />
                {isEnableSuggestionContext(default_value, slug, value) && (
                  <Alert
                    icon={false}
                    severity="success"
                    sx={{ width: '100%' }}
                    action={
                      <Button
                        color="primary"
                        variant="outlined"
                        onClick={() => handleInsert(slug, default_value)}
                        sx={{
                          maxHeight: 24,
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.37
                        }}
                      >
                        Insert
                      </Button>
                    }
                  >
                    <AlertTitle sx={{ color: 'grey.600', fontSize: 12 }}>
                      Suggested Context
                    </AlertTitle>
                    <Typography
                      variant="body2"
                      lineHeight={1.45}
                      letterSpacing={0.15}
                      color="text.primary"
                    >
                      {renderSuggestedContext(default_value)}
                    </Typography>
                  </Alert>
                )}
              </CustomStack>
            );
          }
        )}
      </Box>
    </Box>
  );
};

export default memo(TemplateInputs);
