import {
  styled,
  TextField,
  Tooltip,
  tooltipClasses,
  TooltipProps
} from '@mui/material';

export const CustomTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: theme.palette.grey[50],
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: 1.45,
    letterSpacing: 0.15,
    border: 'none',
    minHeight: 40,
    '& input': {
      padding: 0
    },
    '&:before': {
      borderBottom: 'none'
    },
    '&:after': {
      borderBottom: 'none'
    },
    '&:hover:not(.Mui-disabled):before': {
      borderBottom: 'none'
    }
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent'
  }
}));

export const CustomTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} placement="right-start" />
))(({}) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: 'white',
    textAlign: 'left',
    color: 'black',
    marginTop: -5,
    marginLeft: '8px !important',
    maxWidth: 330,
    padding: '16px 24px',
    borderRadius: 8,
    boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
  }
}));
