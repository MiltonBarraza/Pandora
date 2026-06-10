import type { IgnoreRule, InputColumn, OutputColumn } from '../../types/import';
import { ignoreRuleNeedsValue, isIgnoreRuleComplete } from '../../domain/import/applyIgnoreRules';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';

type IgnoreRulesProps = {
  mode: 'input' | 'output';
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
  rules: IgnoreRule[];
  onChange: (rules: IgnoreRule[]) => void;
};

type CompletedIgnoreRuleOperator = Exclude<IgnoreRule['operator'], ''>;

const operators: Array<{ value: CompletedIgnoreRuleOperator; label: string; needsValue: boolean }> = [
  { value: 'isEmpty', label: 'está vacía', needsValue: false },
  { value: 'isNotEmpty', label: 'no está vacía', needsValue: false },
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
        columnId: '',
        operator: '',
        value: '',
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
        <ActionButton action="add" onClick={addRule}>Agregar regla</ActionButton>
      </div>

      {rules.length === 0 ? <p className="muted">No hay reglas de ignorado configuradas.</p> : null}

      {rules.map((rule) => {
        const needsValue = ignoreRuleNeedsValue(rule.operator);
        const isComplete = isIgnoreRuleComplete(rule);
        const target = mode;
        const columns = activeColumns;

        return (
          <div className="ignoreRuleCard" key={rule.id}>
            <div className="ignoreRuleFields">
              <Dropdown
                className="compact"
                label="Columna"
                value={rule.columnId}
                placeholder="Seleccionar columna"
                options={columns.map((column) => ({
                    value: column.id,
                    label: target === 'input' && 'columnLetter' in column ? getInputColumnLabel(column) : column.label,
                  }))}
                scrollStrategy="close"
                onChange={(columnId) => updateRule(rule.id, { columnId })}
              />

              <Dropdown<CompletedIgnoreRuleOperator>
                className="compact"
                label="Condición"
                value={rule.operator}
                placeholder="Seleccionar condición"
                options={operators}
                scrollStrategy="close"
                onChange={(operator) => updateRule(rule.id, { operator, value: '' })}
              />

              {needsValue || !rule.operator ? (
                <label className="field compact">
                  <span>Valor</span>
                  <input
                    value={rule.value ?? ''}
                    disabled={!rule.operator}
                    placeholder="Ingresar valor"
                    onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                  />
                </label>
              ) : (
                <div className="ruleHint">No requiere valor</div>
              )}

            </div>
            <DeleteButton onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
            {!isComplete ? <p className="muted ruleIncompleteHint">Completa la regla para aplicarla.</p> : null}
          </div>
        );
      })}
    </div>
  );
}
