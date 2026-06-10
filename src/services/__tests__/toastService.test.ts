import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.hoisted(() => ({
  base: vi.fn(() => 'info-id'),
  success: vi.fn(() => 'success-id'),
  error: vi.fn(() => 'error-id'),
  loading: vi.fn(() => 'loading-id'),
  dismiss: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastMock.base, {
    success: toastMock.success,
    error: toastMock.error,
    loading: toastMock.loading,
    dismiss: toastMock.dismiss,
  }),
}));

import { appToasterProps, dismissToast, showErrorToast, showInfoToast, showLoadingToast, showSuccessToast } from '../toastService';

describe('toastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes centralized success, error, info, and loading messages', () => {
    expect(showSuccessToast('success')).toBe('success-id');
    expect(showErrorToast('error')).toBe('error-id');
    expect(showInfoToast('info')).toBe('info-id');
    expect(showLoadingToast('loading')).toBe('loading-id');

    expect(toastMock.success).toHaveBeenCalledWith('success');
    expect(toastMock.error).toHaveBeenCalledWith('error');
    expect(toastMock.base).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        icon: expect.any(Object),
      }),
    );
    expect(toastMock.loading).toHaveBeenCalledWith('loading');
  });

  it('keeps the global toaster visible at the top center', () => {
    expect(appToasterProps).toMatchObject({
      position: 'top-center',
      containerStyle: {
        zIndex: 99999,
      },
      toastOptions: {
        duration: 3500,
        success: { duration: 4500 },
        error: { duration: 5000 },
      },
    });
  });

  it('dismisses a toast by id', () => {
    dismissToast('toast-id');
    expect(toastMock.dismiss).toHaveBeenCalledWith('toast-id');
  });
});
