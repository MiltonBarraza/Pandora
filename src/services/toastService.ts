import { createElement } from 'react';
import toast, { type ToasterProps } from 'react-hot-toast';
import { AppIcon } from '../components/ui/AppIcon/AppIcon';

export type ToastId = string;

export const appToasterProps: ToasterProps = {
  position: 'top-center',
  containerStyle: {
    zIndex: 99999,
  },
  toastOptions: {
    duration: 3500,
    style: {
      background: 'var(--color-toast-bg)',
      border: '1px solid var(--color-toast-border)',
      boxShadow: 'var(--shadow-toast)',
      color: 'var(--color-toast-text)',
    },
    success: {
      duration: 4500,
    },
    error: {
      duration: 5000,
    },
  },
};

export function showSuccessToast(message: string): ToastId {
  return toast.success(message);
}

export function showErrorToast(message: string): ToastId {
  return toast.error(message);
}

export function showInfoToast(message: string): ToastId {
  return toast(message, {
    icon: createElement(
      'span',
      { className: 'appToastInfoIconWrap', 'aria-hidden': 'true' },
      createElement(AppIcon, { name: 'info', className: 'appToastInfoIcon', focusable: 'false' }),
    ),
  });
}

export function showLoadingToast(message: string): ToastId {
  return toast.loading(message);
}

export function dismissToast(id?: ToastId) {
  toast.dismiss(id);
}
