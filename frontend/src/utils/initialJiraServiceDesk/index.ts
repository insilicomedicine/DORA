import { JIRA_WIDGET_KEY } from '../../config/env';

const JSD_BASE_URL = 'https://jsd-widget.atlassian.com';
const JSD_SRC = `${JSD_BASE_URL}/assets/embed.js`;

let domContentLoadedDispatched = false;

export const jiraServiceDesk = (callback: () => void): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const headEl = document.head;
  if (!headEl) {
    return;
  }

  const onLoad = (event?: Event) => {
    const scriptEl =
      (event?.currentTarget as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>(`script[src="${JSD_SRC}"]`);
    if (scriptEl) {
      scriptEl.setAttribute('data-jsd-loaded', 'true');
    }
    callback();
  };

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${JSD_SRC}"]`
  );
  if (existingScript) {
    if (existingScript.getAttribute('data-jsd-loaded') === 'true') {
      onLoad();
      return;
    }
    existingScript.addEventListener('load', onLoad, { once: true });
    return;
  }

  const jsdScript = document.createElement('script');
  jsdScript.type = 'text/javascript';
  jsdScript.async = true;
  jsdScript.dataset.jsdEmbedded = '';
  jsdScript.dataset.key = JIRA_WIDGET_KEY;
  jsdScript.dataset.baseUrl = JSD_BASE_URL;
  jsdScript.src = JSD_SRC;
  jsdScript.addEventListener('load', onLoad, { once: true });
  headEl.appendChild(jsdScript);
};

const initializeDOMContentLoaded = (): void => {
  if (domContentLoadedDispatched) {
    return;
  }
  domContentLoadedDispatched = true;
  const domContentLoadedEvent = new Event('DOMContentLoaded', {
    bubbles: true,
    cancelable: true
  });
  window.document.dispatchEvent(domContentLoadedEvent);
};

export const initialJiraServiceDesk = (afterInit?: () => void): void => {
  if (!JIRA_WIDGET_KEY) return;
  jiraServiceDesk(() => {
    initializeDOMContentLoaded();
    if (afterInit) {
      afterInit();
    }
  });
};
