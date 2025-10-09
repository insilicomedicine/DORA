import { theme } from 'theme';
import {
  ReviewCategorySuggestion,
  ReviewSuggestionSeriousnessLevels
} from 'types/document';

const calculateSeriousnessCounts = (suggestions: ReviewCategorySuggestion[]) =>
  suggestions.reduce((counts, suggestion) => {
    counts[suggestion.seriousness] = (counts[suggestion.seriousness] || 0) + 1;
    return counts;
  }, {});

const seriousnessLevels = () => {
  return [
    {
      level: ReviewSuggestionSeriousnessLevels.high,
      //@ts-ignore
      color: theme.components.MuiAlert.styleOverrides.standardError.color,
      borderColor: theme.palette.secondary.light,
      activeColor:
        //@ts-ignore
        theme.components.MuiAlert.styleOverrides.standardError.backgroundColor
    },
    {
      level: ReviewSuggestionSeriousnessLevels.medium,
      color: theme.palette.warning.main,
      borderColor: '#F5B580', // out of theme
      activeColor:
        //@ts-ignore
        theme.components.MuiAlert.styleOverrides.standardWarning.backgroundColor
    },
    {
      level: ReviewSuggestionSeriousnessLevels.low,
      color: theme.palette.common.black,
      borderColor: '#A5A5A5', // out of theme
      activeColor:
        //@ts-ignore
        theme.components.MuiAlert.styleOverrides.standardInfo.backgroundColor
    }
  ];
};

const getBorderRightColorBySeriousness = (seriousness) => {
  switch (seriousness) {
    case ReviewSuggestionSeriousnessLevels.high:
      return theme.palette.error.main;
    case ReviewSuggestionSeriousnessLevels.medium:
      return '#FFB547'; // out of theme
    case ReviewSuggestionSeriousnessLevels.low:
      return theme.palette.text.disabled;
  }
};

export {
  calculateSeriousnessCounts,
  seriousnessLevels,
  getBorderRightColorBySeriousness
};
