import type { IgnoreRule, OutputCategory } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';

type IgnoreRulesProps = {
  categories: OutputCategory[];
  rules: IgnoreRule[];
  onChange: (rules: IgnoreRule[]) => void;
};

const operators: Array<{ value: IgnoreRule['operator']; label: string; needsValue: boolean }> = [
  { value: 'isEmpty', label: 'esta vacia', needsValue: false },
  { value: 'isNotEmpty', label: 'no esta vacia', needsValue: false },
  { value: 'contains', label: 'contiene', needsValue: true },
  { value: 'notContains', label: 'no contiene', needsValue: true },
  { value: 'equals', label: 'es igual a', needsValue: true },
  { value: 'startsWith', label: 'empieza con', needsValue: true },
  { value: 'endsWith', label: 'termina con', needsValue: true },
];

export function IgnoreRules({ categories, rules, onChange }: IgnoreRulesProps) {
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        categoryId: ordered[0]?.id ?? '',
        operator: 'contains',
        value: 'PROXIMAMENTE',
        reason: 'Ignorada por regla: contiene "PROXIMAMENTE"',
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<IgnoreRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  return (
    <div className="rules">
      <div className="sectionHeader">
        <p>Reglas persistentes: se aplican automaticamente cada vez que cambia la preview.</p>
        <button type="button" onClick={addRule}>Agregar regla</button>
      </div>

      {rules.length === 0 ? <p className="muted">No hay reglas de ignorado configuradas.</p> : null}

      {rules.map((rule) => {
        const selectedOperator = operators.find((operator) => operator.value === rule.operator);

        return (
          <div className="transformRule" key={rule.id}>
            <label className="field compact">
              <span>Categoria</span>
              <select value={rule.categoryId} onChange={(event) => updateRule(rule.id, { categoryId: event.target.value })}>
                {ordered.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label className="field compact">
              <span>Condicion</span>
              <select
                value={rule.operator}
                onChange={(event) => updateRule(rule.id, { operator: event.target.value as IgnoreRule['operator'], value: '' })}
              >
                {operators.map((operator) => (
                  <option key={operator.value} value={operator.value}>{operator.label}</option>
                ))}
              </select>
            </label>

            {selectedOperator?.needsValue ? (
              <label className="field compact">
                <span>Valor</span>
                <input value={rule.value ?? ''} onChange={(event) => updateRule(rule.id, { value: event.target.value })} />
              </label>
            ) : (
              <div className="ruleHint">No requiere valor</div>
            )}

            <label className="field compact">
              <span>Motivo</span>
              <input value={rule.reason ?? ''} onChange={(event) => updateRule(rule.id, { reason: event.target.value })} />
            </label>

            <DeleteButton onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
          </div>
        );
      })}
    </div>
  );
}
