import { describe, expect, it } from 'vitest';
import { getInfoTooltipPlacementClass, getInfoTooltipPortalTarget, getInfoTooltipPosition, isFocusVisible } from '../InfoTooltip';

describe('InfoTooltip helpers', () => {
  it('builds stable placement classes', () => {
    expect(getInfoTooltipPlacementClass('top')).toBe('infoTooltip-top');
    expect(getInfoTooltipPlacementClass('right')).toBe('infoTooltip-right');
    expect(getInfoTooltipPlacementClass('bottom')).toBe('infoTooltip-bottom');
    expect(getInfoTooltipPlacementClass('left')).toBe('infoTooltip-left');
  });

  it('keeps preferred placement when it fits', () => {
    expect(getInfoTooltipPosition(
      { left: 200, right: 220, top: 200, bottom: 220, width: 20, height: 20 },
      { width: 120, height: 40 },
      800,
      600,
      'top',
    )).toEqual({
      left: 150,
      top: 152,
      placement: 'top',
    });
  });

  it('falls back when preferred placement has no room', () => {
    expect(getInfoTooltipPosition(
      { left: 200, right: 220, top: 4, bottom: 24, width: 20, height: 20 },
      { width: 120, height: 40 },
      800,
      600,
      'top',
    )).toMatchObject({
      top: 32,
      placement: 'bottom',
    });
  });

  it('clamps near viewport edges', () => {
    expect(getInfoTooltipPosition(
      { left: 0, right: 0, top: 200, bottom: 220, width: 0, height: 20 },
      { width: 160, height: 40 },
      300,
      260,
      'top',
    ).left).toBe(8);

    expect(getInfoTooltipPosition(
      { left: 300, right: 300, top: 200, bottom: 220, width: 0, height: 20 },
      { width: 160, height: 40 },
      300,
      260,
      'top',
    ).left).toBe(132);
  });

  it('uses the nearest dialog as portal target when inside a modal', () => {
    const fallback = {} as HTMLElement;
    const dialog = {} as HTMLDialogElement;
    const trigger = {
      closest: (selector: string) => selector === 'dialog' ? dialog : null,
    } as HTMLElement;

    expect(getInfoTooltipPortalTarget(trigger, fallback)).toBe(dialog);
    expect(getInfoTooltipPortalTarget(null, fallback)).toBe(fallback);
  });

  it('detects focus-visible before opening on focus', () => {
    expect(isFocusVisible({ matches: () => true } as unknown as HTMLElement)).toBe(true);
    expect(isFocusVisible({ matches: () => false } as unknown as HTMLElement)).toBe(false);
  });

  it('falls back to opening on focus if focus-visible is unsupported', () => {
    expect(isFocusVisible({
      matches: () => {
        throw new Error('unsupported selector');
      },
    } as unknown as HTMLElement)).toBe(true);
  });
});
