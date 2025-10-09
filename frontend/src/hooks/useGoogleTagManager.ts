import { useEffect } from 'react';
import { getPageType, sendGA4Event } from 'utils/ga';
import { GA_MEASUREMENT_ID, ENVIRONMENT } from 'config/env';

const useGoogleTagManager = () => {
  useEffect(() => {
    const existingScript = document.getElementById('google-tag-manager');
    if (!existingScript) {
      // Enable debug mode for test, test2, and local environment
      const isEnableDebugMode = ['test', 'test2', 'local'].includes(
        ENVIRONMENT
      );
      // Create the first script tag
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.id = 'google-tag-manager';
      document.head.appendChild(script);

      // Create the second script tag
      const pageType = getPageType();
      const scriptContent = document.createElement('script');
      scriptContent.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', { 
          'send_page_view': false,
          'debug_mode': ${isEnableDebugMode}
          ${pageType ? `,'page_type': '${pageType}'` : ''} 
        });
      `;
      document.head.appendChild(scriptContent);
    }
  }, []);

  useEffect(() => {
    // Get the page type from the pathname
    const pageType = getPageType();
    if (!pageType) return;
    // Send the page view event
    sendGA4Event('page_view', {
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_type: pageType
    });
  }, [location.pathname]);
};

export default useGoogleTagManager;
