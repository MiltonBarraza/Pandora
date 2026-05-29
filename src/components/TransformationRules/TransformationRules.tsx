import { getSuggestedNumericColumnName } from '../../domain/import/numericOperations';
import { conditionNeedsValue } from '../../domain/import/evaluateCondition';
import type {
  ConditionOperator,
  NumericOperation,
  NumericTransformationConfig,
  OutputCategory,
  TransformationRule,
  TransformationType,
} from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { SortableList } from '../SortableList/SortableList';

type TransformationRulesProps = {
  categories: OutputCategory[];
  rules: TransformationRule[];
  onChange: (rules: TransformationRule[]) => void;
  onCategoriesChange: (categories: OutputCategory[]) => void;
};

const ruleTypes: Array<{ value: TransformationType; label: string }> = [
  { value: 'addPrefix', label: 'Agregar prefijo' },
  { value: 'addSuffix', label: 'Agregar sufijo' },
  { value: 'removeText', label: 'Quitar texto' },
  { value: 'replaceText', label: 'Reemplazar texto' },
  { value: 'trim', label: 'Limpiar espacios' },
  { value: 'uppercase', label: 'Convertir a mayusculas' },
  { value: 'lowercase', label: 'Convertir a minusculas' },
  { value: 'conditionalPrefix', label: 'Prefijo condicional' },
  { value: 'copyColumn', label: 'Crear desde otra columna' },
  { value: 'combineColumns', label: 'Combinar columnas' },
  { value: 'numericOperation', label: 'Operacion numerica' },
];

const numericOperations: Array<{ value: NumericOperation; label: string }> = [
  { value: 'add', label: 'Sumar valor fijo' },
  { value: 'subtract', label: 'Restar valor fijo' },
  { value: 'multiply', label: 'Multiplicar por valor' },
  { value: 'divide', label: 'Dividir por valor' },
  { value: 'addPercentage', label: 'Sumar porcentaje' },
  { value: 'subtractPercentage', label: 'Restar porcentaje' },
  { value: 'removeIncludedPercentage', label: 'Quitar porcentaje incluido' },
];

