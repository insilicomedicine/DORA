import React, { memo, useCallback, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import { scrollToSection } from 'utils/editor';
import { DocumentStage, DocumentStatus, Section } from 'types/document';
import { useScrollingDocumentPageContentStore } from 'contexts/documentsStore';
import DeleteSectionButton from '../../../EditorPanel/components/Editor/components/DeleteSection';
import Menu from '../Menu';
import documentStatusIcon from './DocumentStatusIcon';
import './index.scss';

interface CustomTreeItemProps {
  id: string;
  title: string;
  status: string | DocumentStatus;
  stage: DocumentStage;
  isNotRoot?: boolean;
  is_refined?: boolean;
  sections?: Section[];
  sub_sections?: Section[];
}

const CustomTreeItem = ({
  id,
  title,
  stage,
  status,
  isNotRoot,
  sections,
  sub_sections
}: CustomTreeItemProps) => {
  const {
    setActiveSectionId,
    activeSectionId,
    setIsScrollingDocumentPageContent
  } = useScrollingDocumentPageContentStore((state) => state);

  const DocumentStatusIcon =
    documentStatusIcon[status] || documentStatusIcon[stage];
  const isCompleted = status === 'completed';
  const isDocumentInProgress = status === 'in_progress';
  const isDocumentPolishing = stage === 'polishing';
  const isDocumentFailed = status === 'failed';
  const isDraft = stage === 'draft';
  const isPoblishing = status === 'polishing';
  const isEnableDelete = isCompleted && !isDocumentPolishing;

  const rootIcon =
    (isDraft || isDocumentInProgress || isCompleted || isDocumentFailed) &&
    DocumentStatusIcon &&
    DocumentStatusIcon();

  const shouldShowStatusForSection =
    !isDocumentInProgress &&
    !isPoblishing &&
    ['failed', 'limited'].includes(status);

  const children = sections || sub_sections;
  const isActive = useMemo(() => activeSectionId === id, [activeSectionId, id]);

  const resetTreeItemStyle = (id: string) => {
    const treeItem = document.getElementById(`${id}-tree-root`);
    if (!treeItem) return;

    treeItem.style.maxHeight = '';
    const titleElement = treeItem.querySelector(
      '.CustomTreeItem-documentTitle'
    ) as HTMLElement;
    if (titleElement) {
      titleElement.removeAttribute('style');
    }
  };

  const handleHoverAnimation = useCallback(
    (e) => {
      e.preventDefault();
      const treeItem = document.getElementById(`${id}-tree-root`);
      if (!treeItem || treeItem?.getAttribute('aria-expanded') === 'true')
        return;

      // Define constants for line measurements
      const LINE_HEIGHT_PX = 14;
      const LINE_HEIGHT_MULTIPLIER = 3;
      const MAX_VISIBLE_LINES = 2;

      treeItem.style.maxHeight = '57px';
      const titleElement = treeItem.querySelector(
        '.CustomTreeItem-documentTitle'
      ) as HTMLElement;
      if (titleElement) {
        const titleLines = titleElement.clientHeight / LINE_HEIGHT_PX;
        if (titleLines > MAX_VISIBLE_LINES) {
          treeItem.style.maxHeight = `${titleLines * LINE_HEIGHT_MULTIPLIER * LINE_HEIGHT_PX}px`;
          titleElement.style.maxHeight = 'unset';
          titleElement.style.cssText += '-webkit-line-clamp: none;';
        }
      }
    },
    [id]
  );

  const handleMouseLeave = useCallback(() => {
    resetTreeItemStyle(id);
  }, [id, resetTreeItemStyle]);

  const handleClick = useCallback(
    (e: any) => {
      e.preventDefault();
      if (isDocumentInProgress) return;
      resetTreeItemStyle(id);
      scrollToSection(e, id);
      setActiveSectionId(id);
      setIsScrollingDocumentPageContent(true);
    },
    [isDocumentInProgress, id, resetTreeItemStyle]
  );

  return (
    <>
      <TreeItem
        id={`${id}-tree-root`}
        itemId={id}
        label={
          isNotRoot ? (
            <Typography variant="body2" className="CustomTreeItem-sectionTitle">
              {title}
            </Typography>
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              sx={{ cursor: 'pointer' }}
            >
              {isDocumentPolishing &&
                documentStatusIcon.polishing({
                  marginLeft: -9,
                  marginRight: 3
                })}
              {rootIcon}
              <Typography
                variant="body2"
                ml={1}
                className="CustomTreeItem-documentTitle"
              >
                {title}
              </Typography>
            </Stack>
          )
        }
        onClick={handleClick}
        onMouseEnter={!isNotRoot ? handleHoverAnimation : undefined}
        onMouseLeave={!isNotRoot ? handleMouseLeave : undefined}
        disabled={isDocumentFailed}
        slots={{
          icon: () => (
            <>
              {isPoblishing && DocumentStatusIcon(stage === 'polishing')}
              {isNotRoot ? (
                <>
                  {shouldShowStatusForSection && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 4,
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    >
                      {DocumentStatusIcon}
                    </span>
                  )}
                  {isEnableDelete && (
                    <DeleteSectionButton
                      id={id}
                      title={title}
                      sx={{
                        position: 'absolute',
                        right: 6,
                        top: 10,
                        display: 'none'
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  {!!status && (
                    <Box onClick={(e: any) => e.stopPropagation()}>
                      <Menu target={{ id, status, stage, title }} />
                    </Box>
                  )}
                </>
              )}
            </>
          )
        }}
        sx={{
          ...(isDocumentInProgress &&
            isNotRoot && {
              pointerEvents: 'none'
            }),
          '&.MuiTreeItem-root': {
            maxHeight: 'unset',
            '&[disabled]': {
              '& .MuiTreeItem-content': {
                opacity: 1
              }
            },
            '&[aria-expanded="true"]': {
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
              maxHeight: 'unset !important',
              '&> div, &> ul': {
                backgroundColor: '#f5f5f5',
                ...(!isNotRoot && {
                  '&.MuiCollapse-root': {
                    pb: 1
                  }
                })
              }
            }
          },
          ...(!isNotRoot && {
            '&> .MuiCollapse-root': {
              px: 1
            }
          }),
          '&> .MuiTreeItem-content': {
            ...(isActive &&
              isNotRoot && {
                backgroundColor: '#E6E6E6 !important',
                borderRadius: '10px!important'
              }),
            ...(!isNotRoot && {
              borderRadius: 0,
              '&.Mui-selected.Mui-focused': {
                backgroundColor: 'transparent'
              },
              '&.Mui-focused': {
                backgroundColor: '#f5f5f5 !important'
              },
              '&.Mui-expanded': {
                backgroundColor: '#f5f5f5 !important',
                '& .polishing': {
                  display: 'none !important'
                },
                '& .CustomTreeItem-documentTitle': {
                  color: 'text.primary',
                  fontWeight: 500,
                  WebkitLineClamp: 2
                }
              }
            })
          },
          '& .MuiTreeItem-content': {
            padding: '8px 34px 8px 16px',
            gap: 0,
            ...(isNotRoot && {
              pl: '32px !important',
              pr: 1
            }),
            '& .MuiTreeItem-iconContainer': {
              width: 0
            },
            '&:has(.dropdownMenuOpened)': {
              backgroundColor: '#f5f5f5'
            },
            '&:not(.Mui-expanded.Mui-selected)': {
              '&:has(.dropdownMenuOpened) .CustomTreeItem-documentTitle': {
                WebkitLineClamp: 'unset',
                maxHeight: 'unset'
              }
            },
            '.menuIcon': {
              display: 'none',
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              '&.dropdownMenuOpened': {
                display: 'inline-flex',
                '&:hover': {
                  backgroundColor: 'transparent'
                }
              }
            },

            '&:hover': {
              ...(isNotRoot && {
                borderRadius: '10px',
                backgroundColor: '#E6E6E6'
              }),
              '& .menuIcon': {
                display: 'inline-flex'
              },
              '& .deleteSectionIcon': {
                display: 'block !important',
                top: ' 50%',
                transform: 'translateY(-50%)'
              }
            },

            '&.Mui-selected, &.Mui-focused': {
              backgroundColor: 'transparent'
            }
          },
          '& div.MuiTreeItem-label': {
            fontSize: 14,
            color: `${isDocumentInProgress ? '#9E9E9E !important' : isNotRoot ? 'text.primary' : 'text.secondary'}`
          },
          '& div.Mui-expanded': {
            pr: '34px',

            '&.Mui-selected': {
              ...(isNotRoot && {
                backgroundColor: 'unset'
              })
            },
            '&+ .MuiCollapse-entered': {
              ...(isDocumentInProgress && {
                color: '#9E9E9E',
                pointerEvents: 'none'
              })
            }
          }
        }}
      >
        {!isDraft &&
          children?.map((child) => {
            const status =
              child.is_refined || !!child.refined_result
                ? 'polishing'
                : child.status;
            return (
              <CustomTreeItem
                key={child.id}
                {...child}
                isNotRoot={true}
                status={status}
                stage={stage}
              />
            );
          })}
      </TreeItem>
    </>
  );
};

export default memo(CustomTreeItem);
