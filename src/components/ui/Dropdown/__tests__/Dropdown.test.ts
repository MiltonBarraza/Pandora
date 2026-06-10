import { describe, expect, it } from 'vitest';
import { getDropdownBoundaryElement, getDropdownBoundaryRect, getDropdownMenuPosition, getDropdownOptionNativeTitle, getDropdownPortalTarget, getDropdownPreferredMenuHeight, getInitialDropdownIndex, getNextDropdownIndex, type DropdownOption } from '../Dropdown';

const options: DropdownOption[] = [
  { value: 'first', label: 'First' },
  { value: 'disabled', label: 'Disabled', disabled: true },
  { value: 'last', label: 'Last' },
];

describe('Dropdown helpers', () => {
  it('starts from the selected option or first enabled option', () => {
    expect(getInitialDropdownIndex(options, 2)).toBe(2);
    expect(getInitialDropdownIndex(options, 1)).toBe(0);
    expect(getInitialDropdownIndex(options, -1)).toBe(0);
  });

  it('navigates enabled options in both directions and wraps', () => {
    expect(getNextDropdownIndex(options, 0, 1)).toBe(2);
    expect(getNextDropdownIndex(options, 2, 1)).toBe(0);
    expect(getNextDropdownIndex(options, 0, -1)).toBe(2);
  });

  it('keeps the portal menu inside the viewport and opens above when needed', () => {
    expect(getDropdownMenuPosition(
      { left: 900, top: 700, bottom: 740, width: 180 },
      1024,
      768,
      156,
    )).toMatchObject({
      left: 776,
      top: 538,
      width: 240,
      maxHeight: 156,
    });
  });

  it('keeps a visual gap when opening below', () => {
    expect(getDropdownMenuPosition(
      { left: 40, top: 120, bottom: 160, width: 260 },
      1024,
      768,
      156,
    )).toMatchObject({
      left: 40,
      top: 166,
      width: 260,
      maxHeight: 156,
    });
  });

  it('limits upward menus to available space without overlapping the trigger', () => {
    const position = getDropdownMenuPosition(
      { left: 40, top: 52, bottom: 92, width: 260 },
      1024,
      100,
      156,
    );

    expect(position.maxHeight).toBe(38);
    expect(position.top + position.maxHeight).toBe(46);
  });

  it('uses the viewport boundary outside dialogs', () => {
    expect(getDropdownBoundaryRect(null, 1024, 768)).toEqual({
      left: 0,
      top: 0,
      right: 1024,
      bottom: 768,
    });
  });

  it('uses the modal body as boundary when the trigger is inside it', () => {
    const modalBodyRect = { left: 100, top: 80, right: 900, bottom: 620 };
    const root = {} as HTMLElement;
    const modalBody = {
      contains: (node: Node) => node === root,
      getBoundingClientRect: () => modalBodyRect,
    } as HTMLElement;
    const dialog = {
      querySelector: (selector: string) => selector === '.modalBody' ? modalBody : null,
    } as HTMLElement;
    const rootWithDialog = {
      closest: (selector: string) => selector === 'dialog' ? dialog : null,
    } as HTMLElement;
    Object.assign(root, rootWithDialog);

    expect(getDropdownBoundaryElement(root)).toBe(modalBody);
    expect(getDropdownBoundaryRect(root, 1024, 768)).toEqual(modalBodyRect);
  });

  it('falls back to the dialog boundary when no modal body contains the trigger', () => {
    const dialogRect = { left: 80, top: 60, right: 940, bottom: 700 };
    const modalBody = {
      contains: () => false,
    } as unknown as HTMLElement;
    const dialog = {
      querySelector: (selector: string) => selector === '.modalBody' ? modalBody : null,
      getBoundingClientRect: () => dialogRect,
    } as HTMLElement;
    const root = {
      closest: (selector: string) => selector === 'dialog' ? dialog : null,
    } as HTMLElement;

    expect(getDropdownBoundaryElement(root)).toBe(dialog);
    expect(getDropdownBoundaryRect(root, 1024, 768)).toEqual(dialogRect);
  });

  it('opens above when the modal boundary has no useful space below', () => {
    const position = getDropdownMenuPosition(
      { left: 420, top: 380, bottom: 416, width: 260 },
      1280,
      900,
      156,
      { left: 120, top: 100, right: 1180, bottom: 430 },
    );

    expect(position).toMatchObject({
      left: 420,
      top: 218,
      width: 260,
      maxHeight: 156,
    });
    expect(position.top + position.maxHeight).toBe(374);
  });

  it('opens below in constrained modal space when there is useful room for scrolling', () => {
    const position = getDropdownMenuPosition(
      { left: 553.5, top: 342, bottom: 378, width: 193.3 },
      1280,
      720,
      300,
      { left: 32.8, top: 68.4, right: 1232, bottom: 652.4 },
    );

    expect(position.left).toBe(553.5);
    expect(position.width).toBe(240);
    expect(position.top).toBeCloseTo(384);
    expect(position.maxHeight).toBeCloseTo(260.4);
    expect(position.top + position.maxHeight).toBeCloseTo(644.4);
  });

  it('caps long upward menus so they do not use all available modal space', () => {
    const position = getDropdownMenuPosition(
      { left: 294.4, top: 418.6, bottom: 454.6, width: 212 },
      1280,
      720,
      320,
      { left: 32.8, top: 108.8, right: 1247.2, bottom: 626.4 },
    );

    expect(position.maxHeight).toBe(220);
    expect(position.top).toBeCloseTo(192.6);
    expect(position.top + position.maxHeight).toBeCloseTo(412.6);
  });

  it('chooses the side with more modal space and limits maxHeight', () => {
    const position = getDropdownMenuPosition(
      { left: 420, top: 180, bottom: 216, width: 260 },
      1280,
      900,
      320,
      { left: 120, top: 100, right: 1180, bottom: 260 },
    );

    expect(position.maxHeight).toBe(66);
    expect(position.top + position.maxHeight).toBe(174);
  });

  it('does not render native titles on menu options', () => {
    expect(getDropdownOptionNativeTitle()).toBeUndefined();
  });

  it('estimates menu height before rendering it', () => {
    expect(getDropdownPreferredMenuHeight(0)).toBe(48);
    expect(getDropdownPreferredMenuHeight(4)).toBe(156);
    expect(getDropdownPreferredMenuHeight(20)).toBe(320);
  });

  it('uses the nearest dialog as portal target when available', () => {
    const fallback = {} as HTMLElement;
    const dialog = {} as HTMLDialogElement;
    const root = {
      closest: (selector: string) => selector === 'dialog' ? dialog : null,
    } as HTMLElement;

    expect(getDropdownPortalTarget(root, fallback)).toBe(dialog);
    expect(getDropdownPortalTarget(null, fallback)).toBe(fallback);
  });
});
