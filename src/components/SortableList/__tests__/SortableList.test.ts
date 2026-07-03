import { describe, expect, it } from 'vitest';
import { getHorizontalSortableTransform, getVerticalSortableTransform } from '../SortableList';

describe('SortableList drag transform', () => {
  it('locks sortable movement to the vertical axis', () => {
    expect(getVerticalSortableTransform({
      x: 24,
      y: 42,
      scaleX: 1,
      scaleY: 1,
    })).toBe('translate3d(0px, 42px, 0) scaleX(1) scaleY(1)');
  });

  it('keeps empty transforms empty', () => {
    expect(getVerticalSortableTransform(null)).toBeUndefined();
  });

  it('locks sortable movement to the horizontal axis', () => {
    expect(getHorizontalSortableTransform({
      x: 24,
      y: 42,
      scaleX: 1,
      scaleY: 1,
    })).toBe('translate3d(24px, 0px, 0) scaleX(1) scaleY(1)');
  });
});
