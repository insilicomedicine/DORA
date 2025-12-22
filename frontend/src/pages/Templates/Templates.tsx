import React, { useEffect, useState } from 'react';
import {
  Grid,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Stack
} from '@mui/material';
import { getTemplates } from 'services/templates';
import { filterTemplatesByType } from 'utils/templates';
import TemplateItem from './components/TemplateItem';
import Icons from './components/Icons';
import { Template } from 'types/template';
import PageSkeleton from 'components/PageSkeleton';

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fecthTemplates = async () => {
      setIsLoading(true);
      const response = await getTemplates();
      setTemplates(response);

      const uniqueTypes = new Set(
        response.map((template: any) => template.type as string)
      );
      const types: string[] = Array.from(uniqueTypes) as string[];
      types.unshift('All templates');
      setTemplateTypes(types);

      if (types.length > 0) {
        setSelectedType(types[0]);
      }
      setIsLoading(false);
    };
    fecthTemplates();
  }, []);

  const filteredTemplates = React.useMemo(() => {
    return filterTemplatesByType(templates, selectedType);
  }, [templates, selectedType]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="90%"
        width="100%"
      >
        <PageSkeleton style={{ minWidth: '57%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', margin: '32px 0' }}>
      {!isLoading && (
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Typography fontWeight={500} lineHeight={'150%'}>
            Select Your Story
          </Typography>
          <FormControl>
            <Select
              value={selectedType}
              defaultValue="All templates"
              onChange={(e) => setSelectedType(e.target.value as string)}
              size="small"
              sx={{
                width: 288,
                borderRadius: 2,
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }
              }}
            >
              {templateTypes.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 48,
                    gap: 0.5
                  }}
                >
                  <Icons type={type} />
                  <span>{type}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}
      <Grid
        container
        spacing={2}
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
      >
        {filteredTemplates.map((template: Template) => {
          const { id } = template;
          return (
            <TemplateItem
              key={id}
              template={{
                ...template
              }}
            />
          );
        })}
      </Grid>
    </Box>
  );
};

export default Templates;
