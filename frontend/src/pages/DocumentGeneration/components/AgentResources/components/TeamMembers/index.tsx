import React, { memo } from 'react';
import SelectionPanel from '../SelectionPanel';
import { SelectedOption } from 'utils/agentReport';

interface TeamMembersProps {
  isLoading?: boolean;
  optionList?: [];
  selectedItems?: SelectedOption[];
  handleSelectedItems?: (_items: string[], _sourceKey: string) => void;
}

const TeamMembers = ({
  isLoading = false,
  optionList = [],
  selectedItems = [],
  handleSelectedItems
}: TeamMembersProps) => {
  return (
    <SelectionPanel
      isLoading={isLoading}
      sourceKey="teamMembers"
      GA4SourceType="Agent"
      title="Team Members for your research"
      options={optionList}
      suggestAction={{
        label: 'Suggest agent',
        type: 'agent',
        placeholder: 'Agent description',
        description: ' Describe agent you would like to see in DORA'
      }}
      selectedItems={selectedItems}
      setSelectedItems={handleSelectedItems}
    />
  );
};

export default memo(TeamMembers);
