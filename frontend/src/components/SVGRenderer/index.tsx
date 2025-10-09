import React, { useEffect, useRef, useState, memo } from 'react';
import { IconButton } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import { styled } from '@mui/material/styles';
import Stack from '@mui/system/Stack';

const SVGContainerWrapper = styled('div')(() => ({
  position: 'relative',
  overflow: 'hidden'
}));

const SVGContainer = styled('div')(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  transformOrigin: 'center'
}));

const ZoomButtonsWrapper = styled(Stack)(() => ({
  position: 'absolute',
  marginTop: 'auto',
  top: 10,
  right: 10,
  gap: 8
}));

interface SVGRendererProps {
  svgString: string;
  height?: number | string;
  width?: string | number;
  showZoomControls?: boolean;
}

function SVGRenderer({
  svgString,
  height = 264,
  width = '100%',
  showZoomControls = true
}: SVGRendererProps) {
  const svgContainer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1); // State for zoom level

  const [isPanning, setIsPanning] = useState(false); // Track if panning is active
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Position of the SVG
  const [origin, setOrigin] = useState({ x: 0, y: 0 }); // Mouse origin for panning

  const maxScale = 3;
  const minScale = 0.5;
  const scaleStep = 0.1;

  useEffect(() => {
    if (svgContainer.current) {
      svgContainer.current.innerHTML = '';
    }

    // Convert the SVG string to a DOM node
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Set custom height and width attributes
    svgElement.setAttribute('height', height.toString());
    svgElement.setAttribute('width', width.toString());

    // Add styles to the SVG p elements
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      svg p {
        white-space: unset !important;
      }
    `;
    svgElement.appendChild(styleElement);

    if (svgContainer.current) {
      svgContainer.current.appendChild(svgElement);
    }
  }, [svgString, height, width]);

  // Zoom functions
  const adjustScale = (amount) =>
    setScale((prev) => Math.min(Math.max(prev + amount, minScale), maxScale));
  const handleZoomIn = () =>
    setScale((prev) => Math.min(prev + scaleStep, maxScale));
  const handleZoomOut = () =>
    setScale((prev) => Math.max(prev - scaleStep, minScale)); // Min scale 0.5x

  // Scroll to zoom
  const handleWheel = (e) => {
    adjustScale(e.deltaY < 0 ? scaleStep : -scaleStep); // Zoom in on scroll up, out on scroll down
  };

  // Mouse event handlers for panning
  const handleMouseDown = (e) => {
    setIsPanning(true);
    setOrigin({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const newX = e.clientX - origin.x;
      const newY = e.clientY - origin.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <SVGContainerWrapper
      data-testid="sVGRenderer-wrapper"
      style={{
        width,
        height,
        cursor: !showZoomControls ? 'initial' : isPanning ? 'grabbing' : 'grab'
      }}
      onMouseDown={showZoomControls ? (e) => handleMouseDown(e) : undefined}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Stop panning if mouse leaves
      onWheel={showZoomControls ? handleWheel : undefined}
    >
      <SVGContainer
        data-testid="sVGRenderer-svgContainer"
        ref={svgContainer}
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`
        }}
      />
      {showZoomControls && (
        <ZoomButtonsWrapper
          data-testid="sVGRenderer-zoomControlsWrapper"
          style={{ top: typeof height === 'number' ? height / 2 : '50%' }}
        >
          <IconButton
            data-testid="sVGRenderer-zoomIn"
            onClick={handleZoomIn}
            aria-label="Zoom In"
          >
            <AddRounded />
          </IconButton>
          <IconButton
            data-testid="sVGRenderer-zoomOut"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
          >
            <RemoveRounded />
          </IconButton>
        </ZoomButtonsWrapper>
      )}
    </SVGContainerWrapper>
  );
}

export default memo(SVGRenderer);
