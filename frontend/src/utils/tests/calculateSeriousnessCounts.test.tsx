import { calculateSeriousnessCounts } from '../reviewInsights';
import { ReviewCategorySuggestion } from 'types/document';

describe('calculateSeriousnessCounts', () => {
  it('should return an empty object when given an empty array', () => {
    const suggestions: ReviewCategorySuggestion[] = [];
    const result = calculateSeriousnessCounts(suggestions);
    expect(result).toEqual({});
  });

  it('should correctly count the seriousness levels', () => {
    const suggestions: ReviewCategorySuggestion[] = [
      { seriousness: 'high', text: 'performance' },
      { seriousness: 'low', text: 'usability' },
      { seriousness: 'high', text: 'security' },
      { seriousness: 'medium', text: 'performance' },
      { seriousness: 'low', text: 'usability' }
    ];
    const result = calculateSeriousnessCounts(suggestions);
    expect(result).toEqual({ high: 2, low: 2, medium: 1 });
  });

  it('should handle suggestions with the same seriousness level', () => {
    const suggestions: ReviewCategorySuggestion[] = [
      { seriousness: 'medium', text: 'performance' },
      { seriousness: 'medium', text: 'usability' },
      { seriousness: 'medium', text: 'security' }
    ];
    const result = calculateSeriousnessCounts(suggestions);
    expect(result).toEqual({ medium: 3 });
  });

  it('should handle suggestions with different seriousness levels', () => {
    const suggestions: ReviewCategorySuggestion[] = [
      { seriousness: 'high', text: 'performance' },
      { seriousness: 'low', text: 'usability' },
      { seriousness: 'medium', text: 'security' }
    ];
    const result = calculateSeriousnessCounts(suggestions);
    expect(result).toEqual({ high: 1, low: 1, medium: 1 });
  });
});
