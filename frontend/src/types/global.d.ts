import React from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }

  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id'?: string;
          'publishable-key'?: string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
