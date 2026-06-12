import { useEffect } from 'react';

type KeyboardTarget = Pick<Document, 'addEventListener' | 'removeEventListener'>;

type ReloadKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'preventDefault' | 'stopPropagation'>;

export function isReloadShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>) {
  if (event.altKey) {
    return false;
  }

  if (event.key === 'F5') {
    return true;
  }

  return event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey);
}

export function registerInternalReloadGuard(
  target: KeyboardTarget,
  shouldBlockReload: () => boolean,
  onBlockedReload: () => void,
) {
  const handleKeyDown = (event: KeyboardEvent) => {
    handleInternalReloadKeyDown(event, shouldBlockReload, onBlockedReload);
  };

  target.addEventListener('keydown', handleKeyDown);
  return () => target.removeEventListener('keydown', handleKeyDown);
}

export function handleInternalReloadKeyDown(
  event: ReloadKeyboardEvent,
  shouldBlockReload: () => boolean,
  onBlockedReload: () => void,
) {
  if (!shouldBlockReload() || !isReloadShortcut(event)) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  onBlockedReload();
  return true;
}

export function useInternalReloadGuard(isDirty: boolean, onBlockedReload: () => void) {
  useEffect(() => {
    return registerInternalReloadGuard(document, () => isDirty, onBlockedReload);
  }, [isDirty, onBlockedReload]);
}
