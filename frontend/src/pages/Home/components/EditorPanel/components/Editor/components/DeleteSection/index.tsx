import React, { memo, useState, useCallback, useEffect } from 'react';
import { DeleteForeverRounded } from '@mui/icons-material';
import {
  Box,
  DialogContentText,
  SxProps,
  Theme,
  Tooltip,
  Typography
} from '@mui/material';
import { deleteSection, getDocument } from 'services/documents';
import Dialog from 'components/Dialog';
import { useDocumentStore } from 'contexts/documentsStore';
import { getAllSubSectionsIds, getParentSectionId } from 'utils/editor';
import { Section } from 'types/document';

interface DeleteSectionProps {
  id: string;
  title?: string;
  sx?: SxProps<Theme>;
}

const DeleteSection = ({
  title = '',
  id = '',
  sx = {}
}: DeleteSectionProps) => {
  const { documentData, bibliographyList, setDocumentDetailData } =
    useDocumentStore();

  const { sections = [], section_influences = [] } = documentData || {};
  const {
    setDeletedSectionsIds,
    setIsBibliographyChanged,
    setUpdatedDocument
  } = useDocumentStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  // Add/remove hover styles when hovering over a section
  useEffect(() => {
    if (!isHovering) return;
    const hoveredSectionIds = getAllSubSectionsIds(id, sections);
    const styleElement = document.createElement('style');
    styleElement.id = 'deleteSectionStyle';
    styleElement.textContent = hoveredSectionIds
      .map((sectionId, index) => {
        const isFirst = index === 0;
        const isLast = index === hoveredSectionIds.length - 1;
        const selector = `[data-parent="${sectionId}"]`;
        let styles = `${selector} { background-color: #f8f8f8; }\n`;
        if (isFirst) {
          styles += `${selector}.titleWrapper { border-radius: 24px 24px 0 0; }\n`;
        }
        if (isLast) {
          styles += `${selector}.feedbackWrapper { border-radius: 0 0 24px 24px; }\n`;
        }
        return styles;
      })
      .join('');
    document.head.appendChild(styleElement);

    return () => {
      const style = document.getElementById('deleteSectionStyle');
      if (style) {
        style.remove();
      }
    };
  }, [isHovering, id]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovering(false);
  }, []);

  const handleConfirm = async () => {
    const res = await deleteSection(id);
    if (!res) return;

    const allDeletedSectionsIds = getAllSubSectionsIds(id, sections);
    const parentSection = getParentSectionId(id, sections);
    if (parentSection?.id && parentSection?.sub_sections?.length === 1) {
      allDeletedSectionsIds.push(parentSection.id);
    }

    setDeletedSectionsIds(allDeletedSectionsIds);

    if (!bibliographyList.length) {
      const abortController = new AbortController();
      if (!documentData?.id) return;
      const response = await getDocument(documentData?.id, abortController);
      if (!response) return;
      setDocumentDetailData({
        documentData: {
          ...documentData,
          ...response
        }
      });
      setUpdatedDocument(response);
      return;
    }

    setIsBibliographyChanged(true);
  };

  const renderDependenciesDeleteMessage = () => {
    if (!Object.keys(section_influences).length) return null;
    const targetSection =
      sections.find((sec: Section) => sec.id === id) || ({} as Section);
    const slug = targetSection?.slug;
    if (!slug) return null;
    const affectedSections = section_influences[slug];
    if (affectedSections?.length) {
      const sectionTitles = affectedSections
        .map((depSlug) => sections?.find((sec) => sec.slug === depSlug)?.title)
        .filter(Boolean);

      const formattedTitles =
        sectionTitles.length > 1
          ? `${sectionTitles.slice(0, -1).join(', ')}, and ${sectionTitles.at(-1)}`
          : sectionTitles[0];

      if (!formattedTitles) return null;

      return (
        <>
          <br />
          <Typography variant="body1" fontWeight={400} letterSpacing={0.1}>
            Deleting the <span style={{ fontWeight: 700 }}>{title}</span>{' '}
            section will affect interconnected sections if the{' '}
            <span style={{ fontWeight: 700 }}>Polish</span> feature is applied.
          </Typography>
          <br />
          <Typography variant="body1" fontWeight={400} letterSpacing={0.1}>
            Specifically, it will affect:
            <span style={{ fontWeight: 700 }}> {formattedTitles}</span>.
          </Typography>
        </>
      );
    }
    return null;
  };

  return (
    <>
      {!isDeleteDialogOpen ? (
        <Tooltip title={`Delete ${title}`} placement="top">
          <DeleteForeverRounded
            onClick={(e) => {
              e.stopPropagation();
              setIsHovering(false);
              setIsDeleteDialogOpen(true);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="deleteSectionIcon"
            sx={sx}
          />
        </Tooltip>
      ) : (
        <Dialog
          open={isDeleteDialogOpen}
          title={`Delete ${title}?`}
          Content={
            <Box maxWidth={529}>
              <DialogContentText color="text.primary">
                This action cannot be undone.
              </DialogContentText>
              {renderDependenciesDeleteMessage()}
            </Box>
          }
          handleClose={(e) => {
            e.stopPropagation();
            setIsDeleteDialogOpen(false);
          }}
          actionBtnTexts={{ confirm: 'Delete' }}
          handleConfirm={handleConfirm}
          sx={{ zIndex: 1600 }}
        />
      )}
    </>
  );
};

export default memo(DeleteSection);
