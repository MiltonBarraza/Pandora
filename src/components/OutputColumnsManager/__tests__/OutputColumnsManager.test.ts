import { describe, expect, it } from 'vitest';
import { shouldShowOutputColumnNameTooltip } from '../OutputColumnsManager';

describe('OutputColumnsManager helpers', () => {
  it('shows column name tooltips only when the label is long enough to help', () => {
    expect(shouldShowOutputColumnNameTooltip('Cliente')).toBe(false);
    expect(shouldShowOutputColumnNameTooltip('Nombre completo del cliente final')).toBe(true);
  });
});
