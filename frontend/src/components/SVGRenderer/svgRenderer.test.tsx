import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SVGRenderer from './index';

describe('SVGRenderer Component', () => {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
  </svg>`;

  test('renders the SVG container and controls', () => {
    render(<SVGRenderer svgString={svgString} showZoomControls={true} />);

    expect(screen.getByTestId('sVGRenderer-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('sVGRenderer-svgContainer')).toBeInTheDocument();
    expect(
      screen.getByTestId('sVGRenderer-zoomControlsWrapper')
    ).toBeInTheDocument();
  });

  test('zooms in when the zoom-in button is clicked', () => {
    render(<SVGRenderer svgString={svgString} showZoomControls={true} />);

    const zoomInButton = screen.getByTestId('sVGRenderer-zoomIn');
    const svgContainer = screen.getByTestId('sVGRenderer-svgContainer');

    // Simulate zoom in action and check for scale change
    fireEvent.click(zoomInButton);
    expect(svgContainer).toHaveStyle(
      'transform: scale(1.1) translate(0px, 0px)'
    );
  });

  test('zooms out when the zoom-out button is clicked', () => {
    render(<SVGRenderer svgString={svgString} showZoomControls={true} />);

    const zoomOutButton = screen.getByTestId('sVGRenderer-zoomOut');
    const svgContainer = screen.getByTestId('sVGRenderer-svgContainer');

    // Simulate zoom out action and check for scale change
    fireEvent.click(zoomOutButton);
    expect(svgContainer).toHaveStyle(
      'transform: scale(0.9) translate(0px, 0px)'
    );
  });

  test('pans the SVG when mouse is dragged', () => {
    render(<SVGRenderer svgString={svgString} showZoomControls={true} />);

    const svgWrapper = screen.getByTestId('sVGRenderer-wrapper');
    const svgContainer = screen.getByTestId('sVGRenderer-svgContainer');

    // Simulate mouse drag to pan the SVG
    fireEvent.mouseDown(svgWrapper, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(svgWrapper, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(svgWrapper);

    expect(svgContainer).toHaveStyle(
      'transform: scale(1) translate(50px, 50px)'
    );
  });

  test('zooms in and out on scroll', () => {
    render(<SVGRenderer svgString={svgString} showZoomControls={true} />);

    const svgWrapper = screen.getByTestId('sVGRenderer-wrapper');
    const svgContainer = screen.getByTestId('sVGRenderer-svgContainer');

    // Simulate scroll up (zoom in)
    fireEvent.wheel(svgWrapper, { deltaY: -100 });
    expect(svgContainer).toHaveStyle(
      'transform: scale(1.1) translate(0px, 0px)'
    );

    // Simulate scroll down (zoom out)
    fireEvent.wheel(svgWrapper, { deltaY: 100 });
    expect(svgContainer).toHaveStyle('transform: scale(1) translate(0px, 0px)');
  });

  test('renders SVG at specified height and width', () => {
    const customHeight = 300;
    const customWidth = 600;

    render(
      <SVGRenderer
        svgString={svgString}
        height={customHeight}
        width={customWidth}
      />
    );

    const svgWrapper = screen.getByTestId('sVGRenderer-wrapper');

    expect(svgWrapper).toHaveStyle(`width: ${customWidth}px`);
    expect(svgWrapper).toHaveStyle(`height: ${customHeight}px`);
  });
});
