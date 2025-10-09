import { handleDocumentScroll } from '../editor';
import { vi } from 'vitest';

describe('handleDocumentScroll', () => {
  let mockSetActiveSectionId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetActiveSectionId = vi.fn();
  });

  it('should not do anything if isScrollingDocumentPageContent is true', () => {
    const mockEvent = { target: {} } as React.UIEvent<HTMLElement>;
    handleDocumentScroll(mockEvent, true, [], mockSetActiveSectionId);
    expect(mockSetActiveSectionId).not.toHaveBeenCalled();
  });

  it('should not call setActiveSectionId if no sections are in the viewport', () => {
    const mockEvent = {
      target: {
        querySelector: vi.fn().mockReturnValue(null)
      }
    } as unknown as React.UIEvent<HTMLElement>;

    const paperSections = [{ id: 'section1' }, { id: 'section2' }];
    handleDocumentScroll(
      mockEvent,
      false,
      paperSections,
      mockSetActiveSectionId
    );
    expect(mockSetActiveSectionId).not.toHaveBeenCalled();
  });

  it('should call setActiveSectionId with the ID of the first section in the viewport', () => {
    const mockEvent = {
      target: {
        querySelector: vi.fn().mockImplementation((selector) => {
          const mockElement = {
            getBoundingClientRect: vi.fn().mockReturnValue({ top: 150 })
          };
          return selector === '[id="section1"]' ? mockElement : null;
        })
      }
    } as unknown as React.UIEvent<HTMLElement>;

    const paperSections = [{ id: 'section1' }, { id: 'section2' }];
    handleDocumentScroll(
      mockEvent,
      false,
      paperSections,
      mockSetActiveSectionId
    );
    expect(mockSetActiveSectionId).toHaveBeenCalledWith('section1');
  });

  it('should call setActiveSectionId with the ID of a later section if it is in the viewport', () => {
    const mockEvent = {
      target: {
        querySelector: vi.fn().mockImplementation((selector) => {
          const mockElement = {
            getBoundingClientRect: vi.fn().mockReturnValue(
              selector === '[id="section2"]' ? { top: 150 } : { top: 50 } // Section 1 is outside the viewport
            )
          };
          return mockElement;
        })
      }
    } as unknown as React.UIEvent<HTMLElement>;

    const paperSections = [{ id: 'section1' }, { id: 'section2' }];
    handleDocumentScroll(
      mockEvent,
      false,
      paperSections,
      mockSetActiveSectionId
    );
    expect(mockSetActiveSectionId).toHaveBeenCalledWith('section2');
  });

  it('should not call setActiveSectionId if no elements are within the viewport threshold', () => {
    const mockEvent = {
      target: {
        querySelector: vi.fn().mockImplementation(() => ({
          getBoundingClientRect: vi.fn().mockReturnValue({ top: 300 })
        }))
      }
    } as unknown as React.UIEvent<HTMLElement>;

    const paperSections = [{ id: 'section1' }];
    handleDocumentScroll(
      mockEvent,
      false,
      paperSections,
      mockSetActiveSectionId
    );
    expect(mockSetActiveSectionId).not.toHaveBeenCalled();
  });
});
