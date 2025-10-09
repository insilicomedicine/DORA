import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { GridViewOutlined, MenuRounded } from '@mui/icons-material';
import { Box, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import Documents from './components/Documents';
import { getUserDisplayPreferences } from 'services/user';
import { DocumentViewMods } from 'types/document';
import { sendGA4Event } from 'utils/ga';

const documentsViewMods = [
  {
    type: DocumentViewMods.card,
    icon: <GridViewOutlined sx={{ width: 20, height: 20 }} />,
    tootipText: 'Grid view'
  },
  {
    type: DocumentViewMods.column,
    icon: <MenuRounded sx={{ width: 20, height: 20 }} />,
    tootipText: 'List view'
  }
];

interface CustomToggleButtonProps {
  value: string;
  children: React.ReactNode;
  tootipText?: string;
  [key: string]: any;
}

const CustomToggleButton = ({
  value,
  children,
  tootipText
}: CustomToggleButtonProps) => (
  <Tooltip title={tootipText} placement="top">
    <ToggleButton
      value={value}
      aria-label={value}
      sx={{
        padding: '5px 24px',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: '#757575',
        '&.Mui-selected': {
          backgroundColor: '#E7F6EE',
          color: 'primary.main',
          borderColor: 'primary.main'
        }
      }}
    >
      {children}
    </ToggleButton>
  </Tooltip>
);

const HomePage = () => {
  const location = useLocation();
  const [userDisplayPreferences, setUserDisplayPreferences] = useState<Record<
    string,
    any
  > | null>(null);
  const [activedTab, setActivedTab] = useState(
    location.pathname === '/bibliography' ? 1 : 0
  );
  const [documentsViewMode, setDocumentsViewMode] = useState<string>(
    userDisplayPreferences?.documents_layout || DocumentViewMods.card
  );

  const handleDocumentsViewMode = (
    _event: React.MouseEvent<HTMLElement>,
    newAlignment: string
  ) => {
    if (newAlignment !== null) {
      setDocumentsViewMode(newAlignment);
      sendGA4Event('click_button', {
        button_type: newAlignment,
        location: 'documents_view_mode'
      });
      setUserDisplayPreferences({ documents_layout: newAlignment });
    }
  };

  useEffect(() => {
    setActivedTab(location.pathname === '/bibliography' ? 1 : 0);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUserDisplayPreferences = async () => {
      const userDisplayPreferences = await getUserDisplayPreferences();
      setUserDisplayPreferences(userDisplayPreferences);
    };
    fetchUserDisplayPreferences();
  }, [userDisplayPreferences]);

  return (
    <Box
      sx={{ width: '100%', height: 'calc(100vh - 70px)' }}
      display="flex"
      flexDirection="column"
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        {activedTab === 0 && (
          <ToggleButtonGroup
            value={documentsViewMode}
            onChange={handleDocumentsViewMode}
            exclusive
            sx={{
              mr: 3
            }}
          >
            {documentsViewMods.map((button) => (
              <CustomToggleButton
                key={button.type}
                value={button.type}
                tootipText={button.tootipText}
              >
                {button.icon}
              </CustomToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>
      <Documents mode={documentsViewMode} />
    </Box>
  );
};
export default HomePage;
