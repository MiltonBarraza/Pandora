import { describe, expect, it, vi } from 'vitest';
import { handleInternalReloadKeyDown, isReloadShortcut, registerInternalReloadGuard } from '../useInternalReloadGuard';

describe('useInternalReloadGuard helpers', () => {
  it('detects reload shortcuts without matching unrelated keys', () => {
    expect(isReloadShortcut({ key: 'F5', ctrlKey: false, metaKey: false, altKey: false })).toBe(true);
    expect(isReloadShortcut({ key: 'r', ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(isReloadShortcut({ key: 'R', ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(isReloadShortcut({ key: 'r', ctrlKey: false, metaKey: false, altKey: false })).toBe(false);
    expect(isReloadShortcut({ key: 'r', ctrlKey: true, metaKey: false, altKey: true })).toBe(false);
  });

  it('blocks reload shortcuts when configuration is dirty', () => {
    const event = {
      key: 'F5',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    const onBlockedReload = vi.fn();

    expect(handleInternalReloadKeyDown(event, () => true, onBlockedReload)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onBlockedReload).toHaveBeenCalledTimes(1);
  });

  it('does not block reload shortcuts when configuration is clean', () => {
    const event = {
      key: 'F5',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    const onBlockedReload = vi.fn();

    expect(handleInternalReloadKeyDown(event, () => false, onBlockedReload)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onBlockedReload).not.toHaveBeenCalled();
  });

  it('registers and removes the same keydown listener', () => {
    let listener: ((event: KeyboardEvent) => void) | undefined;
    const target = {
      addEventListener: vi.fn((_type: 'keydown', nextListener: (event: KeyboardEvent) => void) => {
        listener = nextListener;
      }),
      removeEventListener: vi.fn(),
    };

    const cleanup = registerInternalReloadGuard(target as unknown as Document, () => true, vi.fn());

    expect(target.addEventListener).toHaveBeenCalledWith('keydown', listener);
    cleanup();
    expect(target.removeEventListener).toHaveBeenCalledWith('keydown', listener);
  });
});
