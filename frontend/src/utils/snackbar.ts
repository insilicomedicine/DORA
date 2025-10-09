import { ReactNode } from 'react';
import { useSnackbar, VariantType } from 'notistack';

let useSnackbarRef: any;
export const SnackbarUtilsConfigurator = () => {
  useSnackbarRef = useSnackbar();
  return null;
};

export const getSnackbarInstance = () => {
  if (typeof document === 'undefined') return null;
  return document.querySelector('#notistack-snackbar');
};

export default {
  success(msg: string | ReactNode, options?: any) {
    this.toast(msg, 'success', options);
  },
  warning(msg: string | ReactNode, options?: any) {
    this.toast(msg, 'warning', options);
  },
  info(msg: string | ReactNode, options?: any) {
    this.toast(msg, 'info', { hideIconVariant: true, ...options });
  },
  error(msg: string) {
    if (getSnackbarInstance()) return;
    this.toast(msg, 'error', {
      autoHideDuration: 5000
    });
  },
  toast(
    msg: string | ReactNode,
    variant: VariantType = 'default',
    options?: any
  ) {
    useSnackbarRef?.enqueueSnackbar(msg, {
      variant,
      preventDuplicate: true,
      ...options
    });
  }
};