export function TransformationRules({ categories, rules, onChange, onCategoriesChange }: TransformationRulesProps) {
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  const addRule = () => {
    const first = ordered[0]?.id ?? '';
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        sourceColumn: first,
        targetCategoryId: first,
        type: 'trim',
        value: '',
        searchValue: '',
        replaceValue: '',
        applyToEmptyValues: false,
        numericConfig: defaultNumericConfig(),
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<TransformationRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const ensureNumericOutputCategory = (rule: TransformationRule, columnName: string) => {
    const outputCategoryId = rule.numericConfig?.outputCategoryId ?? `numeric-${rule.id}`;
    const existing = categories.find((category) => category.id === outputCategoryId);
    const nextName = columnName.trim() || 'Nueva columna calculada';

    if (existing) {
      onCategoriesChange(categories.map((category) => category.id === outputCategoryId ? { ...category, name: nextName } : category));
    } else {
      onCategoriesChange([
        ...categories,
        { id: outputCategoryId, name: nextName, order: categories.length, exportable: true },
      ]);
    }

    updateRule(rule.id, {
      targetCategoryId: outputCategoryId,
      numericConfig: {
        ...defaultNumericConfig(rule.numericConfig),
        outputMode: 'newColumn',
        outputCategoryId,
        outputColumnName: nextName,
      },
    });
  };

  return (
    <div className="rules">
      <div className="sectionHeader">
        <p>Las reglas se aplican sobre las columnas normalizadas, de arriba hacia abajo.</p>
        <button type="button" onClick={addRule}>
          Agregar regla
        </button>
      </div>

      {rules.length === 0 ? <p className="muted">No hay reglas configuradas.</p> : null}

      <SortableList
        items={rules}
        onChange={onChange}
        renderItem={(rule, handle) => (
          <div className="transformRuleCard">
            <div className="ruleCardHeader">
              {handle}
              <strong>Regla</strong>
              <DeleteButton onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
            </div>

            <div className="ruleMainFields">
              <label className="field compact">
                <span>Desde</span>
                <select value={rule.sourceColumn} onChange={(event) => updateRule(rule.id, { sourceColumn: event.target.value })}>
                  {ordered.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              {rule.type !== 'numericOperation' ? (
                <label className="field compact">
                  <span>Hacia</span>
                  <select value={rule.targetCategoryId} onChange={(event) => updateRule(rule.id, { targetCategoryId: event.target.value })}>
                    {ordered.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="field compact">
                <span>Tipo</span>
                <select value={rule.type} onChange={(event) => updateRule(rule.id, { type: event.target.value as TransformationType })}>
                  {ruleTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>

              <RuleFields
                rule={rule}
                categories={ordered}
                onChange={(patch) => updateRule(rule.id, patch)}
                onCreateNumericCategory={ensureNumericOutputCategory}
              />
            </div>

            <div className="ruleConditionBlock">
              <span className="blockLabel">Condicion</span>
              <div className="ruleConditionFields">
                <ConditionFields
                  rule={rule}
                  categories={ordered}
                  onChange={(patch) => updateRule(rule.id, patch)}
                />
              </div>
            </div>

            {['addPrefix', 'addSuffix', 'conditionalPrefix', 'combineColumns', 'numericOperation'].includes(rule.type) ? (
              <div className="ruleOptionsBlock">
                <label className="checkboxField wideCheckbox">
                  <input
                    type="checkbox"
                    checked={rule.applyToEmptyValues ?? false}
                    onChange={(event) => updateRule(rule.id, { applyToEmptyValues: event.target.checked })}
                  />
                  Aplicar tambien si la celda esta vacia
                </label>
              </div>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}

const conditionOperators: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'contains', label: 'contiene' },
  { value: 'notContains', label: 'no contiene' },
  { value: 'equals', label: 'es igual a' },
  { value: 'notEquals', label: 'no es igual a' },
  { value: 'startsWith', label: 'empieza con' },
  { value: 'endsWith', label: 'termina con' },
  { value: 'isEmpty', label: 'esta vacio' },
  { value: 'isNotEmpty', label: 'no esta vacio' },
  { value: 'greaterThan', label: 'mayor que' },
  { value: 'greaterThanOrEqual', label: 'mayor o igual que' },
  { value: 'lessThan', label: 'menor que' },
  { value: 'lessThanOrEqual', label: 'menor o igual que' },
  { value: 'numericEquals', label: 'igual numerico' },
  { value: 'numericNotEquals', label: 'distinto numerico' },
];

function ConditionFields({
  rule,
  categories,
  onChange,
}: {
  rule: TransformationRule;
  categories: OutputCategory[];
  onChange: (patch: Partial<TransformationRule>) => void;
}) {
  const condition = rule.condition;
  const selectedOperator = condition?.operator ?? 'contains';

  return (
    <>
      <label className="field compact">
        <span>Condicion</span>
        <select
          value={condition ? 'conditional' : 'always'}
          onChange={(event) => {
            if (event.target.value === 'always') {
              onChange({ condition: undefined });
              return;
            }
            onChange({
              condition: {
                sourceColumn: rule.sourceColumn || categories[0]?.id || '',
                operator: 'contains',
                value: '',
              },
            });
          }}
        >
          <option value="always">Aplicar siempre</option>
          <option value="conditional">Aplicar solo si...</option>
        </select>
      </label>

      {condition ? (
        <>
          <label className="field compact">
            <span>Si columna</span>
            <select
              value={condition.sourceColumn}
              onChange={(event) => onChange({ condition: { ...condition, sourceColumn: event.target.value } })}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="field compact">
            <span>Operador</span>
            <select
              value={selectedOperator}
              onChange={(event) => {
                const operator = event.target.value as ConditionOperator;
                onChange({
                  condition: {
                    ...condition,
                    operator,
                    value: conditionNeedsValue(operator) ? condition.value ?? '' : '',
                    valueType: isNumericCondition(operator) ? 'number' : 'text',
                  },
                });
              }}
            >
              {conditionOperators.map((operator) => (
                <option key={operator.value} value={operator.value}>{operator.label}</option>
              ))}
            </select>
          </label>
          {conditionNeedsValue(selectedOperator) ? (
            <label className="field compact">
              <span>Valor condicion</span>
              <input value={condition.value ?? ''} onChange={(event) => onChange({ condition: { ...condition, value: event.target.value } })} />
            </label>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function RuleFields({
  rule,
  categories,
  onChange,
  onCreateNumericCategory,
}: {
  rule: TransformationRule;
  categories: OutputCategory[];
  onChange: (patch: Partial<TransformationRule>) => void;
  onCreateNumericCategory: (rule: TransformationRule, columnName: string) => void;
}) {
  if (rule.type === 'numericOperation') {
    return <NumericRuleFields rule={rule} categories={categories} onChange={onChange} onCreateNumericCategory={onCreateNumericCategory} />;
  }

  if (rule.type === 'replaceText') {
    return (
      <>
        <label className="field compact">
          <span>Buscar</span>
          <input value={rule.searchValue ?? ''} onChange={(event) => onChange({ searchValue: event.target.value })} />
        </label>
        <label className="field compact">
          <span>Reemplazar por</span>
          <input value={rule.replaceValue ?? ''} onChange={(event) => onChange({ replaceValue: event.target.value })} />
        </label>
      </>
    );
  }

  if (rule.type === 'conditionalPrefix') {
    return (
      <>
        <label className="field compact">
          <span>Prefijo</span>
          <input value={rule.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (rule.type === 'combineColumns') {
    return (
      <>
        <label className="field compact">
          <span>Con</span>
          <select
            value={rule.secondarySourceColumn ?? categories[0]?.id ?? ''}
            onChange={(event) => onChange({ secondarySourceColumn: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Separador</span>
          <input value={rule.value ?? ' '} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (['trim', 'uppercase', 'lowercase', 'copyColumn'].includes(rule.type)) {
    return <div className="ruleHint">No requiere valor adicional</div>;
  }

  return (
    <label className="field compact">
      <span>Valor</span>
      <input value={rule.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
    </label>
  );
}

function NumericRuleFields({
  rule,
  categories,
  onChange,
  onCreateNumericCategory,
}: {
  rule: TransformationRule;
  categories: OutputCategory[];
  onChange: (patch: Partial<TransformationRule>) => void;
  onCreateNumericCategory: (rule: TransformationRule, columnName: string) => void;
}) {
  const config = defaultNumericConfig(rule.numericConfig);
  const sourceName = categories.find((category) => category.id === rule.sourceColumn)?.name ?? 'Columna';
  const suggestedName = getSuggestedNumericColumnName(sourceName, config.operation, config.amount);

  const updateNumericConfig = (patch: Partial<NumericTransformationConfig>) => {
    const nextConfig = { ...config, ...patch };
    onChange({
      targetCategoryId: nextConfig.outputMode === 'replace' ? rule.sourceColumn : nextConfig.outputCategoryId ?? rule.targetCategoryId,
      numericConfig: nextConfig,
    });
  };

  return (
    <>
      <label className="field compact">
        <span>Operacion</span>
        <select
          value={config.operation}
          onChange={(event) => {
            const operation = event.target.value as NumericOperation;
            updateNumericConfig({
              operation,
              outputColumnName: getSuggestedNumericColumnName(sourceName, operation, config.amount),
            });
          }}
        >
          {numericOperations.map((operation) => (
            <option key={operation.value} value={operation.value}>{operation.label}</option>
          ))}
        </select>
      </label>
      <label className="field compact">
        <span>Valor</span>
        <input type="number" value={config.amount} onChange={(event) => updateNumericConfig({ amount: Number(event.target.value) })} />
      </label>
      <label className="field compact">
        <span>Destino</span>
        <select
          value={config.outputMode}
          onChange={(event) => {
            const outputMode = event.target.value as NumericTransformationConfig['outputMode'];
            if (outputMode === 'newColumn') {
              onCreateNumericCategory(rule, config.outputColumnName || suggestedName);
              return;
            }
            updateNumericConfig({ outputMode: 'replace' });
          }}
        >
          <option value="replace">Reemplazar columna actual</option>
          <option value="newColumn">Crear nueva columna</option>
        </select>
      </label>
      {config.outputMode === 'newColumn' ? (
        <label className="field compact">
          <span>Nombre nueva columna</span>
          <input value={config.outputColumnName || suggestedName} onChange={(event) => onCreateNumericCategory(rule, event.target.value)} />
        </label>
      ) : null}
      <label className="field compact">
        <span>Redondeo</span>
        <select
          value={String(config.rounding ?? 2)}
          onChange={(event) => updateNumericConfig({ rounding: event.target.value === 'none' ? 'none' : Number(event.target.value) as 0 | 2 | 4 })}
        >
          <option value="none">Sin redondeo</option>
          <option value="0">0 decimales</option>
          <option value="2">2 decimales</option>
          <option value="4">4 decimales</option>
        </select>
      </label>
    </>
  );
}

function defaultNumericConfig(config?: NumericTransformationConfig): NumericTransformationConfig {
  return {
    operation: config?.operation ?? 'addPercentage',
    amount: config?.amount ?? 10,
    outputMode: config?.outputMode ?? 'replace',
    outputColumnName: config?.outputColumnName,
    outputCategoryId: config?.outputCategoryId,
    rounding: config?.rounding ?? 2,
  };
}

function isNumericCondition(operator: ConditionOperator) {
  return [
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'numericEquals',
    'numericNotEquals',
  ].includes(operator);
}
