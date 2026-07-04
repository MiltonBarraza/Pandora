// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SettingsCompatibilityResult } from '../../types/import';
import { SettingsCompatibilitySummary } from './SettingsActions';

afterEach(cleanup);

describe('SettingsCompatibilitySummary', () => {
  it('renders compatibility values as compact chips', () => {
    const { container } = render(<SettingsCompatibilitySummary result={compatibleResult()} />);

    expect(screen.getByText('Compatible')).not.toBeNull();
    expect(screen.getByText('Hoja esperada: CREMAR')).not.toBeNull();
    expect(screen.getByText('Hoja actual: CREMAR')).not.toBeNull();
    expect(screen.getByLabelText('Resumen de compatibilidad').children).toHaveLength(7);
    expect(container.querySelectorAll('.settingsCompatibilityChip')).toHaveLength(7);
    expect(container.querySelector('.settingsCompatibilitySummary')?.classList).toContain('compatible');
    expect(container.querySelector('.settingsCompatibilityGrid')).toBeNull();
    expect(screen.getByText('Exactas').parentElement?.textContent).toBe('Exactas66');
  });
});

function compatibleResult(): SettingsCompatibilityResult {
  return {
    status: 'compatible',
    sheet: { expectedSheet: 'CREMAR', currentSheet: 'CREMAR', exists: true },
    columns: {
      matches: [],
      missing: [],
      added: [],
      ambiguous: [],
      usedMissing: [],
      unusedMissing: [],
      weakUsedMatches: [],
    },
    summary: {
      totalSavedColumns: 66,
      totalCurrentColumns: 66,
      exactMatches: 66,
      strongMatches: 0,
      mediumMatches: 0,
      weakMatches: 0,
      missingColumns: 0,
      addedColumns: 0,
      ambiguousMatches: 0,
      usedMissingColumns: 0,
      unusedMissingColumns: 0,
      weakUsedMatches: 0,
    },
    messages: [],
  };
}
