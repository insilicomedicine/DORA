import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import Citations from '../Citations';
import { chunksAuthorFormatter } from 'utils/chunksAuthorFormatter';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import BibliographyCustomItem from '../BibliographyCustomItem';
import usePlanStatus from 'hooks/usePlanStatus';
import { Metadata } from 'types/document';
import { useDocumentStore } from 'contexts/documentsStore';
import { convertToKey } from 'utils/utils';

export interface TextEvidencesChunkItemProps extends Partial<Metadata> {
  showWithLink?: boolean;
  isCustomLink?: boolean;
  isSearchResult?: boolean;
  chunks: any;
  pub_year?: number;
}

type FormatCitationArgs = {
  authors?: Metadata['authors'];
  pub_year?: number;
  journal_name?: string;
  pub_type?: string[];
  isSearchResult: boolean;
};

const formatCitationText = ({
  authors,
  pub_year,
  journal_name,
  pub_type,
  isSearchResult
}: FormatCitationArgs) => {
  const separator = isSearchResult ? ' • ' : ' | ';
  const parts: string[] = [];

  const authorPart = chunksAuthorFormatter({ authors, pub_year });
  if (authorPart) parts.push(authorPart);

  if (journal_name) parts.push(journal_name);

  const type = Array.isArray(pub_type) ? pub_type[0] : undefined;
  if (type) parts.push(type);

  return parts.join(separator);
};

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

  const { documentData } = useDocumentStore();
  const { isExpired } = usePlanStatus();
  const clampToggleId = useId();
  const clampContentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  const chunkArray = useMemo(() => Object.values(chunks ?? {}), [chunks]);
  const chunkTexts = useMemo(() => chunkArray.join(' '), [chunkArray]);
  const isChunksEnabled = useMemo(() => chunkTexts.trim() !== '', [chunkTexts]);
  const templateKey = useMemo(
    () => convertToKey(documentData?.template_type),
    [documentData?.template_type]
  );
  const isDeepResearch = templateKey === 'deepresearch';

  const citationText = useMemo(
    () =>
      formatCitationText({
        authors,
        pub_year,
        journal_name,
        pub_type,
        isSearchResult
      }),
    [authors, pub_year, journal_name, pub_type, isSearchResult]
  );

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
    if (!isChunksEnabled) {
      if (isDeepResearch) {
        return (
          <Typography
            variant="body2"
            color="grey.500"
            textAlign="center"
            pt="20px"
          >
            Related excerpt isn't available for Deep Research
          </Typography>
        );
      }
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
          chunkArray.map((chunk: any, index) => (
            <Box mb={0.5} key={index}>
              {renderChunkContent(chunk, index)}
            </Box>
          ))
        )}
      </Box>
    );
  };

  const renderCitationInfo = () => {
    return (
      <>
        <Citations
          {...props}
          disableViewAbstract={!showWithLink || isExpired}
          isSearchResult={isSearchResult}
          sx={{ fontSize: isSearchResult ? '12px' : undefined }}
        />
        <Typography variant="caption" color="textSecondary">
          {citationText}
        </Typography>
      </>
    );
  };

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
        width: '100%',
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
          title={title}
          url={url}
          object_id={object_id}
          sx={{ fontWeight: 500, mb: 0.5 }}
        />
      )}
      {!isCustomLink && (
        <>
          {renderTitle()}
          <Typography variant="caption" color="textSecondary">
            {citationText}
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
