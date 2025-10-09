type SubSection = {
  slug: string;
  title: string;
  sub_sections: SubSection[];
};

type Section = {
  slug: string;
  title: string;
  sub_sections: SubSection[];
};

type CustomData = {
  [key: string]: {
    slug: string;
    title: string;
    description: string;
  };
};

function getAllSlugsFromSections(sections: Section[]): string[] {
  let slugs: string[] = [];
  for (const section of sections) {
    slugs.push(section.slug);
    if (section.sub_sections && section.sub_sections.length > 0) {
      slugs = slugs.concat(getAllSlugsFromSections(section.sub_sections));
    }
  }
  return slugs;
}

const transformCustomData = (customData = {}) => {
  return Object.entries(customData).reduce((acc, [key, value]) => {
    acc[key] = { slug: key, description: value };
    return acc;
  }, {});
};

const convertToRecords = (input: Record<string, any>): Record<string, any> => {
  const output: Record<string, any> = {};
  Object.keys(input).forEach((key) => {
    const keys = key?.split(',');
    const _key = keys[keys.length - 1]?.trim();
    output[_key] = input[key].description;
  });
  return output;
};

const convertToUserInputs = (
  inputs: Record<string, any>[] = []
): Record<string, any> => {
  return inputs.reduce(
    (acc, input) => {
      acc[input.slug] = input.value || '';
      return acc;
    },
    {} as Record<string, any>
  );
};

const convertToSectionKeys = (
  sections: Section[],
  customData: CustomData
): string[] => {
  const sectionKeys: string[] = [];

  const customDataMap = new Map<string, boolean>(
    Object.keys(customData).map((key) => [key, true])
  );

  const collectKeys = (sections: Section[]) => {
    sections.forEach((section) => {
      if (customDataMap.has(section.slug)) {
        sectionKeys.push(section.slug);
      }

      const subSectionsCount = section.sub_sections.length;
      let addedCount = 0;
      section.sub_sections.forEach((subSection) => {
        const combinedSlug = `${section.slug},${subSection.slug}`;
        if (
          customDataMap.has(combinedSlug) ||
          customDataMap.has(`${subSection.slug}`)
        ) {
          sectionKeys.push(subSection.slug);
          addedCount = addedCount + 1;
        }
        if (addedCount >= subSectionsCount) {
          sectionKeys.push(section.slug);
        }

        if (subSection?.sub_sections?.length > 0) {
          collectKeys(subSection.sub_sections);
        }
      });
    });
  };

  collectKeys(sections);

  return sectionKeys;
};

const getTooltipTitle = (
  uploadingFiles: boolean,
  researchTasks: string,
  isInProgressDocumentsLimited: boolean
) => {
  if (uploadingFiles) {
    return 'Wait until all custom bibliography files are completed';
  }
  if (!researchTasks) {
    return 'Research tasks cannot be empty';
  }
  if (isInProgressDocumentsLimited) {
    return 'Please wait until at least one document generation is completed';
  }
  return '';
};

const findTargetSectionBySlug = (sections: Section[], target: string) => {
  for (const section of sections) {
    if (section.slug === target) {
      return section;
    }
    if (section.sub_sections) {
      const targetSection = findTargetSectionBySlug(
        section.sub_sections,
        target
      );
      if (targetSection) {
        return targetSection;
      }
    }
  }
  return null;
};

export {
  getAllSlugsFromSections,
  transformCustomData,
  convertToRecords,
  convertToSectionKeys,
  convertToUserInputs,
  getTooltipTitle,
  findTargetSectionBySlug
};
