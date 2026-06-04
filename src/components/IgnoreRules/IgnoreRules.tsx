import type { IgnoreRule, InputColumn, OutputColumn } from '../../types/import';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { DeleteButton } from '../DeleteButton/DeleteButton';

type IgnoreRulesProps = {
  mode: 'input' | 'output';
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

export function IgnoreRules({ mode, inputColumns, outputColumns, rules, onChange }: IgnoreRulesProps) {
  const activeInputColumns = inputColumns.filter((column) => column.active);
  const activeOutputColumns = [...outputColumns].filter((column) => column.enabled).sort((a, b) => a.order - b.order);
  const activeColumns = mode === 'input' ? activeInputColumns : activeOutputColumns;
  const sectionCopy = mode === 'input'
    ? 'Estas reglas se aplican sobre los datos originales antes de construir las columnas de salida.'
    : 'Estas reglas se aplican sobre las columnas de salida ya transformadas.';

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        target: mode,
        columnId: activeColumns[0]?.id ?? '',
        operator: 'contains',
        value: 'PROXIMAMENTE',
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<IgnoreRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch, target: mode } : { ...rule, target: mode })));
  };

  return (
    <div className="rules">
      <div className="sectionHeader">
        <p>{sectionCopy}</p>
        <button type="button" onClick={addRule}>Agregar regla</button>
      </div>

      {rules.length === 0 ? <p className="muted">No hay reglas de ignorado configuradas.</p> : null}

      {rules.map((rule) => {
        const selectedOperator = operators.find((operator) => operator.value === rule.operator);
        const target = mode;
        const columns = activeColumns;

        return (
          <div className="ignoreRuleCard" key={rule.id}>
            <div className="ignoreRuleFields">
              <label className="field compact">
                <span>Columna</span>
                <select value={rule.columnId} onChange={(event) => updateRule(rule.id, { columnId: event.target.value })}>
                  {columns.length === 0 ? <option value="">Sin columnas disponibles</option> : null}
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {target === 'input' && 'columnLetter' in column ? getInputColumnLabel(column) : column.label}
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

            </div>
            <DeleteButton onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
          </div>
        );
      })}
    </div>
  );
}
