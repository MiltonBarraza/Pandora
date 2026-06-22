import { describe, expect, it } from 'vitest';
import type { IgnoreRule } from '../../../types/import';
import { getIgnoreRulesSummaryText } from '../IgnoreRules';

describe('IgnoreRules summary', () => {
  it('shows an empty summary when there are no rules', () => {
    expect(getIgnoreRulesSummaryText([])).toBe('No hay reglas de ignorado configuradas.');
  });

  it('shows only the configured rule count when all rules are complete', () => {
    expect(getIgnoreRulesSummaryText([
      rule({ id: 'rule-1', columnId: 'input-0', operator: 'isEmpty' }),
      rule({ id: 'rule-2', columnId: 'input-1', operator: 'contains', value: 'sin stock' }),
    ])).toBe('2 reglas configuradas.');
  });

  it('shows one general pending-rules message when any rule is incomplete', () => {
    const summary = getIgnoreRulesSummaryText([
      rule({ id: 'rule-1', columnId: 'input-0', operator: 'isEmpty' }),
      rule({ id: 'rule-2', columnId: '', operator: '' }),
    ]);

    expect(summary).toBe('2 reglas configuradas. Completá las reglas pendientes para aplicarlas.');
    expect(summary.match(/Completá/g)).toHaveLength(1);
  });

  it('uses singular copy for one incomplete rule', () => {
    expect(getIgnoreRulesSummaryText([
      rule({ id: 'rule-1', columnId: '', operator: '' }),
    ])).toBe('1 regla configurada. Completá las reglas pendientes para aplicarlas.');
  });
});

function rule(partial: Partial<IgnoreRule> & Pick<IgnoreRule, 'id'>): IgnoreRule {
  return {
    target: 'input',
    columnId: '',
    operator: '',
    value: '',
    ...partial,
  };
}
