import { describe, expect, it } from 'vitest';
import { lockDocumentScroll } from '../useDocumentScrollLock';

function createDocumentStyles() {
  return {
    body: {
      style: {
        overflow: 'auto',
        paddingRight: '4px',
        position: 'relative',
        top: '2px',
        left: '3px',
        width: '90%',
      },
    } as HTMLElement,
    documentElement: {
      clientWidth: 980,
      style: {
        overflow: 'scroll',
      },
    } as HTMLElement,
  };
}

describe('lockDocumentScroll', () => {
  it('locks document scroll with scrollbar compensation and restores inline styles', () => {
    const targetDocument = createDocumentStyles();
    const restoredPositions: Array<[number, number]> = [];
    const cleanup = lockDocumentScroll(
      targetDocument,
      1000,
      () => '6px',
      { x: 12, y: 340 },
      (x, y) => restoredPositions.push([x, y]),
    );

    expect(targetDocument.body.style.overflow).toBe('hidden');
    expect(targetDocument.body.style.paddingRight).toBe('26px');
    expect(targetDocument.body.style.position).toBe('fixed');
    expect(targetDocument.body.style.top).toBe('-340px');
    expect(targetDocument.body.style.left).toBe('-12px');
    expect(targetDocument.body.style.width).toBe('100%');
    expect(targetDocument.documentElement.style.overflow).toBe('hidden');

    cleanup();
    expect(targetDocument.body.style.overflow).toBe('auto');
    expect(targetDocument.body.style.paddingRight).toBe('4px');
    expect(targetDocument.body.style.position).toBe('relative');
    expect(targetDocument.body.style.top).toBe('2px');
    expect(targetDocument.body.style.left).toBe('3px');
    expect(targetDocument.body.style.width).toBe('90%');
    expect(targetDocument.documentElement.style.overflow).toBe('scroll');
    expect(restoredPositions).toEqual([[12, 340]]);
  });

  it('keeps nested locks active until every owner releases them', () => {
    const targetDocument = createDocumentStyles();
    const unlockModal = lockDocumentScroll(targetDocument, 1000, () => '6px', { x: 0, y: 120 }, () => undefined);
    const unlockDropdown = lockDocumentScroll(targetDocument, 1000, () => '26px', { x: 0, y: 120 }, () => undefined);

    unlockModal();
    expect(targetDocument.body.style.overflow).toBe('hidden');
    expect(targetDocument.body.style.paddingRight).toBe('26px');
    expect(targetDocument.documentElement.style.overflow).toBe('hidden');

    unlockDropdown();
    expect(targetDocument.body.style.overflow).toBe('auto');
    expect(targetDocument.body.style.paddingRight).toBe('4px');
    expect(targetDocument.documentElement.style.overflow).toBe('scroll');
  });

  it('preserves an existing external scroll lock without adding compensation', () => {
    const targetDocument = createDocumentStyles();
    targetDocument.body.style.overflow = 'hidden';
    targetDocument.body.style.paddingRight = '9px';
    targetDocument.documentElement.style.overflow = 'hidden';

    const cleanup = lockDocumentScroll(targetDocument, 1000, () => '9px', { x: 0, y: 0 }, () => undefined);

    expect(targetDocument.body.style.paddingRight).toBe('9px');
    cleanup();
    expect(targetDocument.body.style.overflow).toBe('hidden');
    expect(targetDocument.body.style.paddingRight).toBe('9px');
    expect(targetDocument.documentElement.style.overflow).toBe('hidden');
  });
});
