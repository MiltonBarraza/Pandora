import toast, { type ToasterProps } from 'react-hot-toast';

export type ToastId = string;

export const appToasterProps: ToasterProps = {
  position: 'top-center',
  containerStyle: {
    zIndex: 99999,
  },
  toastOptions: {
    duration: 3500,
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
  return toast(message, { icon: 'i' });
}

export function showLoadingToast(message: string): ToastId {
  return toast.loading(message);
}

export function dismissToast(id?: ToastId) {
  toast.dismiss(id);
}
