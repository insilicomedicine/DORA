import React, { memo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { isSettingsDisabled } from 'utils/agentReport';
import CitationSettings from 'pages/Home/components/RightPanel/CitationSettings';
import SettingHeader from '../SettingsHeader';
import useSettingsStore from 'contexts/useSettingsStore';

const PMCOrPubMedSearchSettings = ({}) => {
  const { agents = {} } = useSettingsStore((state) => state);
  const isDisabled = isSettingsDisabled(
    'resources',
    'PMCPubMedSearchSettings',
    agents.pubmed_abstract_similarity_search_tool
  );

  return (
    <Box
      pt={3}
      pb={4}
      borderRadius={4}
      sx={{
        backgroundColor: '#fff'
      }}
    >
      <Tooltip
        title={
          isDisabled && (
            <Typography variant="caption">
              The <strong>PMC/Pubmed</strong> resource has to be activated to
              enable the
              <br /> search settings
            </Typography>
          )
        }
        placement="right"
        followCursor
      >
        <span>
          <CitationSettings
            sx={{
              padding: 0,
              maxWidth: '100%',
              ...(isDisabled && {
                '& h6, p, label': {
                  color: '#9E9E9E'
                }
              })
            }}
            mode={isDisabled ? 'disabled' : 'normal'}
            configs={{
              header: {
                disableInfoButton: true
              },
              publicationDate: {
                sx: {
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  ml: 1,
                  gap: '20px'
                }
              },
              articleType: {
                type: 'checkbox'
              }
            }}
            title={
              <SettingHeader
                title="PMC/PubMed search settings"
                titleLevel="body1"
                popoverInfo={{
                  content: `Filter publication search results to include only the most recent and relevant studies from the DORA database.\n\n These settings do not affect Websearch results.`
                }}
                disableToolTip={isDisabled}
                sx={{
                  pb: 0
                }}
              />
            }
          />
        </span>
      </Tooltip>
    </Box>
  );
};

export default memo(PMCOrPubMedSearchSettings);
