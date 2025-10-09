import { FileUploadStatuses } from '../types/file';
import { uniqBy } from './utils';

type SelectedOption = {
  key: string;
  label: string;
  icon: string;
  value: string;
  agents: string[];
  resources: string[];
  description: string;
  defaultChecked: boolean;
  checked?: boolean;
  toggleable: boolean;
  disabled: boolean;
};

type SelectedOptions = {
  teamMembers: SelectedOption[];
  resources: SelectedOption[];
};

const sourceKeyDependencies = {
  teamMembers: 'resources',
  resources: 'teamMembers'
};

const selectionSettingDependencies = {
  PMCPubMedSearchSettings: {
    resources: ['pubmed', 'pmc'],
    teamMembers: ['scientific_reference_finder']
  },
  customBibliographySettings: {
    resources: ['custom_bibliography'],
    teamMembers: ['scientific_reference_finder']
  }
};

const isSettingsDisabled = (
  depKey,
  settingKey,
  selectedOptions: Partial<SelectedOptions> | Record<string, string[]> = {}
) => {
  const dependencies = selectionSettingDependencies[settingKey]?.[depKey] || [];
  const selectedOptionResourcesKeys = selectedOptions[depKey]?.map(
    (item) => item.key || item
  );
  const deps = dependencies.filter((item) =>
    selectedOptionResourcesKeys?.includes(item)
  );
  const isDisabled = !deps.length;
  return isDisabled;
};

const getUserInputsData = (
  userInputs: any = [],
  filesToAdd: any = [],
  filesFromPreviouslyUploadedDialog: any = []
) => {
  const userInputValues: any = {};
  [...userInputs].forEach((input: any) => {
    const { slug } = input;
    if (!userInputValues[slug]) {
      userInputValues[slug] = input.default_value;
    }
  });

  const processedFiles = [...filesToAdd, ...filesFromPreviouslyUploadedDialog]
    .filter((file) => file.status === FileUploadStatuses.processed)
    .map((file) => file.pk);
  const customBibliographyFileIds = Array.from(new Set(processedFiles));

  const allUseInputs = { ...userInputValues };
  if (customBibliographyFileIds.length) {
    allUseInputs.custom_bibliography_file_pks = customBibliographyFileIds;
  }

  return allUseInputs;
};

const convertToOptionList = (props) => {
  const {
    key,
    icon = '',
    display_name: label = '',
    value = '',
    agents = [],
    resources = [],
    description = '',
    disabled = false,
    toggleable = true,
    checked_by_default: defaultChecked = false
  } = props;
  return {
    key: (key || label?.replace(/\s/g, '_')).toLowerCase(),
    icon,
    label: label,
    value: agents || value,
    agents,
    resources,
    description,
    defaultChecked: defaultChecked && !disabled,
    toggleable,
    disabled
  };
};

const getSelectedItemsByDependencies = (
  selections: any[] = [],
  selectionDependencies = {},
  selectedOptions: SelectedOptions = { teamMembers: [], resources: [] }
) => {
  let dependencieItems: any = [];
  selections.forEach((item) => {
    const deps: any = selectionDependencies[item.key] || [];

    const vaildSelectionResources = selectedOptions.resources?.filter(
      (resource) => !resource.disabled
    );

    let intersectionItems =
      deps.length > 1 && vaildSelectionResources.length
        ? [...deps].reduce((acc, element) => {
            const resource = vaildSelectionResources.find(
              (item) => item.key === element.value
            );
            return resource
              ? [...acc, { ...resource, ...element, checked_by_default: true }]
              : acc;
          }, [])
        : [...deps];

    intersectionItems = !intersectionItems.length
      ? [...deps]
      : intersectionItems;

    dependencieItems = uniqBy(
      [...dependencieItems, ...intersectionItems],
      'value'
    );
  });

  return dependencieItems
    .map((item) =>
      convertToOptionList({
        ...item,
        checked_by_default:
          item.checked_by_default === undefined || item.checked_by_default,
        key: item.value
      })
    )
    ?.filter((item) => item.defaultChecked);
};

const getSelectedItemsBySourceKey = (
  selections: any[] = [],
  selectionList: any = {},
  selectedOptions: SelectedOptions = { teamMembers: [], resources: [] },
  sourceKey: string
) => {
  const selectionDependencies = selectionList.selectionDependencies || {};
  let dependencieItems: any = [];
  if (sourceKey === 'teamMembers') {
    dependencieItems = getSelectedItemsByDependencies(
      selections,
      selectionDependencies,
      selectedOptions
    );
    return dependencieItems;
  }

  const selectionDependenciesKeys = Object.keys(selectionDependencies);
  const prevTeamMembersSelections = [...selectedOptions.teamMembers].filter(
    (item) => !selectionDependenciesKeys.includes(item.key)
  );
  selections.forEach((selection) => {
    const depKey =
      selectionDependenciesKeys.find((key) =>
        selectionDependencies[key]
          .filter((item) => !item.disabled)
          .map((item) => item.value?.replace(/\s/g, '_').toLowerCase())
          .includes(selection.key)
      ) || '';
    const deps = selectionDependencies[depKey];
    const teamMembersSelection = selectionList.teamMembers?.find(
      (item) => item.key === depKey
    );
    dependencieItems = deps
      ? [...dependencieItems, teamMembersSelection]
      : [...dependencieItems];
  });
  return [...prevTeamMembersSelections, ...dependencieItems];
};

export type { SelectedOption, SelectedOptions };

export {
  sourceKeyDependencies,
  selectionSettingDependencies,
  isSettingsDisabled,
  getUserInputsData,
  convertToOptionList,
  getSelectedItemsByDependencies,
  getSelectedItemsBySourceKey
};
