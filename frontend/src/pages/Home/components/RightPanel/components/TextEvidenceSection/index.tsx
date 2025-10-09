import React, { memo } from 'react';
import { IconButton, Typography } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { Box } from '@mui/material';
import TextEvidences from '../../../TextEvidences';
import { RightPanelComponentIds } from 'types/document';
import SidebarCollapse from 'components/SidebarCollapse';
import useRightPanelStore from 'contexts/useRightPanelStore';

const TextEvidenceSection = ({ isActive, handleChange }) => {
  const { isRightPanelCollapsed, toggleCollapseRightPanel } =
    useRightPanelStore();
  return (
    <Box
      sx={{
        mt: 2,
        ml: 1.5,
        display: isActive ? 'flex' : 'none'
      }}
      flexDirection="column"
      height="100%"
      overflow={'hidden'}
    >
      <Box display="flex" sx={{ alignItems: 'center', mb: 1, mr: 1 }}>
        <IconButton
          size="small"
          onClick={(e) => handleChange(e, RightPanelComponentIds.bibliography)}
          sx={{ mr: 1 }}
        >
          <CloseRounded sx={{ color: '#757575' }} />
        </IconButton>
        <Typography variant="caption" fontWeight={500} color="text.primary">
          Text Evidence
        </Typography>
        <SidebarCollapse
          sx={{ ml: 'auto', mr: 2 }}
          toggleCollapse={() => toggleCollapseRightPanel(true)}
          isCollapsed={isRightPanelCollapsed}
          direction="right"
        />
      </Box>
      <TextEvidences showWithLink={true} />
    </Box>
  );
};

export default memo(TextEvidenceSection);
