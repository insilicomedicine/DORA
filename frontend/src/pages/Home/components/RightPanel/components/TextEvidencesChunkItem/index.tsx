import { memo, useEffect, useId, useRef, useState } from 'react';
import Citations from '../Citations';
import { chunksAuthorFormatter } from 'utils/chunksAuthorFormatter';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { Link } from 'react-router';
import BibliographyCustomItem from '../BibliographyCustomItem';
import usePlanStatus from 'hooks/usePlanStatus';
import { Metadata } from 'types/document';

export interface TextEvidencesChunkItemProps extends Partial<Metadata> {
  showWithLink?: boolean;
  isCustomLink?: boolean;
  isSearchResult?: boolean;
  chunks: any;
  pub_year?: number;
}

const TextEvidencesChunkItem = (props: TextEvidencesChunkItemProps) => {
  const {
    title,
    authors,
    pub_year = 0,
    pub_type,
    journal_name,
    chunks,
    file_name,
    url = '',
    object_id = '',
    showWithLink,
    isCustomLink = false,
    isSearchResult = false
  } = props;

  const { isExpired } = usePlanStatus();
  const clampToggleId = useId();
  const clampContentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    if (!isSearchResult) return;
    const el = clampContentRef.current;
    if (!el) return;

    const computeOverflow = () => {
      const computed = window.getComputedStyle(el);
      const lineHeightStr = computed.lineHeight;
      const lineHeight = parseFloat(lineHeightStr || '0');
      const twoLinesHeight =
        isNaN(lineHeight) || lineHeight === 0 ? 0 : lineHeight * 2;
      const isOverflow = el.scrollHeight > twoLinesHeight + 1;
      setIsOverflowed(isOverflow);
    };

    computeOverflow();

    const resizeObserver = new ResizeObserver(() => {
      computeOverflow();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isSearchResult]);

  const renderLimitedTooltip = () => (
    <Tooltip title="Text unavailable due to expired plan" followCursor>
      <p>{Array(200).fill('text').join('')}</p>
    </Tooltip>
  );

  const renderChunkContent = (chunkText: string, index?: number) => (
    <>
      {isExpired ? (
        renderLimitedTooltip()
      ) : (
        <>{index !== undefined ? `"${chunkText}"` : chunkText}</>
      )}
    </>
  );

  const renderChunkTexts = () => {
    const chunkTexts = Object.values(chunks).join(' ');
    const isEnableChunk = chunkTexts.trim() !== '';
    if (!isEnableChunk) {
      return null;
    }

    return (
      <Box
        sx={{
          fontSize: 14,
          lineHeight: 1.45,
          ...(isExpired && {
            filter: 'blur(4px)',
            userSelect: 'none'
          }),
          ...(isSearchResult && {
            fontSize: 12,
            borderLeft: '1px solid #eee',
            pl: 1,
            my: 1,
            lineHeight: 1.37,
            letterSpacing: 0
          })
        }}
      >
        {isSearchResult ? (
          <Box
            sx={{
              position: 'relative',
              // default clamp styles
              '& .clampContent': {
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                position: 'relative'
              },
              // show toggle only on hover
              '& .toggleLabel': { display: 'none' },
              '&[data-overflow="true"]:hover .toggleLabel': {
                display: 'inline-flex'
              },
              // unclamp when checkbox is checked
              '& input[type="checkbox"]:checked ~ .clampContent': {
                overflow: 'visible',
                display: 'block',
                WebkitLineClamp: 'unset'
              },
              '& input[type="checkbox"]:checked ~ .toggleLabel .moreText': {
                display: 'none'
              }
            }}
            data-overflow={isOverflowed ? 'true' : 'false'}
          >
            <Box
              component="input"
              type="checkbox"
              id={`toggle-${clampToggleId}`}
              sx={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
            <Box className="clampContent" ref={clampContentRef}>
              {renderChunkContent(chunkTexts)}
            </Box>
            <Button
              component="label"
              htmlFor={`toggle-${clampToggleId}`}
              size="small"
              variant="text"
              className="toggleLabel"
              sx={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                padding: 0,
                background: '#fff',
                cursor: 'pointer',
                textTransform: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  background: '#fff'
                }
              }}
            >
              <Box component="span" className="moreText">
                Show more
              </Box>
            </Button>
          </Box>
        ) : (
          Object.values(chunks).map((chunk: any, index) => (
            <Box mb={0.5} key={index}>
              {renderChunkContent(chunk, index)}
            </Box>
          ))
        )}
      </Box>
    );
  };

  const renderCitationInfo = () => (
    <>
      <Citations
        {...props}
        disableViewAbstract={!showWithLink || isExpired}
        isSearchResult={isSearchResult}
        sx={{ fontSize: isSearchResult ? '12px' : undefined }}
      />
      <Typography variant="caption" color="textSecondary">
        {chunksAuthorFormatter({ authors, pub_year })}
        {isSearchResult ? ' • ' : ' | '}
        {journal_name}
        {isSearchResult ? ' • ' : ' | '}
        {pub_type?.[0]}
      </Typography>
    </>
  );

  const renderTitle = () => (
    <Typography
      variant="caption"
      fontWeight={700}
      sx={
        !isSearchResult
          ? { my: 0.5, lineHeight: 1.45 }
          : {
              pt: 0.5
            }
      }
    >
      {title}
    </Typography>
  );

  const renderItemContent = () => (
    <Stack sx={{ pb: isSearchResult ? 2 : 0 }}>
      {isCustomLink ? (
        <BibliographyCustomItem
          title={title}
          url={url}
          sx={{
            fontSize: 12,
            lineHeight: 1.37,
            letterSpacing: 0,
            fontWeight: 700
          }}
        />
      ) : (
        <> {renderTitle()}</>
      )}
      {renderChunkTexts()}
      {isCustomLink ? (
        <Link to={url} target="_blank" style={{ fontSize: 12 }}>
          <Typography
            variant="caption"
            sx={{ '&:hover': { textDecorationLine: 'underline' } }}
          >
            {url?.replace(/^https?:\/\//, '')}
          </Typography>
        </Link>
      ) : (
        renderCitationInfo()
      )}
    </Stack>
  );

  if (isSearchResult) {
    return renderItemContent();
  }

  return (
    <Stack
      sx={{
        mb: 1,
        py: 1.5,
        pl: 1.5,
        pr: 3,
        overflow: 'auto'
      }}
    >
      {(file_name || url) && showWithLink && (
        <BibliographyCustomItem
          file_name={file_name}
          url={url}
          object_id={object_id}
          sx={{ fontWeight: 500, mb: 0.5 }}
        />
      )}
      {!isCustomLink && (
        <>
          {renderTitle()}
          <Typography variant="caption" color="textSecondary">
            {chunksAuthorFormatter({ authors, pub_year })} | {journal_name} |{' '}
            {pub_type?.[0]}
          </Typography>
        </>
      )}
      {renderChunkTexts()}
      {!isCustomLink && (
        <Citations
          {...props}
          disableViewAbstract={!showWithLink || isExpired}
        />
      )}
    </Stack>
  );
};

export default memo(TextEvidencesChunkItem);
