import { describe, expect, it } from 'vitest';
import { shouldApplyGeneratedColumnsResult, shouldShowOutputColumnNameTooltip } from '../OutputColumnsManager';

describe('OutputColumnsManager helpers', () => {
  it('shows column name tooltips only when the label is long enough to help', () => {
    expect(shouldShowOutputColumnNameTooltip('Cliente')).toBe(false);
    expect(shouldShowOutputColumnNameTooltip('Nombre completo del cliente final')).toBe(true);
  });

  it('applies generated column results when obsolete generated columns were removed', () => {
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 0, removedObsoleteCount: 0 })).toBe(false);
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 0, removedObsoleteCount: 2 })).toBe(true);
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 1, removedObsoleteCount: 0 })).toBe(true);
  });
});
