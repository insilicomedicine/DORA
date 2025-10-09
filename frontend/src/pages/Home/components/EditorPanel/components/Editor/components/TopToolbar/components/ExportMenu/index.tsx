import React, { memo } from 'react';
import { Typography, Menu, MenuItem } from '@mui/material';
import { PictureAsPdfRounded, ArticleRounded } from '@mui/icons-material';
import Snackbar from 'utils/snackbar';
import { handleExportDocument } from 'utils/editor';

const ExportMenu = ({
  anchorElExportMenu,
  setAnchorElExportMenu,
  paperId,
  paperTitle
}) => {
  const openExportMenu = Boolean(anchorElExportMenu);

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!paperId) {
      Snackbar.info(
        `Please save the document before exporting to ${format.toUpperCase()}`
      );
      return;
    }
    handleExportDocument(format, {
      documentId: paperId,
      title: paperTitle,
      GAEventParams: { location: 'editor_tool_bar' },
      callback: () => {
        Snackbar.success(`${format.toUpperCase()} exported successfully`);
      }
    });
  };

  const collapsibleExportMenuItems = [
    {
      icon: <PictureAsPdfRounded fontSize="small" />,
      key: 'exportPDF',
      label: 'Export PDF',
      handleClick: () => handleExport('pdf')
    },
    {
      icon: <ArticleRounded fontSize="small" />,
      key: 'exportDOCX',
      label: 'Export DOCX',
      handleClick: () => handleExport('docx')
    }
  ];

  const handleCloseExportMenu = () => {
    setAnchorElExportMenu(null);
  };
  return (
    <Menu
      anchorEl={anchorElExportMenu}
      open={openExportMenu}
      onClose={handleCloseExportMenu}
    >
      {collapsibleExportMenuItems.map((item, index) => (
        <MenuItem
          key={index}
          onClick={() => {
            item.handleClick();
            handleCloseExportMenu();
          }}
        >
          {item.icon}
          <Typography sx={{ ml: 1 }}>{item.label}</Typography>
        </MenuItem>
      ))}
    </Menu>
  );
};

export default memo(ExportMenu);
