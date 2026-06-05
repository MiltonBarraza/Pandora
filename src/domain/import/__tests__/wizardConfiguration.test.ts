import { describe, expect, it, vi } from 'vitest';
import { canDiscardWizardConfiguration } from '../wizardConfiguration';

describe('canDiscardWizardConfiguration', () => {
  it('allows changing source without confirmation when configuration is clean', () => {
    const confirmDiscard = vi.fn(() => false);

    expect(canDiscardWizardConfiguration(false, confirmDiscard)).toBe(true);
    expect(confirmDiscard).not.toHaveBeenCalled();
  });

  it('respects confirmation when configuration is dirty', () => {
    expect(canDiscardWizardConfiguration(true, () => true)).toBe(true);
    expect(canDiscardWizardConfiguration(true, () => false)).toBe(false);
  });
});
