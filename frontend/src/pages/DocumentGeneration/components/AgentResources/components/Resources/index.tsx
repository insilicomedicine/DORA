import React, { memo } from 'react';
import SelectionPanel from '../SelectionPanel';
import { SelectedOption } from 'utils/agentReport';

interface ResourcesProps {
  isLoading?: boolean;
  optionList: any[];
  selectedItems?: SelectedOption[];
  handleSelectedItems?: (_items: string[], _sourceKey: string) => void;
}

const Resources = ({
  isLoading = false,
  optionList = [],
  selectedItems = [],
  handleSelectedItems = () => {}
}: ResourcesProps) => {
  return (
    <SelectionPanel
      isLoading={isLoading}
      sourceKey="resources"
      GA4SourceType="Resource"
      title="Resources"
      options={optionList}
      suggestAction={{
        label: 'Suggest resource',
        type: 'resource',
        placeholder: 'Resource description',
        description: 'Describe resource you would like to see in DORA'
      }}
      selectedItems={selectedItems}
      setSelectedItems={handleSelectedItems}
    />
  );
};

export default memo(Resources);
