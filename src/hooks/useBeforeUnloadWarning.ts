import { useEffect } from 'react';

type BeforeUnloadTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export function registerBeforeUnloadWarning(target: BeforeUnloadTarget) {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };

  target.addEventListener('beforeunload', handleBeforeUnload);
  return () => target.removeEventListener('beforeunload', handleBeforeUnload);
}

export function useBeforeUnloadWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    return registerBeforeUnloadWarning(window);
  }, [isDirty]);
}
