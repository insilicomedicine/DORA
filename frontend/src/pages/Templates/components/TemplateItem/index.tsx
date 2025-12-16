import { memo, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  styled,
  Chip
} from '@mui/material';
import { getPaymentsPortal } from 'services/payments';
import { Template } from 'types/template';
import usePlanStatus from 'hooks/usePlanStatus';
import { useNavigate } from 'react-router';
import { useUserStore } from 'contexts/useUserStore';
import { format } from 'date-fns';
import Icons from '../Icons';
import { convertToKey } from 'utils/utils';

const TemplateCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'isDeepResearch'
})<{
  isDeepResearch?: boolean;
}>(({ theme }) => ({
  position: 'relative',
  padding: 24,
  backgroundColor: theme.palette?.common.white,
  boxShadow: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  height: '100%',
  border: `1px solid ${theme.palette.grey[50]}`,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    borderColor: theme.palette.primary.main,
    '& .templateIcon': {
      backgroundColor: '#E7F6EE'
    },
    '& .templateTypeTag': {
      backgroundColor: '#C4E9D5'
    },
    '& .limitedBox': {
      display: 'flex'
    }
  }
}));

const TemplateIcon = styled('span', {
  shouldForwardProp: (prop) => prop !== 'isDeepResearch'
})<{
  isDeepResearch?: boolean;
}>(({ theme, isDeepResearch }) => ({
  display: 'block',
  padding: 16,
  textAlign: 'center',
  borderRadius: 8,
  background: isDeepResearch
    ? 'radial-gradient(137.07% 137.07% at 93.75% 100%, #E6FAEA 0%, #E3EEFC 100%)'
    : theme.palette.grey[50],
  backdropFilter: 'blur(2px)',
  '& svg': {
    verticalAlign: 'middle'
  }
}));

const TemplateTypeTag = styled('span')(({ theme }) => ({
  display: 'inline-block',
  minHeight: 24,
  padding: '4px 12px',
  textAlign: 'center',
  marginRight: 8,
  marginBottom: 4,
  borderRadius: 16,
  fontSize: 12,
  letterSpacing: 0,
  backgroundColor: theme.palette?.grey[50]
}));

const LimitedBox = styled(Stack)(({}) => ({
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  position: 'absolute',
  width: '100%',
  height: '100%',
  padding: '0 24px',
  top: 0,
  left: 0,
  backgroundColor: '#EBEBEB',
  textAlign: 'center'
}));

interface TemplateItemProps {
  template: Template;
}

const TemplateItem = ({ template }: TemplateItemProps) => {
  const nav = useNavigate();
  const { setShowSubscriptionDialog } = useUserStore();
  const {
    id,
    type = '',
    name,
    description,
    user_inputs = [],
    tags = ['New! 🚀']
  } = template;

  const {
    isLimited,
    isPastDue,
    isPlanReachedLimit,
    isFree,
    isExpired,
    limitType = '',
    endDate = ''
  } = usePlanStatus();

  const isDeepResearch = useMemo(
    () => convertToKey(template?.type) === 'deepresearch',
    [template]
  );

  const limitInfos = {
    free: () => "You've hit the free limit. Upgrade to create more documents.",
    advanced: () => (
      <>
        ⌛
        <span style={{ display: 'block', fontWeight: 500, margin: '8px 0' }}>
          Limit reached
        </span>
        Upgrade your plan or wait until it renews on{' '}
        {format(new Date(endDate), 'dd MMM yyyy')} to create more documents.
      </>
    ),
    expired: () => `⌛\n\nPlan expired.\nRenew to generate documents.`
  };

  return (
    <Grid
      gridColumn="span 4"
      key={id}
      onClick={() => {
        if (isLimited) return;
        nav(`/documents/generation/?template=${template.id}`);
      }}
      sx={{ position: 'relative', bgcolor: 'common.white', borderRadius: 3 }}
      data-testid="templateItem-wrapper"
    >
      <TemplateCard isDeepResearch={isDeepResearch}>
        <CardContent sx={{ p: 0 }}>
          {isDeepResearch && (
            <>
              {tags.map((tag) => (
                <Chip
                  variant="outlined"
                  label={tag}
                  size="small"
                  color="primary"
                  sx={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    width: 70,
                    height: 28,
                    border: '1px solid #7AD689',
                    background:
                      'linear-gradient(80deg, rgba(183, 255, 206, 0.40) 0%, rgba(163, 238, 255, 0.40) 100%)'
                  }}
                />
              ))}
            </>
          )}
          <Stack
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            mb="21px"
          >
            <TemplateIcon
              className="templateIcon"
              isDeepResearch={isDeepResearch}
            >
              <Icons type={type} size={24} />
            </TemplateIcon>
          </Stack>

          <Typography
            variant="body2"
            color="primary.main"
            mb={1}
            data-testid="templateItem-type"
          >
            {type}
          </Typography>

          <Typography
            variant="h6"
            mt="0.5"
            mb="0"
            lineHeight={1.42}
            letterSpacing={0.25}
            data-testid="templateItem-name"
          >
            {name}
          </Typography>
          <Typography my="21px" color="textSecondary">
            {description}
          </Typography>
          {user_inputs.map((input) => {
            return (
              <TemplateTypeTag
                data-testid={`templateItem-userInput-${input.slug?.toLowerCase()}`}
                key={input?.slug}
                className="templateTypeTag"
              >
                {input.display_name}
              </TemplateTypeTag>
            );
          })}
        </CardContent>
        {isLimited && (
          <LimitedBox className="limitedBox">
            <Typography
              data-testid="templateItem-limitInfo"
              sx={{ whiteSpace: 'pre-line' }}
            >
              {(limitInfos[limitType] && limitInfos[limitType]()) || ''}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              data-testid="templateItem-upgradeButton"
              onClick={async (event) => {
                event.stopPropagation();
                if ((isPastDue || isPlanReachedLimit) && !isFree) {
                  const response = await getPaymentsPortal();
                  if (!response?.portal_url) return;
                  window.open(response?.portal_url, '_blank');
                  return;
                }
                setShowSubscriptionDialog(true);
              }}
            >
              {isExpired && !isFree ? 'Renew' : 'Upgrade'}
            </Button>
          </LimitedBox>
        )}
      </TemplateCard>
    </Grid>
  );
};

export default memo(TemplateItem);
