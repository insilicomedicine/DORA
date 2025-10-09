import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ModalHeader from './index';
import * as utils from 'utils/utils';

vi.mock('utils/utils');
describe('ModalHeader Component', () => {
  const mockOnClose = vi.fn();
  const mockDownloadSvg = vi.spyOn(utils, 'downloadSvg');

  const props = {
    onClose: mockOnClose,
    titleText: 'Test Modal Header',
    svg: '<svg></svg>',
    documentTitle: 'Test Document'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title text', () => {
    render(<ModalHeader {...props} />);
    expect(screen.getByText('Test Modal Header')).toBeInTheDocument();
  });

  it('triggers the download function when download button is clicked', () => {
    render(<ModalHeader {...props} />);

    const downloadButton = screen.getByLabelText('download-svg');
    fireEvent.click(downloadButton);

    expect(mockDownloadSvg).toHaveBeenCalledTimes(1);
    expect(mockDownloadSvg).toHaveBeenCalledWith(
      props.svg,
      props.documentTitle
    );
  });

  it('calls the onClose function when close button is clicked', () => {
    render(<ModalHeader {...props} />);

    const closeButton = screen.getByLabelText('close-modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
