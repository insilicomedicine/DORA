import React, { memo, useState } from 'react';
import UserInputsDialog from './components/UserInputsDialog';
import { InfoOutlined } from '@mui/icons-material';
import { Stack, Tooltip } from '@mui/material';
import { Bibliography } from 'types/document';
import { UserInput } from 'types/template';
import { convertToKey } from 'utils/utils';
import Icons from 'pages/Templates/components/Icons';
import Typography from '@mui/material/Typography';

interface UserInputsProps {
  templateName: string;
  createdAt: string;
  userInputsData?: UserInput[];
  templateType: string;
  customBibliographies: Bibliography[];
  customData?: (Record<string, string> | null)[];
}

const UserInputs = ({
  templateName,
  createdAt,
  userInputsData,
  templateType,
  customBibliographies,
  customData
}: UserInputsProps) => {
  const [userInputsDialogIsOpen, setUserInputsDialogIsOpen] =
    useState<boolean>(false);

  const dialogContentData = {
    templateName: (
      <Stack direction="row" spacing={1} alignItems="center">
        <Icons type={templateType} />
        <Typography variant="body2">{templateName}</Typography>
      </Stack>
    ),
    createdAt,
    userInputsData: userInputsData?.length ? userInputsData : null,
    customData: customData?.length ? customData : null,
    customBibliographyFiles: customBibliographies?.length
      ? customBibliographies?.map((item) => item?.name)
      : null
  };

  const handleOpenDialog = () => {
    setUserInputsDialogIsOpen(true);
  };

  const handleCloseDialog = () => {
    setUserInputsDialogIsOpen(false);
  };

  return (
    <>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', maxWidth: 684, margin: '0 auto' }}
      >
        <Tooltip placement="top" title={'Show all inputs'}>
          <InfoOutlined
            onClick={handleOpenDialog}
            data-testid="userInputs-showInputsButton"
            sx={{
              cursor: 'pointer',
              color: 'grey.600',
              width: 16,
              height: 16,
              '&:hover': { color: 'primary.main' }
            }}
          />
        </Tooltip>
      </Stack>
      {userInputsDialogIsOpen && (
        <UserInputsDialog
          dialogContentData={dialogContentData}
          open={userInputsDialogIsOpen}
          handleClose={handleCloseDialog}
          isDeepResearch={convertToKey(templateType) === 'deepresearch'}
        />
      )}
    </>
  );
};

export default memo(UserInputs);
