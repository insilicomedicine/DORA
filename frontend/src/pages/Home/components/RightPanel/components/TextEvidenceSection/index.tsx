import React, { memo } from 'react';
import { IconButton, Typography } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { Box } from '@mui/material';
import TextEvidences from '../../../TextEvidences';
import SidebarCollapse from 'components/SidebarCollapse';
import useRightPanelStore from 'contexts/useRightPanelStore';

const TextEvidenceSection = ({
  referenceLinkTarget,
  setReferenceLinkTarget
}) => {
  const { isRightPanelCollapsed, toggleCollapseRightPanel } =
    useRightPanelStore();
  if (!referenceLinkTarget?.pmid) return null;

  return (
    <Box
      sx={{
        mt: 2,
        ml: 1.5
      }}
      flexDirection="column"
      height={`calc(100% - 40px)`}
      overflow={'hidden'}
    >
      <Box display="flex" sx={{ alignItems: 'center', mb: 1, mr: 1 }}>
        <IconButton
          size="small"
          onClick={() => setReferenceLinkTarget({ pmid: undefined })}
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
