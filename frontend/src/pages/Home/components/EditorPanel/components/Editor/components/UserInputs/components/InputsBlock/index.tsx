import React, { memo } from 'react';
import { Stack, Typography } from '@mui/material';
import ExpandableInputsBlock from './components/ExpandableInputsBlock';

interface UserInputBlockProps {
  title: string;
  content: { display_name: string; value: string }[] | null;
}

const InputsBlock = ({ title, content }: UserInputBlockProps) => {
  const maxTextLength = 400;

  return (
    <div style={{ marginBottom: 20 }}>
      <Typography
        fontWeight={500}
        mb={1}
        textTransform="capitalize"
        data-testid="inputsBlock-title"
      >
        {title}
      </Typography>
      {content?.map((item, index) => {
        const textIsLong = item?.value.length > maxTextLength;
        return (
          <Stack
            data-testid="inputsBlock-contentWrapper"
            key={index}
            sx={{
              backgroundColor: '#F5F5F5',
              marginBottom: 2,
              borderRadius: 2,
              padding: textIsLong ? '8px 8px 8px 16px' : '12px 16px'
            }}
          >
            {textIsLong ? (
              <ExpandableInputsBlock
                title={item?.display_name}
                content={item?.value}
              />
            ) : (
              <>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  textTransform="capitalize"
                  data-testid="inputsBlock-contentTitle"
                >
                  {item?.display_name}
                </Typography>
                <Typography
                  variant="body2"
                  data-testid="inputsBlock-contentText"
                >
                  {item?.value}
                </Typography>
              </>
            )}
          </Stack>
        );
      })}
    </div>
  );
};

export default memo(InputsBlock);
