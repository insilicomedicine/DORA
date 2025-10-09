import { filterTemplatesByType } from '../templates';

describe('filterTemplatesByType', () => {
  const templates = [
    { id: 1, type: 'Type1', name: 'Template1' },
    { id: 2, type: 'Type2', name: 'Template2' },
    { id: 3, type: 'Type1', name: 'Template3' },
    { id: 4, type: 'Type3', name: 'Template4' }
  ];

  it('should return all templates when selectedType is "All templates"', () => {
    const result = filterTemplatesByType(templates, 'All templates');
    expect(result).toEqual(templates);
  });

  it('should return templates of the selected type', () => {
    const result = filterTemplatesByType(templates, 'Type1');
    expect(result).toEqual([
      { id: 1, type: 'Type1', name: 'Template1' },
      { id: 3, type: 'Type1', name: 'Template3' }
    ]);
  });

  it('should return an empty array if no templates match the selected type', () => {
    const result = filterTemplatesByType(templates, 'Type4');
    expect(result).toEqual([]);
  });

  it('should return an empty array if templates array is empty', () => {
    const result = filterTemplatesByType([], 'Type1');
    expect(result).toEqual([]);
  });

  it('should return an empty array if selectedType is an empty string', () => {
    const result = filterTemplatesByType(templates, '');
    expect(result).toEqual([]);
  });
});
