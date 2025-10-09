import React, { memo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  styled
} from '@mui/material';
import { templateIcons } from 'utils/templates';
import { getPaymentsPortal } from 'services/payments';
import { Template } from 'types/template';
import usePlanStatus from 'hooks/usePlanStatus';
import { convertToKey } from 'utils/utils';
import { useNavigate } from 'react-router';
import { useUserStore } from 'contexts/useUserStore';
import { format } from 'date-fns';

const TemplateCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  padding: '0 8px',
  backgroundColor: theme.palette?.common.white,
  boxShadow: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  height: '100%',
  border: `1px solid ${theme.palette.common.white}`,
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

const TemplateIcon = styled('span')(({ theme }) => ({
  display: 'block',
  width: 52,
  height: 52,
  lineHeight: '52px',
  textAlign: 'center',
  borderRadius: 8,
  backgroundColor: theme.palette.grey[50]
}));

const TemplateTypeTag = styled('span')(({ theme }) => ({
  display: 'inline-block',
  padding: '4px 8px',
  textAlign: 'center',
  marginRight: 8,
  marginBottom: 4,
  borderRadius: 16,
  fontSize: 12,
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
  const { id, type = '', name, description, user_inputs = [] } = template;
  const { icon: templateIcon = '📚' } = templateIcons[convertToKey(type)] || {};
  const {
    isLimited,
    isPastDue,
    isPlanReachedLimit,
    isFree,
    isExpired,
    limitType = '',
    endDate = ''
  } = usePlanStatus();

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
      sx={{ position: 'relative' }}
      data-testid="templateItem-wrapper"
    >
      <TemplateCard>
        <CardContent>
          <Stack
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <TemplateIcon className="templateIcon">{templateIcon}</TemplateIcon>
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
          <Typography my={2} color="textSecondary">
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
