import type { ConditionOperator, InputColumn, OutputColumn, OutputRecipe, RecipePart, TransformCondition, TransformStep, TransformStepType } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';

type OutputColumnRecipeEditorProps = {
  column: OutputColumn;
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
  onChange: (column: OutputColumn) => void;
};

export function OutputColumnRecipeEditor({ column, inputColumns, outputColumns, onChange }: OutputColumnRecipeEditorProps) {
  const activeInputColumns = inputColumns.filter((inputColumn) => inputColumn.active);
  const steps = column.recipe.type === 'empty' ? [] : column.recipe.steps ?? [];

  const updateRecipe = (recipe: OutputRecipe) => {
    onChange({ ...column, recipe });
  };

  const updateSteps = (nextSteps: TransformStep[]) => {
    if (column.recipe.type === 'empty') {
      return;
    }

    updateRecipe({ ...column.recipe, steps: nextSteps });
  };

  return (
    <>
      <label className="field compact">
        <span>Receta</span>
        <select
          value={column.recipe.type}
          onChange={(event) => {
            const type = event.target.value as OutputRecipe['type'];
            if (type === 'direct') {
              updateRecipe({ type: 'direct', inputColumnId: getDirectInputColumnId(column, activeInputColumns), steps });
              return;
            }

            if (type === 'fixedText') {
              updateRecipe({ type: 'fixedText', value: '', steps });
              return;
            }

            if (type === 'combine') {
              updateRecipe({
                type: 'combine',
                parts: createDefaultParts(activeInputColumns),
                separator: '',
                steps,
              });
              return;
            }

            updateRecipe({ type: 'empty' });
          }}
        >
          <option value="direct">Directa desde entrada</option>
          <option value="empty">Columna vacia</option>
          <option value="fixedText">Texto fijo</option>
          <option value="combine">Combinar columnas/textos</option>
        </select>
      </label>

      {column.recipe.type === 'direct' ? (
        <label className="field compact">
          <span>Columna de entrada</span>
          <select
            value={column.recipe.inputColumnId}
            onChange={(event) => updateRecipe({ type: 'direct', inputColumnId: event.target.value, steps })}
          >
            {activeInputColumns.length === 0 ? <option value="">Sin columnas activas</option> : null}
            {activeInputColumns.map((inputColumn) => (
              <option key={inputColumn.id} value={inputColumn.id}>
                {inputColumn.columnLetter} - {inputColumn.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {column.recipe.type === 'fixedText' ? (
        <label className="field compact">
          <span>Texto fijo</span>
          <input
            value={column.recipe.value}
            onChange={(event) => updateRecipe({ type: 'fixedText', value: event.target.value, steps })}
          />
        </label>
      ) : null}

      {column.recipe.type === 'combine' ? (
        <CombineRecipeFields
          recipe={column.recipe}
          inputColumns={activeInputColumns}
          onChange={(recipe) => updateRecipe(recipe)}
        />
      ) : null}

      {column.recipe.type !== 'empty' ? (
        <div className="manager">
          <div className="sectionHeader">
            <p>Transformaciones de esta columna</p>
            <button type="button" className="secondary" onClick={() => updateSteps([...steps, createStep()])}>
              Agregar transformacion
            </button>
          </div>
          {steps.length === 0 ? <p className="muted">Sin transformaciones simples.</p> : null}
          {steps.map((step, index) => (
            <div className="listRow" key={step.id}>
              <label className="field compact">
                <span>Tipo</span>
                <select
                  value={step.type}
                  onChange={(event) => updateSteps(updateStep(steps, step.id, { type: event.target.value as TransformStepType }))}
                >
                  {stepTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              <StepFields step={step} onChange={(patch) => updateSteps(updateStep(steps, step.id, patch))} />
              <StepConditionFields
                step={step}
                inputColumns={activeInputColumns}
                outputColumns={outputColumns}
                onChange={(patch) => updateSteps(updateStep(steps, step.id, patch))}
              />
              {stepSupportsEmptyValues(step.type) ? (
                <label className="checkboxField">
                  <input
                    type="checkbox"
                    checked={step.applyToEmptyValues ?? false}
                    onChange={(event) => updateSteps(updateStep(steps, step.id, { applyToEmptyValues: event.target.checked }))}
                  />
                  Aplicar tambien si la celda esta vacia
                </label>
              ) : null}
              <div className="rowActions">
                <button type="button" className="ghost" disabled={index === 0} onClick={() => updateSteps(moveStep(steps, index, -1))}>
                  Subir
                </button>
                <button type="button" className="ghost" disabled={index === steps.length - 1} onClick={() => updateSteps(moveStep(steps, index, 1))}>
                  Bajar
                </button>
                <DeleteButton onClick={() => updateSteps(steps.filter((item) => item.id !== step.id))} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function CombineRecipeFields({
  recipe,
  inputColumns,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const updateParts = (parts: RecipePart[]) => {
    onChange({ ...recipe, parts });
  };

  return (
    <div className="manager">
      <div className="sectionHeader">
        <p>Partes de la combinacion</p>
        <div className="actions compactActions">
          <button type="button" className="secondary" onClick={() => updateParts([...recipe.parts, createInputPart(inputColumns)])}>
            Agregar columna
          </button>
          <button type="button" className="secondary" onClick={() => updateParts([...recipe.parts, createTextPart()])}>
            Agregar texto
          </button>
        </div>
      </div>
      <label className="field compact">
        <span>Separador opcional</span>
        <input value={recipe.separator ?? ''} onChange={(event) => onChange({ ...recipe, separator: event.target.value })} />
      </label>
      {recipe.parts.length === 0 ? <p className="muted">Sin partes configuradas.</p> : null}
      {recipe.parts.map((part, index) => (
        <div className="listRow" key={part.id}>
          <label className="field compact">
            <span>Parte</span>
            <select
              value={part.type}
              onChange={(event) => {
                const type = event.target.value as RecipePart['type'];
                updateParts(updatePart(recipe.parts, part.id, type === 'input' ? createInputPart(inputColumns, part.id) : createTextPart(part.id)));
              }}
            >
              <option value="input">Columna de entrada</option>
              <option value="text">Texto fijo</option>
            </select>
          </label>

          {part.type === 'input' ? (
            <label className="field compact">
              <span>Columna</span>
              <select
                value={part.inputColumnId}
                onChange={(event) => updateParts(updatePart(recipe.parts, part.id, { ...part, inputColumnId: event.target.value }))}
              >
                {inputColumns.length === 0 ? <option value="">Sin columnas activas</option> : null}
                {inputColumns.map((inputColumn) => (
                  <option key={inputColumn.id} value={inputColumn.id}>
                    {inputColumn.columnLetter} - {inputColumn.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field compact">
              <span>Texto</span>
              <input value={part.value} onChange={(event) => updateParts(updatePart(recipe.parts, part.id, { ...part, value: event.target.value }))} />
            </label>
          )}

          <div className="rowActions">
            <button type="button" className="ghost" disabled={index === 0} onClick={() => updateParts(movePart(recipe.parts, index, -1))}>
              Subir
            </button>
            <button type="button" className="ghost" disabled={index === recipe.parts.length - 1} onClick={() => updateParts(movePart(recipe.parts, index, 1))}>
              Bajar
            </button>
            <DeleteButton onClick={() => updateParts(recipe.parts.filter((item) => item.id !== part.id))} />
          </div>
        </div>
      ))}
    </div>
  );
}

const stepTypes: Array<{ value: TransformStepType; label: string }> = [
  { value: 'trim', label: 'Limpiar espacios' },
  { value: 'uppercase', label: 'Convertir a mayusculas' },
  { value: 'lowercase', label: 'Convertir a minusculas' },
  { value: 'addPrefix', label: 'Agregar prefijo' },
  { value: 'addSuffix', label: 'Agregar sufijo' },
  { value: 'removeText', label: 'Quitar texto' },
  { value: 'replaceText', label: 'Reemplazar texto' },
  { value: 'numericOperation', label: 'Operacion numerica' },
];

function StepFields({ step, onChange }: { step: TransformStep; onChange: (patch: Partial<TransformStep>) => void }) {
  if (step.type === 'addPrefix') {
    return (
      <label className="field compact">
        <span>Texto al inicio</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'addSuffix') {
    return (
      <label className="field compact">
        <span>Texto al final</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'removeText') {
    return (
      <label className="field compact">
        <span>Texto a quitar</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'replaceText') {
    return (
      <>
        <label className="field compact">
          <span>Buscar</span>
          <input value={step.searchValue ?? ''} onChange={(event) => onChange({ searchValue: event.target.value })} />
        </label>
        <label className="field compact">
          <span>Reemplazar por</span>
          <input value={step.replaceValue ?? ''} onChange={(event) => onChange({ replaceValue: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'numericOperation') {
    return (
      <>
        <label className="field compact">
          <span>Operacion</span>
          <select
            value={step.operation ?? 'add'}
            onChange={(event) => onChange({ operation: event.target.value as TransformStep['operation'] })}
          >
            <option value="add">Sumar valor</option>
            <option value="subtract">Restar valor</option>
            <option value="multiply">Multiplicar por</option>
            <option value="divide">Dividir por</option>
            <option value="addPercentage">Sumar %</option>
            <option value="subtractPercentage">Restar %</option>
            <option value="removeIncludedPercentage">Quitar % incluido</option>
          </select>
        </label>
        <label className="field compact">
          <span>Valor</span>
          <input
            type="number"
            step="any"
            value={step.amount ?? 0}
            onChange={(event) => onChange({ amount: Number(event.target.value) })}
          />
        </label>
        <label className="field compact">
          <span>Redondeo</span>
          <select
            value={String(step.rounding ?? 2)}
            onChange={(event) => onChange({ rounding: parseRounding(event.target.value) })}
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

  return <div className="ruleHint">No requiere valor adicional</div>;
}

function StepConditionFields({
  step,
  inputColumns,
  outputColumns,
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const condition = step.condition;
  const conditionColumns = condition?.target === 'output' ? outputColumns : inputColumns;

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

            onChange({ condition: createDefaultCondition(inputColumns, outputColumns) });
          }}
        >
          <option value="always">Aplicar siempre</option>
          <option value="conditional">Aplicar solo si...</option>
        </select>
      </label>

      {condition ? (
        <>
          <label className="field compact">
            <span>Evaluar</span>
            <select
              value={condition.target}
              onChange={(event) => {
                const target = event.target.value as TransformCondition['target'];
                const nextColumns = target === 'output' ? outputColumns : inputColumns;
                onChange({
                  condition: {
                    ...condition,
                    target,
                    columnId: nextColumns[0]?.id ?? '',
                  },
                });
              }}
            >
              <option value="input">Columna de entrada</option>
              <option value="output">Columna de salida</option>
            </select>
          </label>
          <label className="field compact">
            <span>Columna</span>
            <select
              value={condition.columnId}
              onChange={(event) => onChange({ condition: { ...condition, columnId: event.target.value } })}
            >
              {conditionColumns.length === 0 ? <option value="">Sin columnas</option> : null}
              {conditionColumns.map((item) => (
                <option key={item.id} value={item.id}>
                  {'columnLetter' in item ? `${item.columnLetter} - ${item.label}` : item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field compact">
            <span>Operador</span>
            <select
              value={condition.operator}
              onChange={(event) => {
                const operator = event.target.value as ConditionOperator;
                onChange({
                  condition: {
                    ...condition,
                    operator,
                    valueType: isNumericConditionOperator(operator) ? 'number' : 'text',
                  },
                });
              }}
            >
              {conditionOperators.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
          </label>
          {conditionNeedsValue(condition.operator) ? (
            <label className="field compact">
              <span>Valor condicion</span>
              <input
                value={condition.value ?? ''}
                onChange={(event) => onChange({ condition: { ...condition, value: event.target.value } })}
              />
            </label>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function createStep(): TransformStep {
  return {
    id: crypto.randomUUID(),
    type: 'trim',
    value: '',
    searchValue: '',
    replaceValue: '',
    applyToEmptyValues: false,
  };
}

const conditionOperators: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'isEmpty', label: 'esta vacio' },
  { value: 'isNotEmpty', label: 'no esta vacio' },
  { value: 'contains', label: 'contiene' },
  { value: 'notContains', label: 'no contiene' },
  { value: 'equals', label: 'es igual a' },
  { value: 'notEquals', label: 'no es igual a' },
  { value: 'startsWith', label: 'empieza con' },
  { value: 'endsWith', label: 'termina con' },
  { value: 'greaterThan', label: 'mayor que' },
  { value: 'greaterThanOrEqual', label: 'mayor o igual que' },
  { value: 'lessThan', label: 'menor que' },
  { value: 'lessThanOrEqual', label: 'menor o igual que' },
  { value: 'numericEquals', label: 'igual numerico' },
  { value: 'numericNotEquals', label: 'distinto numerico' },
];

function createDefaultCondition(inputColumns: InputColumn[], outputColumns: OutputColumn[]): TransformCondition {
  if (inputColumns[0]) {
    return {
      target: 'input',
      columnId: inputColumns[0].id,
      operator: 'isNotEmpty',
      value: '',
      valueType: 'text',
    };
  }

  return {
    target: 'output',
    columnId: outputColumns[0]?.id ?? '',
    operator: 'isNotEmpty',
    value: '',
    valueType: 'text',
  };
}

function conditionNeedsValue(operator: ConditionOperator) {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

function isNumericConditionOperator(operator: ConditionOperator) {
  return [
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'numericEquals',
    'numericNotEquals',
  ].includes(operator);
}

function updateStep(steps: TransformStep[], id: string, patch: Partial<TransformStep>) {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

function moveStep(steps: TransformStep[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= steps.length) {
    return steps;
  }

  const nextSteps = [...steps];
  const [item] = nextSteps.splice(index, 1);
  nextSteps.splice(nextIndex, 0, item);
  return nextSteps;
}

function stepSupportsEmptyValues(type: TransformStepType) {
  return ['addPrefix', 'addSuffix', 'removeText', 'replaceText', 'numericOperation'].includes(type);
}

function parseRounding(value: string): TransformStep['rounding'] {
  if (value === 'none') {
    return 'none';
  }

  if (value === '0') {
    return 0;
  }

  if (value === '4') {
    return 4;
  }

  return 2;
}

function getDirectInputColumnId(column: OutputColumn, inputColumns: InputColumn[]) {
  if (column.recipe.type === 'direct' && column.recipe.inputColumnId) {
    return column.recipe.inputColumnId;
  }

  return inputColumns[0]?.id ?? '';
}

function createDefaultParts(inputColumns: InputColumn[]): RecipePart[] {
  return inputColumns[0] ? [createInputPart(inputColumns)] : [];
}

function createInputPart(inputColumns: InputColumn[], id: string = crypto.randomUUID()): RecipePart {
  return {
    id,
    type: 'input',
    inputColumnId: inputColumns[0]?.id ?? '',
  };
}

function createTextPart(id: string = crypto.randomUUID()): RecipePart {
  return {
    id,
    type: 'text',
    value: '',
  };
}

function updatePart(parts: RecipePart[], id: string, nextPart: RecipePart) {
  return parts.map((part) => (part.id === id ? nextPart : part));
}

function movePart(parts: RecipePart[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= parts.length) {
    return parts;
  }

  const nextParts = [...parts];
  const [item] = nextParts.splice(index, 1);
  nextParts.splice(nextIndex, 0, item);
  return nextParts;
}
