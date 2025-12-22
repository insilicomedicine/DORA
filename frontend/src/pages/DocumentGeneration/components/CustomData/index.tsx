import React, { memo, useState } from 'react';
import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material';
import SettingHeader from '../SettingsHeader';
import { AddRounded, WarningAmberRounded } from '@mui/icons-material';
import Dialog from 'components/Dialog';
import { CustomTextField } from '../StyledComponents';
import CustomDataItem from './components/CustomDataItem';
import { Template } from 'types/template';
import CascadingSectionSelect from './components/CascadingSectionSelect';
import useSettingsStore from 'contexts/useSettingsStore';
import {
  convertToRecords,
  convertToSectionKeys,
  getAllSlugsFromSections
} from 'utils/documentGeneration';
import { sendGA4Event } from 'utils/ga';

interface CustomDataProps {
  sectionsData?: Template;
  editMode?: string;
  handleUpdateDocument?: (settings: any) => void;
}

const CustomData = ({
  sectionsData,
  handleUpdateDocument = () => {}
}: CustomDataProps) => {
  const sections = sectionsData?.sections || [];
  const section_influences = sectionsData?.section_influences || {};

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<'Add' | 'Edit'>('Add');
  const [selectedSection, setSelectedSection] = useState<string[]>([
    sections[0]?.slug || ''
  ]);
  const [customDataContent, setCustomDataContent] = useState<string>('');
  const { custom_data: customData, setCustomData } = useSettingsStore(
    (state) => state
  );

  const flattenSections = (
    sectionsList: typeof sections,
    parentSlug: string = '',
    title: string = ''
  ): { slug: string; title: string }[] => {
    let flattened: { slug: string; title: string }[] = [];
    sectionsList.forEach((section) => {
      const fullSlug = parentSlug
        ? `${parentSlug},${section.slug}`
        : section.slug;
      flattened.push({
        slug: fullSlug,
        title: title ? `${title} / ${section.title}` : section.title
      });
      if (section.sub_sections) {
        flattened = [
          ...flattened,
          ...flattenSections(section.sub_sections, fullSlug, section.title)
        ];
      }
    });
    return flattened;
  };

  const flattenedSections = flattenSections(sections);

  const handleAddCustomData = () => {
    if (selectedSection.length > 0 && customDataContent) {
      const findTitlesBySlugs = (
        slugs: string[],
        sectionsList: typeof sections
      ): string[] => {
        let currentSections = sectionsList;
        const titles: string[] = [];

        for (const slug of slugs) {
          const currentSection = currentSections.find(
            (section) => section.slug === slug
          );
          if (currentSection) {
            titles.push(currentSection.title);
            currentSections = currentSection.sub_sections;
          }
        }

        return titles;
      };

      const sectionTitles = findTitlesBySlugs(selectedSection, sections);
      const key = selectedSection.join(',');
      const newCustomData = {
        ...customData,
        [key]: {
          slug: key,
          title: sectionTitles.join(' / '),
          description: customDataContent
        }
      };
      setCustomData(newCustomData);
      setCustomDataContent('');
      setIsDialogOpen(false);
      handleUpdateDocument({ custom_data: convertToRecords(newCustomData) });
      sendGA4Event('click_button', {
        button_type: 'Confirm Custom Data',
        location: 'model'
      });
    }
  };

  const handleDeleteCustomDataItem = (slug: string) => {
    const newCustomData = { ...customData };
    if (customData[slug]) {
      delete newCustomData[slug];
    } else {
      const key = slug.includes(',') ? slug?.split(',').pop()?.trim()! : slug;
      delete newCustomData[key];
    }
    setCustomData(newCustomData);
    handleUpdateDocument({ custom_data: convertToRecords(newCustomData) });
  };

  const handleItemClick = ({ slug = '', key = '' }) => {
    setSelectedSection(key.split(','));
    setCustomDataContent(
      (customData[slug] || customData[key])?.description || ''
    );
    setMode('Edit');
    setIsDialogOpen(true);
  };

  const renderDependenciesAlert = (slug: string) => {
    const affectedSections = section_influences[slug];
    if (affectedSections?.length) {
      const sectionTitles = affectedSections
        .map((depSlug) => sections.find((sec) => sec.slug === depSlug)?.title)
        .filter(Boolean);

      const formattedTitles =
        sectionTitles.length > 1
          ? `${sectionTitles.slice(0, -1).join(', ')}, and ${sectionTitles.at(-1)}`
          : sectionTitles[0];

      return (
        <Alert severity="warning" icon={<WarningAmberRounded />} sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={400} letterSpacing={0.1}>
            All data added to{' '}
            <span style={{ fontWeight: 500 }}>
              {sections.find((sec) => sec.slug === slug)?.title || ''}
            </span>{' '}
            will affect{' '}
            <span style={{ fontWeight: 500 }}>{formattedTitles}</span>.
          </Typography>
        </Alert>
      );
    }
    return null;
  };

  const hasSubSections = (selectedSection: string[]) => {
    const currentSection = sections.find(
      (section) => section.slug === selectedSection[selectedSection.length - 1]
    );
    return currentSection?.sub_sections?.length > 0;
  };

  const isDisabledAdd =
    getAllSlugsFromSections(sections)?.length ===
    convertToSectionKeys(sections, customData)?.length;

  return (
    <Box pb={2} className="draftSettings">
      <SettingHeader
        title="Custom Data"
        description="Enrich template section by your draft or textual results"
        popoverInfo={{
          content:
            'Add draft content, notes, results, or ideas for discussion. DORA will integrate this information into the final document, aligning it with relevant sections. Ensure you update the research plan after adding custom data'
        }}
      />
      {flattenedSections.map(({ slug, title }) => {
        const _slug = slug?.split(',').pop()?.trim()!;
        const data = customData[slug] || customData[_slug];
        return (
          data && (
            <CustomDataItem
              key={slug}
              itemData={{ slug, title, ...data }}
              handleItemClick={() => handleItemClick({ ...data, key: slug })}
              handleDelete={() => handleDeleteCustomDataItem(slug)}
            />
          )
        );
      })}
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddRounded fontSize="xsmall" />}
        sx={{
          textTransform: 'none',
          height: 30
        }}
        onClick={() => {
          setMode('Add');
          setCustomDataContent('');
          setIsDialogOpen(true);
        }}
        disabled={isDisabledAdd}
        data-ga-event="Add Custom Data"
      >
        Add Data
      </Button>
      {isDialogOpen && (
        <Dialog
          open={isDialogOpen}
          handleClose={() => {
            sendGA4Event('click_button', {
              button_type: 'Cancel Custom Data',
              location: 'model'
            });
            setIsDialogOpen(false);
          }}
          title={
            mode === 'Add'
              ? 'Add custom data to the document'
              : 'Edit Custom Data'
          }
          Content={
            <Stack sx={{ gap: 3, overflow: 'hidden', width: 600 }}>
              <Grid container rowSpacing={1} columnSpacing={2}>
                <CascadingSectionSelect
                  isEditMode={mode === 'Edit'}
                  sections={sections}
                  selectedSection={selectedSection}
                  setSelectedSection={setSelectedSection}
                />
              </Grid>
              <Stack>
                <Typography variant="body2" fontWeight={500} mb={1}>
                  Custom Data
                </Typography>
                <CustomTextField
                  multiline
                  minRows={5}
                  maxRows={20}
                  placeholder="Add your custom text here (e.g., experimental data, comments)."
                  value={customDataContent}
                  slotProps={{
                    input: {
                      sx: {
                        borderRadius: 2,
                        pt: 1,
                        pl: 1,
                        textarea: {
                          pr: 4.5,
                          mr: -1.5,
                          scrollbarGutter: 'stable',
                          overflowY: 'auto'
                        }
                      }
                    }
                  }}
                  onChange={(e) => {
                    const { value } = e.target;
                    const customDataContent = value.trim() === '' ? '' : value;
                    setCustomDataContent(customDataContent);
                  }}
                />
                {renderDependenciesAlert(selectedSection[0])}
              </Stack>
            </Stack>
          }
          enableLeftBtn={mode === 'Edit'}
          leftBtnText="Delete"
          leftBtnAction={() => {
            handleDeleteCustomDataItem(selectedSection.join(','));
            sendGA4Event('click_button', {
              button_type: 'Delete Custom Data',
              location: 'main_form'
            });
          }}
          actionBtnTexts={{ confirm: 'Confirm' }}
          disableConfirmButton={
            !customDataContent || hasSubSections(selectedSection)
          }
          handleConfirm={handleAddCustomData}
          sx={{
            '& .MuiPaper-root': {
              maxWidth: 'unset'
            }
          }}
        />
      )}
    </Box>
  );
};

export default memo(CustomData);
