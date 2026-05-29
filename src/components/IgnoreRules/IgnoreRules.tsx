import type { IgnoreRule, InputColumn, OutputColumn } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';

type IgnoreRulesProps = {
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
  rules: IgnoreRule[];
  onChange: (rules: IgnoreRule[]) => void;
};

const operators: Array<{ value: IgnoreRule['operator']; label: string; needsValue: boolean }> = [
  { value: 'isEmpty', label: 'esta vacia', needsValue: false },
  { value: 'isNotEmpty', label: 'no esta vacia', needsValue: false },
  { value: 'contains', label: 'contiene', needsValue: true },
  { value: 'notContains', label: 'no contiene', needsValue: true },
  { value: 'equals', label: 'es igual a', needsValue: true },
  { value: 'notEquals', label: 'no es igual a', needsValue: true },
  { value: 'startsWith', label: 'empieza con', needsValue: true },
  { value: 'endsWith', label: 'termina con', needsValue: true },
];

export function IgnoreRules({ inputColumns, outputColumns, rules, onChange }: IgnoreRulesProps) {
  const activeInputColumns = inputColumns.filter((column) => column.active);
  const activeOutputColumns = [...outputColumns].filter((column) => column.enabled).sort((a, b) => a.order - b.order);

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        target: 'output',
        columnId: activeOutputColumns[0]?.id ?? '',
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
        const target = rule.target ?? 'output';
        const columns = target === 'input' ? activeInputColumns : activeOutputColumns;

        return (
          <div className="transformRule" key={rule.id}>
            <label className="field compact">
              <span>Evaluar</span>
              <select
                value={target}
                onChange={(event) => {
                  const nextTarget = event.target.value as IgnoreRule['target'];
                  const nextColumns = nextTarget === 'input' ? activeInputColumns : activeOutputColumns;
                  updateRule(rule.id, { target: nextTarget, columnId: nextColumns[0]?.id ?? '' });
                }}
              >
                <option value="output">Columna de salida</option>
                <option value="input">Columna de entrada</option>
              </select>
            </label>

            <label className="field compact">
              <span>Columna</span>
              <select value={rule.columnId} onChange={(event) => updateRule(rule.id, { columnId: event.target.value })}>
                {columns.length === 0 ? <option value="">Sin columnas disponibles</option> : null}
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {target === 'input' && 'columnLetter' in column ? `${column.columnLetter} - ${column.label}` : column.label}
                  </option>
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
