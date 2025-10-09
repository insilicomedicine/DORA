import React, { memo, useCallback, useEffect, useState } from 'react';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TeamMembers from './components/TeamMembers';
import Resources from './components/Resources';
import { getAgents } from 'services/templates';
import {
  SelectedOptions,
  getSelectedItemsBySourceKey,
  sourceKeyDependencies,
  SelectedOption,
  convertToOptionList,
  getSelectedItemsByDependencies,
  selectionSettingDependencies,
  getUserInputsData
} from 'utils/agentReport';
import AddCustomBibliography from '../AddCustomBibliography';
import { useParams } from 'react-router';
import useSettingsStore from 'contexts/useSettingsStore';
import SettingHeader from '../SettingsHeader';
import { convertToRecords } from 'utils/documentGeneration';
import { debounce, isEqual, cloneDeep } from 'utils/utils';
import { getSystemConfig } from 'utils/system';
import useSystemStore from 'contexts/useSystemStore';

interface AgentResourcesProps {
  handleUpdateDocument?: (settings: any) => void;
}

const AgentResources = ({
  handleUpdateDocument = () => {}
}: AgentResourcesProps) => {
  const { id: documentId = '' } = useParams();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectionList, setSelectionList] = useState<any>({});
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    teamMembers: [],
    resources: []
  });

  const storedSettings = useSettingsStore((state) => state);
  const {
    template_id,
    agents: defaultAgents = {},
    setAgents,
    custom_bibliographies: customBibliographies = [],
    setCustomBibliographyFilePks,
    setUploadingFiles = () => {}
  } = storedSettings;

  const { systemInfo } = useSystemStore();

  const [filesToAdd, setFilesToAdd] = useState<any>([]);
  const [
    filesFromPreviouslyUploadedDialog,
    setFilesFromPreviouslyUploadedDialog
  ] = useState<any>([]);

  const isCustomBibliographyEnabled = getSystemConfig(systemInfo, [
    'custom_bibliography'
  ]);

  const noAttachedFiles =
    !filesToAdd.length && !filesFromPreviouslyUploadedDialog.length;

  const getAgentData = (selectedOption) => {
    const agents: any = {};
    const selectedResourceKeys = selectedOption.resources.map(
      (item: any) => item.key
    );
    selectedOption.teamMembers?.forEach(
      ({ agents: agentList = [], resources = [] }) => {
        agentList.forEach((agent) => {
          agents[agent] = {
            resources: resources
              .filter((item: any) => selectedResourceKeys?.includes(item.value))
              ?.map((item: any) => item.value)
          };
        });
      }
    );
    return agents;
  };

  const debouncedUpdateDocument = useCallback(
    debounce((settings) => {
      handleUpdateDocument(settings);
    }, 800),
    []
  );

  const handleUploadedFiles = () => {
    const customBibliographyFilePks = getUserInputsData(
      [],
      filesToAdd,
      filesFromPreviouslyUploadedDialog
    )?.custom_bibliography_file_pks;

    setCustomBibliographyFilePks(customBibliographyFilePks);

    const storedCustomBibliographyFilePks = customBibliographies.map(
      (file) => file.object_id
    );

    if (!isEqual(customBibliographyFilePks, storedCustomBibliographyFilePks)) {
      const agents = getAgentData(selectedOptions);
      const toolKey = 'pubmed_abstract_similarity_search_tool';
      const pubmedAgent = agents?.[toolKey];

      const updatedAgents = {
        ...agents,
        ...(!noAttachedFiles &&
          !pubmedAgent?.resources?.includes('custom_bibliography') && {
            [toolKey]: {
              ...pubmedAgent,
              resources: [
                ...(pubmedAgent?.resources || []),
                'custom_bibliography'
              ]
            }
          })
      };

      setAgents(updatedAgents);
      handleUpdateDocument({
        agents: updatedAgents,
        custom_bibliography_file_pks: customBibliographyFilePks
      });
    }
  };

  const handleSaveAgnets = (options: any) => {
    setSelectedOptions(options);
    setAgents(getAgentData(options));

    const {
      template_id,
      user_inputs,
      custom_data,
      plan,
      custom_bibliography_file_pks
    } = storedSettings;

    const settings = {
      documentId,
      template_id,
      user_inputs,
      custom_data: convertToRecords(custom_data),
      agents: getAgentData(options),
      plan,
      custom_bibliography_file_pks: noAttachedFiles
        ? []
        : custom_bibliography_file_pks
    };
    debouncedUpdateDocument(settings);
  };

  const handleSelectedItems = (
    selections: any[] = [],
    sourceKey = 'teamMembers'
  ) => {
    const dependencieItems = getSelectedItemsBySourceKey(
      selections,
      selectionList,
      selectedOptions,
      sourceKey
    );
    const depSourceKey = sourceKeyDependencies[sourceKey];
    const options = {
      [sourceKey]: [...selections],
      [depSourceKey]: [...dependencieItems]
    } as SelectedOptions;

    handleSaveAgnets(options);
  };

  const toggleSelectionByDeps = (
    selections: any = {},
    settingDeps = {},
    isUntoggleable = true
  ) => {
    const updatedSelections = cloneDeep(selections);
    Object.keys(updatedSelections).forEach((key) => {
      if (!Array.isArray(updatedSelections[key])) return;
      updatedSelections[key].forEach((item) => {
        if (settingDeps[key]?.includes(item?.key)) {
          item.toggleable = isUntoggleable;
          item.defaultChecked = !isUntoggleable;
          item.checked = !isUntoggleable ? true : undefined;
        }
      });
    });
    return updatedSelections;
  };

  const handleUpdateAgentsSetting = () => {
    if (!selectionList.resources) return;
    const updatedSelections = toggleSelectionByDeps(
      selectionList,
      selectionSettingDependencies.customBibliographySettings,
      noAttachedFiles
    );
    setSelectionList({
      ...updatedSelections
    });

    const checkedResources = updatedSelections.resources.filter(
      (item) => item.checked
    );
    if (!checkedResources.length) return;

    setSelectedOptions({
      ...selectedOptions,
      resources: [...selectedOptions.resources, ...checkedResources]
    });
  };

  const checkFilesIsUploaded = () => {
    let filesUploaded = true;
    filesToAdd.forEach((file) => {
      if (file.status === 'loading') {
        filesUploaded = false;
      }
    });
    return filesUploaded;
  };

  useEffect(() => {
    if (!filesToAdd.length) return;
    setUploadingFiles(!checkFilesIsUploaded());
    if (checkFilesIsUploaded()) {
      handleUploadedFiles();
    }
  }, [filesToAdd]);

  useEffect(() => {
    handleUpdateAgentsSetting();
  }, [filesToAdd.length]);

  useEffect(() => {
    if (!selectionList.resources) return;
    handleUpdateAgentsSetting();
    handleUploadedFiles();
  }, [filesFromPreviouslyUploadedDialog.length]);

  useEffect(() => {
    if (!template_id) return;

    const fetchAgents = async () => {
      const response = await getAgents(template_id);
      if (!response) return;

      const teamMembers = response?.map((item: SelectedOption) =>
        convertToOptionList({ ...item, icon: item.icon || '🤖 ' })
      );
      const resources = response
        ?.map((item: SelectedOption) => item.resources)
        .flat()
        ?.map((item) =>
          convertToOptionList({
            ...item,
            key: item.value
          })
        );

      const selectionDependencies = {};
      response?.forEach((item: any) => {
        if (!item.resources.length) return;
        selectionDependencies[
          item.display_name?.replace(/\s/g, '_').toLowerCase()
        ] = item.resources;
      });

      setSelectionList({
        teamMembers,
        resources,
        selectionDependencies
      });

      let defaultTeamMembers: any[] = [];
      let defaultResources: any[] = [];

      if (Object.keys(defaultAgents).length) {
        defaultTeamMembers = teamMembers.filter((member) =>
          member.agents.some((agent) =>
            Object.keys(defaultAgents).includes(agent)
          )
        );
        defaultResources = Object.values(defaultAgents).reduce(
          (acc: any[], agent: any) => {
            acc.push(
              ...agent.resources.map((resource) =>
                resources.find((it) => it.key === resource)
              )
            );
            return acc;
          },
          []
        );
      } else {
        defaultTeamMembers = teamMembers?.filter(
          (item) => item.defaultChecked && !item.disabled
        );
        defaultResources = getSelectedItemsByDependencies(
          defaultTeamMembers,
          selectionDependencies,
          selectedOptions
        );
      }
      const options = {
        teamMembers: defaultTeamMembers,
        resources: defaultResources
      } as SelectedOptions;

      setSelectedOptions(options);
      setAgents(getAgentData(options));

      if (customBibliographies.length) {
        const savedFiles = customBibliographies.map((file) => ({
          ...file,
          pk: file.object_id,
          status: 'processed'
        }));
        setFilesFromPreviouslyUploadedDialog(savedFiles);
      }
      setIsLoading(false);
    };
    fetchAgents();
  }, [template_id]);

  return (
    <Stack>
      <Stack className="draftSettings">
        {isCustomBibliographyEnabled && (
          <>
            <AddCustomBibliography
              customHeader={
                <SettingHeader
                  title="Custom Bibliography"
                  popoverInfo={{
                    content:
                      'Upload your own files, such as research papers or reports. DORA will process your files into manageable chunks and use them, alongside external sources, as a knowledge database for document generation focused on your topic.'
                  }}
                  sx={{
                    flexDirection: 'row',
                    p: 0
                  }}
                />
              }
              headerTitle="Custom bibliography"
              filesToAdd={filesToAdd}
              setFilesToAdd={setFilesToAdd}
              filesFromPreviouslyUploadedDialog={
                filesFromPreviouslyUploadedDialog
              }
              setFilesFromPreviouslyUploadedDialog={
                setFilesFromPreviouslyUploadedDialog
              }
              style={{ padding: '16px 0 40px', marginBottom: 0 }}
            />
            <Divider />
          </>
        )}

        <SettingHeader
          title="Recourses and Team of Agent"
          titleLevel="subtitle1"
          isRequired
          popoverInfo={{
            content:
              'Choose from DORA agents and resources specializing in relevant fields to enhance your document. Select agents based on your research goals and data requirements.'
          }}
          sx={{ pb: 0 }}
        />
        <TeamMembers
          isLoading={isLoading}
          optionList={selectionList.teamMembers}
          selectedItems={selectedOptions?.teamMembers}
          handleSelectedItems={handleSelectedItems}
        />
        <Divider sx={{ mb: 1 }} />
        <Resources
          isLoading={isLoading}
          optionList={selectionList.resources}
          selectedItems={selectedOptions?.resources}
          handleSelectedItems={handleSelectedItems}
        />
      </Stack>
      <Divider />
    </Stack>
  );
};

export default memo(AgentResources);
