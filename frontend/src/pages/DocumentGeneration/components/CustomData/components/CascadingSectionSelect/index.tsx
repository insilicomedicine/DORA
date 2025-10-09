import React, { memo, useEffect } from 'react';
import { Box } from '@mui/material';
import CustomSelect from '../../../CustomSelect';
import SettingHeader from '../../../SettingsHeader';
import useSettingsStore from 'contexts/useSettingsStore';
import {
  convertToSectionKeys,
  findTargetSectionBySlug
} from 'utils/documentGeneration';

interface Section {
  slug: string;
  title: string;
  isNew?: boolean;
  sub_sections: Section[];
  description: string;
  popoverInfo: {
    content: string;
  };
}

interface CascadingSectionSelectProps {
  isEditMode: boolean;
  sections: Section[];
  selectedSection: string[]; // Tracks the selected path as an array of slugs
  setSelectedSection: (selected: string[]) => void;
}

const getSectionExtraInfoByLevel = (level: number) => {
  const info = {
    0: {
      description: 'Choose where to place your data',
      popoverInfo: {
        content:
          'DORA ensures logical flow and coherence by interlinking sections through a shared memory system. Data-centric sections are generated first, storing key insights for later use in descriptive sections like the Introduction and Abstract. This approach guarantees consistency and well-structured outputs across your entire research document.'
      }
    }
  };
  return (
    info[level] || {
      description: 'Choose the specific subsection for your data'
    }
  );
};

const CascadingSectionSelect = ({
  sections,
  selectedSection,
  setSelectedSection,
  isEditMode = false
}: CascadingSectionSelectProps) => {
  const { custom_data: customData = {} } = useSettingsStore((state) => state);
  const enhancedSections = convertToSectionKeys(sections, customData);

  const handleSelectionChange = (e: any, level: number) => {
    setSelectedSection([...selectedSection.slice(0, level), e.target.value]);
  };

  //Initial selection of the first available section
  useEffect(() => {
    if (sections.length && !isEditMode) {
      for (const section of sections) {
        const validSubSections = section.sub_sections.filter(
          (subSection) => !enhancedSections.includes(subSection.slug)
        );
        if (validSubSections.length > 0) {
          setSelectedSection([section.slug, validSubSections[0].slug]);
          return;
        }
        if (!enhancedSections.includes(section.slug)) {
          setSelectedSection([section.slug]);
          return;
        }
      }
    }
  }, [sections]);

  //Auto select the first available subsection if the selected section is changed
  useEffect(() => {
    if (!selectedSection.length) return;
    const selectedValue = [...selectedSection].pop();
    if (!selectedValue) return;
    const targetSection = findTargetSectionBySlug(sections, selectedValue);
    if (!targetSection) return;
    const { sub_sections: subSections = [] } = targetSection || {};
    if (!subSections.length) return;
    const validSubSections = subSections.filter(
      (subSection) => !enhancedSections.includes(subSection.slug)
    );
    if (!validSubSections.length) return;
    setSelectedSection([targetSection.slug, validSubSections[0].slug]);
  }, [selectedSection]);

  const renderDropdowns = (
    sections: Section[],
    level: number
  ): React.ReactElement | null => {
    if (!sections?.length) return null;

    let selectedValue = selectedSection[level] || sections[0].slug || '';
    if (
      selectedValue &&
      enhancedSections.includes(selectedValue) &&
      !isEditMode
    ) {
      selectedValue =
        sections.filter((item) => !enhancedSections.includes(item.slug))[0]
          ?.slug || '';
    }

    const options = sections.map(({ slug, title, isNew = false }) => ({
      key: slug,
      value: slug,
      label: title,
      isNew
    }));

    const currentSection = sections.find(({ slug }) => slug === selectedValue);
    const { description = '', popoverInfo = {} } =
      getSectionExtraInfoByLevel(level);

    return (
      <>
        <Box sx={{ width: '50%' }}>
          <SettingHeader
            title={level === 0 ? 'Template section' : 'Subsection'}
            description={description}
            popoverInfo={{ content: popoverInfo?.content }}
            isRequired
            disableToolTip={level > 0}
            sx={{ pb: 1 }}
          />
          <CustomSelect
            options={options}
            value={selectedValue}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            onChange={(e: any) => handleSelectionChange(e, level)}
            sectionLevel={level}
            enhancedSections={enhancedSections}
            disabled={isEditMode}
          />
        </Box>
        {currentSection?.sub_sections &&
          renderDropdowns(currentSection.sub_sections, level + 1)}
      </>
    );
  };

  return renderDropdowns(sections, 0);
};

export default memo(CascadingSectionSelect);
