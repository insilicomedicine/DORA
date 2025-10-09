import { Section } from 'types/document';

export const getSectionsWithSubSections = (sections: Section[]): Section[] => {
  if (!sections) return [];
  const sectionsWithSubSections: Section[] = [];
  sections.forEach((section) => {
    if (section.sub_sections.length) {
      sectionsWithSubSections.push(section);
      sectionsWithSubSections.push(
        ...getSectionsWithSubSections(section.sub_sections)
      );
    }
  });
  return sectionsWithSubSections;
};
