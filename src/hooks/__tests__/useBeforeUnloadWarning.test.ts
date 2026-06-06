import { describe, expect, it, vi } from 'vitest';
import { registerBeforeUnloadWarning } from '../useBeforeUnloadWarning';

describe('registerBeforeUnloadWarning', () => {
  it('warns before unloading and removes the same listener on cleanup', () => {
    let listener: ((event: BeforeUnloadEvent) => void) | undefined;
    const target = {
      addEventListener: vi.fn((_type: 'beforeunload', nextListener: (event: BeforeUnloadEvent) => void) => {
        listener = nextListener;
      }),
      removeEventListener: vi.fn(),
    };
    const cleanup = registerBeforeUnloadWarning(target as unknown as Window);
    const event = {
      preventDefault: vi.fn(),
      returnValue: 'initial',
    } as unknown as BeforeUnloadEvent;

    listener?.(event);

    expect(target.addEventListener).toHaveBeenCalledWith('beforeunload', listener);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe('');

    cleanup();
    expect(target.removeEventListener).toHaveBeenCalledWith('beforeunload', listener);
  });
});
