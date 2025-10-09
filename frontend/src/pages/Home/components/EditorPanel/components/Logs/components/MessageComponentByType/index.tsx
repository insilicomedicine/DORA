import React, { useState } from 'react';
import { Typography, styled } from '@mui/material';

const ShowResultButton = styled('span')(() => ({
  marginLeft: '32px',
  textTransform: 'none',
  color: '#1C8554',
  cursor: 'pointer',
  fontSize: 12,
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '137%',
  '&:hover': {
    textDecoration: 'underline'
  }
}));

const LinkText = styled('span')(() => ({
  color: '#1C8554'
}));

interface MessageComponentByTypeProps {
  text: string;
  result?: string;
  buttonType?: string;
}

const MessageComponentByType = ({
  text,
  result,
  buttonType
}: MessageComponentByTypeProps) => {
  const [showResult, setShowResult] = useState(false);

  const prepareResult = (text: string) => {
    const regexPattern = /\((BIB_ID:.*?)\)/g;
    const pairsRegex = /BIB_ID:([a-fA-F0-9-]+),\sCHUNK_ID:([a-fA-F0-9-]+)/g;
    const replacedData = text
      .split(regexPattern)
      .map((part: string, index: number) => {
        if (part.match(pairsRegex)) {
          return (
            <span>
              (<LinkText>link is generating</LinkText>)
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      });

    return replacedData;
  };
  return (
    <>
      <Typography
        data-testid="messageComponentByType-text"
        sx={{
          color: '#666666',
          letterSpacing: '0.15px',
          marginLeft: '32px',
          lineHeight: '145%',
          marginTop: '8px',
          whiteSpace: 'pre-line'
        }}
      >
        {prepareResult(text)}
      </Typography>
      {result && (
        <ShowResultButton
          data-testid="messageComponentByType-showResultButton"
          onClick={() => {
            setShowResult(!showResult);
          }}
        >
          {showResult ? 'Hide' : 'Show'} {buttonType}
        </ShowResultButton>
      )}
      {showResult && (
        <Typography
          data-testid="messageComponentByType-result"
          sx={{
            lineHeight: '160%',
            letterSpacing: '0.15px',
            marginLeft: '32px',
            whiteSpace: 'pre-line',
            marginTop: '8px',
            fontFamily: 'Roboto Slab'
          }}
        >
          {result && prepareResult(result.toString())}
        </Typography>
      )}
    </>
  );
};

export default MessageComponentByType;
