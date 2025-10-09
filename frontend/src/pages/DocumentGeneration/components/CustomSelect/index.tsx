import React, { ChangeEvent, useState, memo } from 'react';
import {
  Select,
  MenuItem,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  SelectProps,
  TooltipProps,
  tooltipClasses,
  Button,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckRounded,
  CloseRounded,
  EditOutlined,
  AddRounded,
  ArrowDropDownRounded,
  DeleteForever
} from '@mui/icons-material';
import { theme } from 'theme';
import useSettingsStore from 'contexts/useSettingsStore';

const StyledSelect = styled(Select)(() => ({
  display: 'flex',
  flexDirection: 'column',
  fontSize: 14,
  alignItems: 'flex-start',
  gap: 3,
  alignSelf: 'stretch',
  borderRadius: 8,
  backgroundColor: theme.palette?.grey[50],
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none'
  },
  '& .MuiSelect-select': {
    padding: '10px 16px',
    maxWidth: 245
  }
}));

const StyledMenuItem = styled(MenuItem)(() => ({
  display: 'flex',
  padding: '12px 16px',
  alignItems: 'center',
  gap: 16,
  '& .editIcon': {
    display: 'none' // Initially hide the edit icon
  },
  '&:hover .deleteContent': {
    display: 'inline-flex'
  }
}));

const CustomOptionTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} placement="top" />
))(({}) => ({
  [`&.${tooltipClasses.popper}`]: {
    maxHeight: 20
  }
}));

interface Option {
  key: string;
  value: string;
  label: string;
  disabled?: boolean;
  isNew?: boolean;
}

interface CustomSelectProps extends Omit<SelectProps, 'children'> {
  options: Option[];
  enableCreateNew?: boolean;
  selectedSection: string[];
  sectionLevel?: number;
  enhancedSections?: string[];
  setSelectedSection?: (value: string[]) => void;
}

const CustomSelect = ({
  options,
  enableCreateNew = false,
  sectionLevel = 0,
  selectedSection = [],
  enhancedSections = [],
  setSelectedSection = () => {},
  ...props
}: CustomSelectProps) => {
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');
  const [customValueKey, setCustomValueKey] = useState<string>('');
  const [isShowDeleteMeassage, setIsShowDeleteMeassage] =
    useState<boolean>(false);
  const { addSubsection, removeSubsection, updateSubsection } =
    useSettingsStore((state) => state);

  const handleCustomInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCustomValue(event.target.value);
  };

  const handleCustomValueSubmit = async () => {
    if (!customValue.trim()) return;
    const option = options.find((opt) => opt.key === customValueKey);
    const key =
      customValueKey || customValue.toLowerCase().replace(/\s+/g, '-');
    if (!option) {
      const newSubsection = {
        key,
        slug: key,
        title: customValue,
        isNew: true,
        sub_sections: []
      };
      addSubsection(selectedSection[0], newSubsection);
    } else {
      updateSubsection(selectedSection[0], option.key, {
        title: customValue
      });
    }
    setSelectedSection([...selectedSection.slice(0, sectionLevel), key]);
    setCustomValue('');
    setCustomValueKey('');
    setIsTextInputMode(false);
  };

  const handleCreateSubsectionClick = (e) => {
    e.stopPropagation();
    setIsTextInputMode(true);
  };

  const handleDeleteSubsection = (e, key: string) => {
    e.stopPropagation();
    removeSubsection(selectedSection[0], key);
  };

  const selectedOption = options.find(
    (opt: Option) => opt.key === selectedSection[selectedSection.length - 1]
  );

  const handleEditSubsection = (e) => {
    e.stopPropagation();
    setIsTextInputMode(true);
    if (!selectedOption) return;
    setCustomValue(selectedOption?.label);
    setCustomValueKey(selectedOption?.key);
  };

  return isTextInputMode ? (
    <TextField
      value={customValue}
      onChange={handleCustomInputChange}
      placeholder="Enter custom value"
      variant="outlined"
      autoFocus
      fullWidth
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                sx={{ p: 0, mr: 1 }}
                onClick={handleCustomValueSubmit}
              >
                <CheckRounded fontSize="small" />
              </IconButton>
              <IconButton
                sx={{ p: 0 }}
                onClick={() => setIsTextInputMode(false)}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }
      }}
      sx={{
        fontSize: 14,
        '& input': {
          py: '10px'
        }
      }}
      onKeyDown={(e) => e.key === 'Enter' && handleCustomValueSubmit()}
    />
  ) : (
    <StyledSelect
      {...props}
      sx={{
        '& .editIcon': {
          ...(props.disabled && {
            display: 'none'
          })
        }
      }}
      IconComponent={(props) => (
        <>
          {selectedOption?.isNew && (
            <Tooltip title="Rename" placement="top">
              <IconButton
                onClick={(e) => handleEditSubsection(e)}
                className="editIcon"
                sx={{
                  position: 'absolute',
                  right: 28,
                  top: 6,
                  p: 0.5
                }}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <ArrowDropDownRounded {...props} />
        </>
      )}
    >
      {options.map((option) =>
        !props.disabled && enhancedSections?.includes(option.key) ? (
          <CustomOptionTooltip
            key={option.value}
            title="This section is already enhanced with your data."
          >
            <span>
              <StyledMenuItem value={option.value} disabled>
                {option.label}
              </StyledMenuItem>
            </span>
          </CustomOptionTooltip>
        ) : (
          <StyledMenuItem key={option.value} value={option.value} disableRipple>
            {option.label}
            {option.isNew && (
              <Stack
                className="deleteContent"
                justifyContent="center"
                sx={{
                  p: 0,
                  ml: 'auto',
                  display: 'none',
                  height: 21
                }}
              >
                {isShowDeleteMeassage ? (
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2">Delete group?</Typography>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      sx={{
                        fontSize: 12,
                        textTransform: 'none'
                      }}
                      onClick={(e) => handleDeleteSubsection(e, option.key)}
                    >
                      Delete
                    </Button>
                  </Stack>
                ) : (
                  <Tooltip title="Delete Subsection" placement="top">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShowDeleteMeassage(true);
                      }}
                      className="deleteIcon"
                      sx={{
                        '&:hover': { color: 'red' }
                      }}
                    >
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </StyledMenuItem>
        )
      )}
      {enableCreateNew && (
        <StyledMenuItem
          sx={{
            display: 'block',
            padding: 0,
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }}
        >
          <Divider />
          <Typography
            variant="body2"
            sx={{
              display: 'flex',
              p: '12px 16px',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer'
            }}
            onClick={handleCreateSubsectionClick}
          >
            <AddRounded htmlColor={theme.palette.grey[600]} />
            Create New
          </Typography>
        </StyledMenuItem>
      )}
    </StyledSelect>
  );
};

export default memo(CustomSelect);
