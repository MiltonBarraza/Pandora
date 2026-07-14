import type { IgnoreRule, InputColumn, OutputColumn } from '../../types/import';
import { ignoreRuleNeedsValue, isIgnoreRuleComplete } from '../../domain/import/applyIgnoreRules';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

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
  const summaryText = getIgnoreRulesSummaryText(rules);

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
      <div className="managerSummaryRow">
        <p className="muted">
          {summaryText}
        </p>
        <div className="rulesActions">
          <InfoTooltip content="Agregá una nueva regla para excluir filas.">
            <ActionButton
              action="add"
              aria-label={mode === 'input' ? 'Agregar regla de entrada' : 'Agregar regla de salida'}
              onClick={addRule}
            >
              Agregar
            </ActionButton>
          </InfoTooltip>
        </div>
      </div>

      {rules.length > 0 ? (
        <div className="ignoreRulesHeader" aria-hidden="true">
          <span>Columna</span>
          <span>Condición</span>
          <span>Valor</span>
          <span />
        </div>
      ) : null}

      {rules.map((rule) => {
        const needsValue = ignoreRuleNeedsValue(rule.operator);
        const target = mode;
        const columns = activeColumns;

        return (
          <div className="ignoreRuleCard" key={rule.id}>
            <div className="ignoreRuleFields">
              <Dropdown
                className="compact"
                label="Columna"
                labelInfo={<InfoTooltip content="Elegí la columna que se va a revisar." />}
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
                labelInfo={<InfoTooltip content="Definí cuándo se excluye una fila." />}
                value={rule.operator}
                placeholder="Seleccionar condición"
                options={operators}
                scrollStrategy="close"
                onChange={(operator) => updateRule(rule.id, { operator, value: '' })}
              />

              {needsValue || !rule.operator ? (
                <label className="field compact">
                  <span className="labelWithInfo">
                    <span>Valor</span>
                    <InfoTooltip content="Texto que se compara con la columna elegida." />
                  </span>
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
            <div className="ignoreRuleAction">
              <InfoTooltip content="Eliminar regla">
                <DeleteButton title="Eliminar regla" onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
              </InfoTooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function getIgnoreRulesSummaryText(rules: IgnoreRule[]) {
  if (rules.length === 0) {
    return 'No hay reglas de ignorado configuradas.';
  }

  const ruleCountText = `${rules.length} ${rules.length === 1 ? 'regla configurada' : 'reglas configuradas'}.`;
  return rules.some((rule) => !isIgnoreRuleComplete(rule))
    ? `${ruleCountText} Completá las reglas pendientes para aplicarlas.`
    : ruleCountText;
}
