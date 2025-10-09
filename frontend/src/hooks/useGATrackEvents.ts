import { useEffect } from 'react';
import { sendGA4Event } from 'utils/ga';

type DependencyArray = ReadonlyArray<unknown>;

interface UseCustomHookParams {
  deps?: DependencyArray;
}

export const useGATrackEvents = ({ deps = [] }: UseCustomHookParams = {}) => {
  useEffect(() => {
    /**
     * data-ga-tracking is used to enable or disable GA tracking. @default (undefined)
     * data-ga-event specifies the custom event name. @default (undefined)
     * data-ga-event-type specifies the type of general events(button_type). @default (undefined)
     * data-ga-event-action-type specifies the type of additional events(action_type). @default (undefined)
     * data-ga-event-location specifies the event location(location). @default ('others')
     * data-page-type specifies the type of page(page_type). @default (window.location.pathname.split('/').pop())
     * data-ga-event-params specifies the custom event parameters. @default (undefined)
     */
    const handleClick = (event: Event) => {
      let target = event.target as HTMLElement;

      // Handle outbound links first
      const link = target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (
          href &&
          !href.startsWith('#') &&
          !href.startsWith('/') &&
          !href.startsWith(window.location.origin)
        ) {
          // This is an outbound link
          // Extract hostname from the href
          let hostname = '';
          try {
            const url = new URL(href);
            hostname = url.hostname;
          } catch (_e) {
            // Invalid URL, skip tracking
            return;
          }

          // Send custom outbound click event
          sendGA4Event('outbound_click', {
            link_url: href,
            link_domain: hostname,
            link_text: link.textContent?.trim() || 'unknown',
            page_location: window.location.href
          });

          // Return after handling outbound link
          return;
        }
      }

      // Handle button clicks
      if (target.parentElement?.tagName === 'BUTTON') {
        target = target.parentElement;
      }

      // Get the custom event name from data-ga-event attribute
      const customEventName = target.getAttribute('data-ga-event');
      // Enable GA tracking if data-ga-tracking is set to true or event name is provided
      const isEnableGATracking = Boolean(
        target.getAttribute('data-ga-tracking') || customEventName
      );

      if (!isEnableGATracking) {
        return;
      }

      const eventName = customEventName || 'click_button';
      const buttonType =
        target.getAttribute('data-ga-event-type') ||
        target.textContent ||
        eventName;
      const actionType = target.getAttribute('data-ga-event-action-type');

      // Get the location from data-ga-event-location attribute
      const targetTape = target.getAttribute('type') || target.tagName;
      const location =
        target.getAttribute('data-ga-event-location') ||
        (targetTape === 'submit' ? 'form' : 'others');

      const pageLocation = window.location.href;
      const customEventParams = target.getAttribute('data-ga-event-params');

      sendGA4Event(
        eventName,
        customEventParams
          ? JSON.parse(customEventParams)
          : {
              ...(buttonType && { button_type: buttonType }),
              ...(actionType && { action_type: actionType }),
              location,
              page_location: pageLocation
            }
      );
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, deps);
};
