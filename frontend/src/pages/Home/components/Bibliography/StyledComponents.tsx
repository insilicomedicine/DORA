import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';

export const BlockTitle = styled('div')({
  fontSize: 18,
  fontWeight: 500,
  lineHeight: '30px'
});

export const Content = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.common.white,
  flex: 1,
  overflow: 'auto',
  marginTop: 14,
  border: `1px solid transparent`
}));

export const ContentDragAccept = styled(Content)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  border: `1px solid ${theme.palette.primary.main}`,
  position: 'relative',
  '& .listItem': {
    '&:hover': {
      backgroundColor: 'unset'
    }
  }
}));

export const ContentDragReject = styled(Content)(({ theme }) => ({
  border: `1px solid ${theme.palette.grey[200]}`,
  '& .colUploaded': {
    color: theme.palette.grey[200]
  },
  '& .colName': {
    color: theme.palette.grey[200]
  },
  '& .listItem': {
    borderBottom: `1px solid #EEEEEE`
  }
}));

export const FilterBar = styled(Box)({
  height: 36,
  margin: '14px 0',
  justifyContent: 'flex-end'
});

export const ListWrapper = styled(Box)({
  height: '100%',
  overflow: 'auto',
  borderRadius: 4
});

export const CustomListItem = styled(ListItem)(({ theme }) => ({
  padding: '7px 16px',
  boxSizing: 'border-box',
  borderBottom: `1px solid #F2F2F2`,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 400,
  '&:hover': {
    backgroundColor: theme.palette.grey[50]
  }
}));

export const ListItemGrey = styled(CustomListItem)(({ theme }) => ({
  color: theme.palette.grey[500],
  '&:hover': {
    backgroundColor: 'unset',
    cursor: 'default'
  }
}));

export const ColName = styled(Box)({
  flex: 1,
  width: '100%',
  paddingRight: 40,
  boxSizing: 'border-box',
  overflow: 'hidden'
});

export const ColUploaded = styled(Box)({
  width: 160,
  marginRight: 40
});

export const ColActions = styled(Box)({
  width: 24,
  marginRight: 24
});

export const MoreActionsWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.common.white,
  padding: '8px 0',
  borderRadius: 8,
  width: 184,
  boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.08)'
}));

export const MoreActionItem = styled(Box)(({ theme }) => ({
  padding: '0 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
  height: 40,
  cursor: 'pointer',
  '& .MuiSvgIcon-fontSizeSmall': {
    color: theme.palette.grey[600]
  },
  '&:hover': {
    backgroundColor: '#F2F2F2',
    '& .MuiSvgIcon-fontSizeSmall': {
      color: '#E31B0C'
    }
  }
}));

export const Name = styled(Box)({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
});

export const DragInfo = styled(Box)(({ theme }) => ({
  width: 304,
  padding: '12px 16px 16px',
  boxSizing: 'border-box',
  backgroundColor: theme.palette.primary.main,
  borderRadius: 16,
  position: 'absolute',
  bottom: 8,
  textAlign: 'center',
  left: '50%',
  transform: 'translateX(-50%)',
  '& p': {
    color: theme.palette.common.white,
    fontSize: 14,
    lineHeight: '20px',
    margin: 0
  }
}));

export const DragFailInfo = styled(Box)(({ theme }) => ({
  width: 354,
  height: 108,
  boxSizing: 'border-box',
  padding: 16,
  backgroundColor: theme.palette.grey[700],
  borderRadius: 16,
  position: 'fixed',
  bottom: 48,
  textAlign: 'center',
  left: '50%',
  transform: 'translateX(-50%)',
  '& p': {
    color: theme.palette.common.white,
    fontSize: 14,
    lineHeight: '20px',
    margin: 0,
    letterSpacing: '0.15px'
  }
}));
