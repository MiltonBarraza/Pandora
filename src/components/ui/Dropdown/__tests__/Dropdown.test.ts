import { describe, expect, it } from 'vitest';
import { getDropdownMenuPosition, getDropdownPortalTarget, getDropdownPreferredMenuHeight, getInitialDropdownIndex, getNextDropdownIndex, type DropdownOption } from '../Dropdown';

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
