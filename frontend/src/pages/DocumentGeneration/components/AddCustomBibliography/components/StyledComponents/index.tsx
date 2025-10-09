import { styled, Tooltip, tooltipClasses, TooltipProps } from '@mui/material';

export const CustomTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip
    {...props}
    placement="top"
    classes={{ popper: className }}
    disableInteractive
  />
))(({}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    marginBottom: '5px !important'
  }
}));
