import { useState } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { parseNumericValue } from '../../domain/import/numericOperations';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConditionOperator, InputColumn, OutputColumn, OutputRecipe, CustomValueMode as PersistedCustomValueMode, RecipePart, TransformCondition, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';

type OutputColumnRecipeEditorProps = {
  column: OutputColumn;
  inputColumns: InputColumn[];
  sampleInputValues?: Record<string, string>;
  onChange: (column: OutputColumn) => void;
};

export function OutputColumnRecipeEditor({ column, inputColumns, sampleInputValues, onChange }: OutputColumnRecipeEditorProps) {
  const activeInputColumns = inputColumns.filter((inputColumn) => inputColumn.active);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [customValueMode, setCustomValueMode] = useState<CustomValueMode>('');
  const effectiveCustomValueMode = column.recipe.type === 'combine'
    ? getCustomValueMode(column.recipe) || customValueMode
    : '';

  const updateRecipe = (recipe: OutputRecipe) => {
    onChange({ ...column, recipe });
  };

  return (
    <div className="recipeEditor">
      <div className="recipeMainFields">
        <label className="field compact">
          <span>Origen del valor</span>
          <select
            value={column.recipe.type}
            onChange={(event) => {
              const nextType = event.target.value as OutputRecipe['type'];
              if (nextType === 'combine') {
                setCustomValueMode('');
              }
              updateRecipe(buildRecipeForSelectedType(nextType, column, activeInputColumns));
            }}
          >
            <option value="direct">Directa desde entrada</option>
            <option value="empty">Columna vacia</option>
            <option value="fixedText">Texto fijo</option>
            <option value="combine">Crear valor personalizado</option>
          </select>
        </label>

        {column.recipe.type === 'direct' ? (
          <label className="field compact">
            <span>Columna de entrada</span>
            <select value={column.recipe.inputColumnId} onChange={(event) => updateRecipe({ type: 'direct', inputColumnId: event.target.value })}>
              {activeInputColumns.length === 0 ? <option value="">Sin columnas activas</option> : null}
              {activeInputColumns.map((inputColumn) => (
                <option key={inputColumn.id} value={inputColumn.id}>
                  {getInputColumnLabel(inputColumn)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {column.recipe.type === 'fixedText' ? (
          <label className="field compact">
            <span>Texto fijo</span>
            <input value={column.recipe.value} onChange={(event) => updateRecipe({ type: 'fixedText', value: event.target.value })} />
          </label>
        ) : null}
      </div>

      {column.recipe.type === 'combine' ? (
        <>
          <div className="recipeSubBlock constructorSummary">
            <div>
              <strong>Crear valor personalizado</strong>
              <p className="muted">Vista previa: {buildCustomValuePreview(column.recipe, sampleInputValues, false, effectiveCustomValueMode)}</p>
              <p className="muted">{getCustomValueSummary(column.recipe, activeInputColumns)}</p>
              {getConstructorAdjustmentsSummary(column.recipe, activeInputColumns) ? (
                <p className="muted" title={getConstructorAdjustmentsSummary(column.recipe, activeInputColumns, Number.POSITIVE_INFINITY)}>
                  Ajustes: {getConstructorAdjustmentsSummary(column.recipe, activeInputColumns)}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={() => setIsConstructorOpen(true)}>
              Editar valor personalizado
            </button>
          </div>
          <Modal
            open={isConstructorOpen}
            title={`Crear valor personalizado${column.label ? `: ${column.label}` : ''}`}
            size="xl"
            onClose={() => setIsConstructorOpen(false)}
          >
            <div className="constructorModalContent">
              <div className="filenamePreview">
                <strong>Vista previa</strong>
                <span>{buildCustomValuePreview(column.recipe, sampleInputValues, true, effectiveCustomValueMode)}</span>
              </div>
              <CustomValueEditor
                recipe={column.recipe}
                inputColumns={activeInputColumns}
                mode={effectiveCustomValueMode}
                onModeChange={setCustomValueMode}
                onChange={(recipe) => updateRecipe(recipe)}
              />
            </div>
          </Modal>
        </>
      ) : null}
    </div>
  );
}

export function buildRecipeForSelectedType(
  type: OutputRecipe['type'],
  column: OutputColumn,
  activeInputColumns: InputColumn[],
): OutputRecipe {
  if (type === 'direct') {
    return { type: 'direct', inputColumnId: getDirectInputColumnId(column, activeInputColumns) };
  }

  if (type === 'fixedText') {
    return { type: 'fixedText', value: '' };
  }

  if (type === 'combine') {
    return {
      type: 'combine',
      parts: [],
      separator: '',
    };
  }

  return { type: 'empty' };
}

export function describeCombineParts(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  if (recipe.parts.length === 0) {
    return 'Sin partes configuradas';
  }

  return recipe.parts
    .map((part) => {
      if (part.type === 'text') {
        return `Texto: "${part.value || ''}"`;
      }

      const inputColumn = inputColumns.find((column) => column.id === part.inputColumnId);
      return inputColumn ? getInputColumnSummary(inputColumn) : 'Columna de entrada';
    })
    .join(' | ');
}

export function getConstructorPartsSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  return `${recipe.parts.length === 1 ? 'Base' : 'Partes'}: ${describeCombineParts(recipe, inputColumns)}`;
}

export function getCustomValueSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  if (!isCustomValueConfigured(recipe)) {
    return 'Todavia no se eligio como crear este valor.';
  }

  return getConstructorPartsSummary(recipe, inputColumns);
}

export function getConstructorAdjustmentsSummary(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  inputColumns: InputColumn[],
  limit = 3,
) {
  const adjustments = [
    ...recipe.parts.flatMap((part) => describePartAdjustments(part, inputColumns)),
    ...describeStepAdjustments(recipe.steps ?? []),
  ];

  if (adjustments.length === 0) {
    return '';
  }

  if (adjustments.length <= limit) {
    return adjustments.join(' · ');
  }

  return `${adjustments.slice(0, limit).join(' · ')} · ${adjustments.length - limit} ajustes mas`;
}

function describePart(part: RecipePart, inputColumns: InputColumn[]) {
  const base = part.type === 'text'
    ? `Texto: "${part.value || ''}"`
    : inputColumns.find((column) => column.id === part.inputColumnId)
      ? getInputColumnSummary(inputColumns.find((column) => column.id === part.inputColumnId)!)
      : 'Columna de entrada';
  const suffix = getSimpleStepValue(part.steps ?? [], 'addSuffix');
  const prefix = getSimpleStepValue(part.steps ?? [], 'addPrefix');
  const extras = [
    prefix ? `prefijo: ${prefix}` : '',
    suffix ? `sufijo: ${suffix}` : '',
    part.separatorAfter ? `sep: ${part.separatorAfter}` : '',
  ].filter(Boolean);

  return extras.length ? `${base} · ${extras.join(' · ')}` : base;
}

function getInputColumnSummary(inputColumn: InputColumn) {
  const name = (inputColumn.alias || inputColumn.header || '').trim();

  if (name && name !== inputColumn.columnLetter) {
    return `Columna ${inputColumn.columnLetter} (${name})`;
  }

  return `Columna ${inputColumn.columnLetter}`;
}

function describePartAdjustments(part: RecipePart, inputColumns: InputColumn[]) {
  const partLabel = part.type === 'text'
    ? `Texto: "${part.value || ''}"`
    : inputColumns.find((column) => column.id === part.inputColumnId)
      ? getInputColumnSummary(inputColumns.find((column) => column.id === part.inputColumnId)!)
      : 'Columna de entrada';
  const stepAdjustments = describeStepAdjustments(part.steps ?? []).map((adjustment) => `${adjustment} en ${partLabel}`);
  const separatorAdjustment = part.separatorAfter ? [`separador "${part.separatorAfter}" en ${partLabel}`] : [];

  return [...stepAdjustments, ...separatorAdjustment];
}

function describeStepAdjustments(steps: TransformStep[]) {
  return steps.flatMap((step) => {
    if (step.type === 'numericOperation') {
      return [
        describeNumericOperation(step),
        describeRounding(step.rounding ?? 2),
      ];
    }

    return describeSimpleStep(step);
  }).filter(Boolean);
}

function describeSimpleStep(step: TransformStep) {
  if (step.type === 'trim') {
    return ['limpiar espacios'];
  }

  if (step.type === 'noop') {
    return ['sin operacion seleccionada'];
  }

  if (step.type === 'uppercase') {
    return ['mayusculas'];
  }

  if (step.type === 'lowercase') {
    return ['minusculas'];
  }

  if (step.type === 'addPrefix') {
    return [`prefijo "${step.value ?? ''}"`];
  }

  if (step.type === 'addSuffix') {
    return [`sufijo "${step.value ?? ''}"`];
  }

  if (step.type === 'removeText') {
    return [`quitar "${step.value ?? ''}"`];
  }

  if (step.type === 'extractNumber') {
    return ['extraer numero'];
  }

  if (step.type === 'toNumber') {
    return ['convertir a numero'];
  }

  if (step.type === 'toText') {
    return ['convertir a texto'];
  }

  return [`reemplazar "${step.searchValue ?? ''}" por "${step.replaceValue ?? ''}"`];
}

function describeNumericOperation(step: TransformStep) {
  const amount = step.amount ?? 0;

  if (step.operation === 'subtract') {
    return `restar valor ${amount}`;
  }

  if (step.operation === 'multiply') {
    return `multiplicar por ${amount}`;
  }

  if (step.operation === 'divide') {
    return `dividir por ${amount}`;
  }

  if (step.operation === 'addPercentage') {
    return `sumar ${amount}%`;
  }

  if (step.operation === 'subtractPercentage') {
    return `restar ${amount}%`;
  }

  if (step.operation === 'removeIncludedPercentage') {
    return `quitar ${amount}% incluido`;
  }

  return `sumar valor ${amount}`;
}

function describeRounding(rounding: TransformStep['rounding']) {
  if (rounding === 'none') {
    return 'sin redondeo';
  }

  return `${rounding ?? 2} decimales`;
}

function getStepSummary(step: TransformStep) {
  if (step.type === 'numericOperation') {
    return describeNumericOperation(step);
  }

  const [summary] = describeSimpleStep(step);
  return summary;
}

export function buildCustomValuePreview(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues?: Record<string, string>,
  modal = false,
  modeOverride?: CustomValueMode,
) {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (mode === '') {
    return modal ? 'Selecciona un tipo de operacion para ver la vista previa.' : 'Sin valores configurados';
  }

  if (mode === 'number' && !getSimpleInputPart(recipe).inputColumnId) {
    return 'Selecciona una columna numerica.';
  }

  if (mode === 'text' && !getSimpleInputPart(recipe).inputColumnId) {
    return 'Selecciona una columna de texto.';
  }

  if (mode === 'concat' && recipe.parts.length === 0) {
    return 'Agrega una parte para ver la vista previa.';
  }

  if (!isCustomValueConfigured(recipe, mode)) {
    return 'No se han elegido valores suficientes.';
  }

  if (mode === 'number' && !canPreviewNumericValue(recipe, sampleInputValues)) {
    return 'No se pudo calcular: valor no numerico.';
  }

  return buildCombinePreview(recipe, sampleInputValues) ?? 'Sin datos de ejemplo disponibles';
}

export function buildCombinePreview(recipe: Extract<OutputRecipe, { type: 'combine' }>, sampleInputValues?: Record<string, string>) {
  if (!sampleInputValues) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'constructor-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };
  const [row] = buildProcessedRows([{ rowNumber: 1, values: sampleInputValues }], [previewColumn]);
  return row?.outputValues[previewColumn.id] ?? '';
}

export type CustomValueMode = '' | PersistedCustomValueMode;

type ValueConstructionMode = '' | 'steps' | 'concat';

export const valueConstructionOptions: Array<{ value: Exclude<ValueConstructionMode, ''>; label: string }> = [
  { value: 'steps', label: 'Un valor con pasos' },
  { value: 'concat', label: 'Concatenar / unir partes' },
];

export const stepModeOptions: Array<{ value: TransformStepMode; label: string }> = [
  { value: 'text', label: 'Trabajar con texto' },
  { value: 'number', label: 'Trabajar con numero' },
  { value: 'conversion', label: 'Conversion' },
];

function CustomValueEditor({
  recipe,
  inputColumns,
  mode,
  onModeChange,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  mode: CustomValueMode;
  onModeChange: (mode: CustomValueMode) => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const baseInputPart = recipe.type === 'combine' ? getSimpleInputPart(recipe) : null;
  const constructionMode = getValueConstructionMode(mode);
  const updateConstructionMode = (nextMode: ValueConstructionMode) => {
    const nextRecipe = createRecipeForConstructionMode(nextMode, recipe);
    const nextCustomMode = nextRecipe.customMode ?? '';
    onModeChange(nextCustomMode);
    onChange(nextRecipe);
  };
  const updateBaseInputColumn = (inputColumnId: string) => {
    if (mode !== 'number' && mode !== 'text') {
      return;
    }

    onChange(buildSimpleCustomValueRecipeWithSteps(mode, inputColumnId, recipe.steps ?? [], recipe));
  };

  return (
    <div className="recipeSubBlock customValueEditor">
      <p className="muted">Elegi primero como construir el valor. Despues configura pasos o partes.</p>
      <div className="customValueBaseRow">
        <ValueConstructionModeSelect mode={constructionMode} onChange={updateConstructionMode} />
      </div>

      {mode === 'number' ? (
        <SimpleNumberValueEditor recipe={recipe} inputColumns={inputColumns} mode={mode} onBaseInputColumnChange={updateBaseInputColumn} onChange={onChange} />
      ) : null}
      {mode === 'text' ? (
        <SimpleTextValueEditor recipe={recipe} inputColumns={inputColumns} mode={mode} onBaseInputColumnChange={updateBaseInputColumn} onChange={onChange} />
      ) : null}
      {mode === 'concat' ? (
        <CombineRecipeFields recipe={recipe} inputColumns={inputColumns} onChange={onChange} />
      ) : null}
    </div>
  );
}

function SimpleNumberValueEditor({
  recipe,
  inputColumns,
  mode,
  onBaseInputColumnChange,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  mode: Extract<CustomValueMode, 'number' | 'text'>;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const part = getSimpleInputPart(recipe);
  const steps = normalizeStepsForMode(recipe.steps?.length ? recipe.steps : [createNoopStep(mode)], mode);
  const updateSteps = (nextSteps: TransformStep[]) => onChange(buildSimpleCustomValueRecipeWithSteps('number', part.inputColumnId, normalizeStepsForMode(nextSteps, mode), recipe));

  return (
    <StepBlocksEditor
      inputColumns={inputColumns}
      defaultStepMode={mode}
      baseInputColumnId={part.inputColumnId}
      steps={steps}
      requireAtLeastOne
      onBaseInputColumnChange={onBaseInputColumnChange}
      onStepsChange={updateSteps}
    />
  );
}

function SimpleTextValueEditor({
  recipe,
  inputColumns,
  mode,
  onBaseInputColumnChange,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  mode: Extract<CustomValueMode, 'number' | 'text'>;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const part = getSimpleInputPart(recipe);
  const steps = normalizeStepsForMode(recipe.steps?.length ? recipe.steps : [createNoopStep(mode)], mode);
  const updateSteps = (nextSteps: TransformStep[]) => onChange(buildSimpleCustomValueRecipeWithSteps('text', part.inputColumnId, normalizeStepsForMode(nextSteps, mode), recipe));

  return (
    <StepBlocksEditor
      inputColumns={inputColumns}
      defaultStepMode={mode}
      baseInputColumnId={part.inputColumnId}
      steps={steps}
      requireAtLeastOne
      onBaseInputColumnChange={onBaseInputColumnChange}
      onStepsChange={updateSteps}
    />
  );
}

function StepBlocksEditor({
  inputColumns,
  defaultStepMode,
  baseInputColumnId,
  steps,
  requireAtLeastOne = false,
  onBaseInputColumnChange,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  steps: TransformStep[];
  requireAtLeastOne?: boolean;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onStepsChange: (steps: TransformStep[]) => void;
}) {
  const addStep = () => {
    onStepsChange([...steps, createNoopStep(defaultStepMode)]);
  };

  const deleteStep = (indexToDelete: number) => {
    if (requireAtLeastOne && steps.length <= 1) {
      return;
    }

    onStepsChange(steps.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="simpleStepsEditor">
      {steps.length === 0 ? (
        <p className="muted">Sin pasos configurados.</p>
      ) : (
        <div className="stepsBlock">
          {steps.map((step, index) => (
            <SimpleStepBlock
              key={step.id}
              step={step}
              index={index}
              inputColumns={inputColumns}
              defaultStepMode={defaultStepMode}
              baseInputColumnId={baseInputColumnId}
              canDelete={!requireAtLeastOne || steps.length > 1}
              onBaseInputColumnChange={onBaseInputColumnChange}
              onChange={(patch) => onStepsChange(updateStep(steps, step.id, patch))}
              onDelete={() => deleteStep(index)}
            />
          ))}
        </div>
      )}
      <div className="stepsBlockActions">
        <button type="button" className="secondary" onClick={addStep}>Agregar paso</button>
      </div>
    </div>
  );
}

function SimpleStepBlock({
  step,
  index,
  inputColumns,
  defaultStepMode,
  baseInputColumnId,
  canDelete,
  onBaseInputColumnChange,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  canDelete: boolean;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const summary = getStepSummary(step);
  const stepMode = getStepMode(step, defaultStepMode);

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong title={summary ? `Paso ${index + 1} · ${summary}` : `Paso ${index + 1}`}>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className="simpleCustomValueGrid">
        <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
        {index === 0 ? (
          <InputColumnSelect value={baseInputColumnId} inputColumns={inputColumns} onChange={onBaseInputColumnChange} />
        ) : (
          <label className="field compact">
            <span>Desde que columna</span>
            <input value="Resultado anterior" disabled />
          </label>
        )}
        <StepTypeSelect step={step} mode={stepMode} onChange={(type) => onChange(replaceStepType(step, type, stepMode))} />
        <StepFields step={step} labels="workflow" onChange={onChange} />
        <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
      </div>
    </div>
  );
}

function StepsWorkspace({
  inputColumns,
  steps,
  requireAtLeastOne = false,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  steps: TransformStep[];
  requireAtLeastOne?: boolean;
  onStepsChange: (steps: TransformStep[]) => void;
}) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const safeSelectedStepIndex = steps.length === 0 ? -1 : Math.min(selectedStepIndex, steps.length - 1);
  const selectedStep = safeSelectedStepIndex >= 0 ? steps[safeSelectedStepIndex] : undefined;

  const addStep = () => {
    const nextSteps = [...steps, createNoopStep()];
    onStepsChange(nextSteps);
    setSelectedStepIndex(nextSteps.length - 1);
  };

  const deleteSelectedStep = () => {
    if (safeSelectedStepIndex < 0 || (requireAtLeastOne && steps.length <= 1)) {
      return;
    }

    const nextSteps = steps.filter((_, index) => index !== safeSelectedStepIndex);
    onStepsChange(nextSteps);
    setSelectedStepIndex(Math.min(safeSelectedStepIndex, nextSteps.length - 1));
  };

  return (
    <div className="simpleStepsEditor">
      <div className="stepsWorkspace">
        <div className="stepsListPanel">
          <div className="stepsListHeader">
            <strong>Pasos</strong>
            <button type="button" className="secondary" onClick={addStep}>Agregar paso</button>
          </div>
          {steps.length === 0 ? (
            <p className="muted">Sin pasos configurados.</p>
          ) : (
            <div className="stepsList">
              {steps.map((step, index) => {
                const summary = getStepSummary(step);

                return (
                  <button
                    type="button"
                    key={step.id}
                    className={`stepListItem${index === safeSelectedStepIndex ? ' selected' : ''}`}
                    onClick={() => setSelectedStepIndex(index)}
                    title={summary ? `Paso ${index + 1} · ${summary}` : `Paso ${index + 1}`}
                  >
                    <strong>Paso {index + 1}</strong>
                    {summary ? <span>{summary}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {selectedStep ? (
          <StepDetailPanel
            step={selectedStep}
            index={safeSelectedStepIndex}
            inputColumns={inputColumns}
            canDelete={!requireAtLeastOne || steps.length > 1}
            onChange={(patch) => onStepsChange(updateStep(steps, selectedStep.id, patch))}
            onDelete={deleteSelectedStep}
          />
        ) : null}
      </div>
    </div>
  );
}

function StepDetailPanel({
  step,
  index,
  inputColumns,
  canDelete,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  canDelete: boolean;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const summary = getStepSummary(step);
  const stepMode = getStepMode(step);

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong title={summary ? `Paso ${index + 1} · ${summary}` : `Paso ${index + 1}`}>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className="simpleCustomValueGrid">
        <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
        <StepTypeSelect step={step} mode={stepMode} onChange={(type) => onChange(replaceStepType(step, type, stepMode))} />
        <StepFields step={step} labels="workflow" onChange={onChange} />
        <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
      </div>
    </div>
  );
}

function StepTypeSelect({ step, mode, onChange }: { step: TransformStep; mode?: TransformStepMode; onChange: (type: TransformStepType) => void }) {
  const options = mode ? getStepTypesForMode(mode) : stepTypes;

  return (
    <label className="field compact">
      <span>Que quiero hacer</span>
      <select value={step.type} onChange={(event) => onChange(event.target.value as TransformStepType)}>
        {options.map((stepType) => (
          <option key={stepType.value} value={stepType.value}>{stepType.label}</option>
        ))}
      </select>
    </label>
  );
}

function ValueConstructionModeSelect({ mode, onChange }: { mode: ValueConstructionMode; onChange: (mode: ValueConstructionMode) => void }) {
  return (
    <label className="field compact">
      <span>Forma de construir el valor</span>
      <select value={mode} onChange={(event) => onChange(event.target.value as ValueConstructionMode)}>
        <option value="">Seleccionar forma</option>
        {valueConstructionOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function StepModeSelect({ mode, onChange }: { mode: TransformStepMode; onChange: (mode: TransformStepMode) => void }) {
  return (
    <label className="field compact">
      <span>Tipo de operacion</span>
      <select value={mode} onChange={(event) => onChange(event.target.value as TransformStepMode)}>
        {stepModeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function InputColumnSelect({
  value,
  inputColumns,
  label = 'Desde que columna',
  onChange,
}: {
  value: string;
  inputColumns: InputColumn[];
  label?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field compact">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seleccionar columna</option>
        {inputColumns.map((inputColumn) => (
          <option key={inputColumn.id} value={inputColumn.id}>
            {getInputColumnLabel(inputColumn)}
          </option>
        ))}
      </select>
    </label>
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
  const [selectedPartId, setSelectedPartId] = useState<string | null>(recipe.parts[0]?.id ?? null);
  const selectedPart = recipe.parts.find((part) => part.id === selectedPartId) ?? recipe.parts[0];
  const selectedPartIndex = selectedPart ? recipe.parts.findIndex((part) => part.id === selectedPart.id) : -1;

  const updateParts = (parts: RecipePart[]) => {
    onChange({ ...recipe, parts });
  };

  const addPart = () => {
    const nextPart = createInputPart(inputColumns);
    updateParts([...recipe.parts, nextPart]);
    setSelectedPartId(nextPart.id);
  };

  const removePart = (partId: string) => {
    const index = recipe.parts.findIndex((part) => part.id === partId);
    const nextParts = recipe.parts.filter((part) => part.id !== partId);
    updateParts(nextParts);

    if (selectedPartId === partId) {
      setSelectedPartId(nextParts[index]?.id ?? nextParts[index - 1]?.id ?? null);
    }
  };

  const updateSelectedPart = (nextPart: RecipePart) => {
    updateParts(updatePart(recipe.parts, nextPart.id, nextPart));
  };

  const updateSeparatorBeforeSelectedPart = (separatorBefore: string) => {
    if (selectedPartIndex <= 0) {
      return;
    }

    const previousPart = recipe.parts[selectedPartIndex - 1];
    updateParts(updatePart(recipe.parts, previousPart.id, { ...previousPart, separatorAfter: separatorBefore }));
  };

  return (
    <div className="recipeSubBlock">
      <div className="sectionHeader">
        <p>Partes del valor</p>
        <button type="button" className="secondary" onClick={addPart}>
          Agregar parte
        </button>
      </div>
      {recipe.parts.length === 0 ? <p className="muted">Agrega una parte para construir el valor.</p> : null}
      {recipe.parts.length > 0 ? (
        <div className="constructorWorkspace">
          <div className="constructorPartsList">
            <SortableList
              items={recipe.parts}
              onChange={updateParts}
              renderItem={(part, handle) => {
                const index = recipe.parts.findIndex((item) => item.id === part.id);
                const summary = describePart(part, inputColumns);

                return (
                  <div className={`constructorPartItem${part.id === selectedPart?.id ? ' selected' : ''}`}>
                    {handle}
                    <button type="button" className="constructorPartSelect" onClick={() => setSelectedPartId(part.id)}>
                      <strong>Parte {index + 1}</strong>
                      <span title={summary}>{summary}</span>
                    </button>
                    <DeleteButton onClick={() => removePart(part.id)} />
                  </div>
                );
              }}
            />
          </div>

          {selectedPart ? (
            <div className="constructorPartPanel">
              <h3>Parte {selectedPartIndex + 1}</h3>
              <div className="constructorPartMainGrid">
                <ConcatPartFields
                  part={selectedPart}
                  inputColumns={inputColumns}
                  isFirstPart={selectedPartIndex === 0}
                  separatorBefore={selectedPartIndex > 0 ? recipe.parts[selectedPartIndex - 1]?.separatorAfter ?? '' : ''}
                  globalSeparator={recipe.separator}
                  onChange={updateSelectedPart}
                  onSeparatorBeforeChange={updateSeparatorBeforeSelectedPart}
                />
              </div>
              <StepsWorkspace
                inputColumns={inputColumns}
                steps={selectedPart.steps ?? []}
                onStepsChange={(steps) => updateSelectedPart({ ...selectedPart, steps })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConcatPartFields({
  part,
  inputColumns,
  isFirstPart,
  separatorBefore,
  globalSeparator,
  onChange,
  onSeparatorBeforeChange,
}: {
  part: RecipePart;
  inputColumns: InputColumn[];
  isFirstPart: boolean;
  separatorBefore: string;
  globalSeparator?: string;
  onChange: (part: RecipePart) => void;
  onSeparatorBeforeChange: (separatorBefore: string) => void;
}) {
  const updateOrigin = (type: RecipePart['type']) => {
    if (type === part.type) {
      return;
    }

    if (type === 'text') {
      onChange({
        id: part.id,
        type: 'text',
        value: '',
        steps: part.steps,
        separatorAfter: part.separatorAfter,
      });
      return;
    }

    onChange({
      id: part.id,
      type: 'input',
      inputColumnId: '',
      steps: part.steps,
      separatorAfter: part.separatorAfter,
    });
  };

  const updateInputColumn = (inputColumnId: string) => {
    if (part.type === 'input') {
      onChange({ ...part, inputColumnId });
      return;
    }

    onChange({
      ...createInputPart(inputColumns, part.id, inputColumnId),
      steps: part.steps,
      separatorAfter: part.separatorAfter,
    });
  };

  return (
    <>
      {!isFirstPart ? (
        <label className="field compact">
          <span>Separador antes de esta parte</span>
          <input
            value={separatorBefore}
            onChange={(event) => onSeparatorBeforeChange(event.target.value)}
            placeholder={globalSeparator || 'Sin separador'}
          />
        </label>
      ) : null}

      <label className="field compact">
        <span>Origen de la parte</span>
        <select value={part.type} onChange={(event) => updateOrigin(event.target.value as RecipePart['type'])}>
          <option value="input">Columna de entrada</option>
          <option value="text">Texto fijo</option>
        </select>
      </label>

      {part.type === 'text' ? (
        <label className="field compact">
          <span>Texto</span>
          <input value={part.type === 'text' ? part.value : ''} onChange={(event) => onChange({ ...part, value: event.target.value })} />
        </label>
      ) : (
        <InputColumnSelect value={part.type === 'input' ? part.inputColumnId : ''} inputColumns={inputColumns} label="Columna" onChange={updateInputColumn} />
      )}
    </>
  );
}

const stepTypes: Array<{ value: TransformStepType; label: string }> = [
  { value: 'noop', label: 'Seleccionar operacion' },
  { value: 'trim', label: 'Limpiar espacios' },
  { value: 'uppercase', label: 'Convertir a mayusculas' },
  { value: 'lowercase', label: 'Convertir a minusculas' },
  { value: 'addPrefix', label: 'Agregar prefijo' },
  { value: 'addSuffix', label: 'Agregar sufijo' },
  { value: 'removeText', label: 'Quitar texto' },
  { value: 'replaceText', label: 'Reemplazar texto' },
  { value: 'extractNumber', label: 'Extraer numero del texto' },
  { value: 'toNumber', label: 'Convertir a numero' },
  { value: 'toText', label: 'Convertir a texto' },
  { value: 'numericOperation', label: 'Operacion numerica' },
];

const textStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'trim',
  'uppercase',
  'lowercase',
  'addPrefix',
  'addSuffix',
  'removeText',
  'replaceText',
].includes(stepType.value));

const numberStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'numericOperation',
].includes(stepType.value));

const conversionStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'extractNumber',
  'toNumber',
  'toText',
].includes(stepType.value));

export function getStepTypesForMode(mode: TransformStepMode) {
  if (mode === 'number') {
    return numberStepTypes;
  }

  if (mode === 'conversion') {
    return conversionStepTypes;
  }

  return textStepTypes;
}

type StepFieldLabels = 'default' | 'workflow';

function StepFields({ step, labels = 'default', onChange }: { step: TransformStep; labels?: StepFieldLabels; onChange: (patch: Partial<TransformStep>) => void }) {
  if (step.type === 'noop') {
    return <div className="ruleHint">Selecciona una operacion para transformar el valor.</div>;
  }

  if (step.type === 'addPrefix') {
    return (
      <label className="field compact">
        <span>{labels === 'workflow' ? 'Con que texto' : 'Texto al inicio'}</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'addSuffix') {
    return (
      <label className="field compact">
        <span>{labels === 'workflow' ? 'Con que texto' : 'Texto al final'}</span>
        <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
      </label>
    );
  }

  if (step.type === 'removeText') {
    return (
      <label className="field compact">
        <span>{labels === 'workflow' ? 'Con que texto' : 'Texto a quitar'}</span>
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
      <div className="numericOperationFields">
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Que quiero hacer' : 'Operacion'}</span>
          <select title={numericOperationLabels[step.operation ?? 'add']} value={step.operation ?? 'add'} onChange={(event) => onChange({ operation: event.target.value as TransformStep['operation'] })}>
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
          <span>{labels === 'workflow' ? 'Cuanto' : 'Valor'}</span>
          <input type="number" step="any" value={step.amount ?? 0} onChange={(event) => onChange({ amount: Number(event.target.value) })} />
        </label>
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Decimales / redondeo' : 'Redondeo'}</span>
          <select value={String(step.rounding ?? 2)} onChange={(event) => onChange({ rounding: parseRounding(event.target.value) })}>
            <option value="none">Sin redondeo</option>
            <option value="0">0 decimales</option>
            <option value="2">2 decimales</option>
            <option value="4">4 decimales</option>
          </select>
        </label>
      </div>
    );
  }

  if (step.type === 'extractNumber') {
    return <div className="ruleHint">Extrae el primer numero encontrado en el texto.</div>;
  }

  if (step.type === 'toNumber') {
    return <div className="ruleHint">Convierte el valor completo a numero. No extrae numeros mezclados con texto.</div>;
  }

  if (step.type === 'toText') {
    return <div className="ruleHint">Convierte el valor actual a texto para aplicar pasos de texto.</div>;
  }

  return <div className="ruleHint">No requiere valor adicional</div>;
}

function StepConditionFields({
  step,
  inputColumns,
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const condition = step.condition;
  const conditionColumns = inputColumns;
  const inputCondition = condition ? normalizeConditionToInput(condition, inputColumns) : undefined;

  return (
    <div className="transformConditionBlock">
      <label className="field compact">
        <span>Condicion</span>
        <select
          title={condition ? 'Aplicar solo si...' : 'Aplicar siempre'}
          value={condition ? 'conditional' : 'always'}
          onChange={(event) => {
            if (event.target.value === 'always') {
              onChange({ condition: undefined });
              return;
            }

            onChange({ condition: createDefaultCondition(inputColumns) });
          }}
        >
          <option value="always">Aplicar siempre</option>
          <option value="conditional">Aplicar solo si...</option>
        </select>
      </label>

      {condition ? (
        <div className="conditionFieldsGrid">
          <label className="field compact">
            <span>Columna</span>
            <select
              title={conditionColumns.find((item) => item.id === inputCondition?.columnId)?.label ?? ''}
              value={inputCondition?.columnId ?? ''}
              onChange={(event) => onChange({ condition: { ...(inputCondition ?? createDefaultCondition(inputColumns)), columnId: event.target.value } })}
            >
              {conditionColumns.length === 0 ? <option value="">Sin columnas</option> : null}
              {conditionColumns.map((item) => (
                <option key={item.id} value={item.id}>
                  {getInputColumnLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="field compact">
            <span>Operador</span>
            <select
              title={conditionOperators.find((operator) => operator.value === inputCondition?.operator)?.label ?? ''}
              value={inputCondition?.operator ?? 'isNotEmpty'}
              onChange={(event) => {
                const operator = event.target.value as ConditionOperator;
                onChange({
                  condition: {
                    ...(inputCondition ?? createDefaultCondition(inputColumns)),
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
          {inputCondition && conditionNeedsValue(inputCondition.operator) ? (
            <label className="field compact">
              <span>Valor condicion</span>
              <input value={inputCondition.value ?? ''} onChange={(event) => onChange({ condition: { ...inputCondition, value: event.target.value } })} />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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

const numericOperationLabels: Record<NonNullable<TransformStep['operation']>, string> = {
  add: 'Sumar valor',
  subtract: 'Restar valor',
  multiply: 'Multiplicar por',
  divide: 'Dividir por',
  addPercentage: 'Sumar %',
  subtractPercentage: 'Restar %',
  removeIncludedPercentage: 'Quitar % incluido',
};

function createDefaultCondition(inputColumns: InputColumn[]): TransformCondition {
  return {
    target: 'input',
    columnId: inputColumns[0]?.id ?? '',
    operator: 'isNotEmpty',
    value: '',
    valueType: 'text',
  };
}

function normalizeConditionToInput(condition: TransformCondition, inputColumns: InputColumn[]): TransformCondition {
  return {
    ...condition,
    target: 'input',
    columnId: inputColumns.some((column) => column.id === condition.columnId)
      ? condition.columnId
      : inputColumns[0]?.id ?? '',
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

export function getSimpleStepValue(steps: TransformStep[], type: 'addPrefix' | 'addSuffix') {
  return steps.find((step) => step.type === type)?.value ?? '';
}

export function setSimpleStep(steps: TransformStep[], type: 'addPrefix' | 'addSuffix', value: string): TransformStep[] {
  const nextSteps = steps.filter((step) => step.type !== type);
  if (value === '') {
    return nextSteps;
  }

  const nextStep: TransformStep = {
    id: crypto.randomUUID(),
    type,
    value,
  };

  return type === 'addPrefix' ? [nextStep, ...nextSteps] : [...nextSteps, nextStep];
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

function getCustomValueMode(recipe: Extract<OutputRecipe, { type: 'combine' }>): CustomValueMode {
  if (recipe.customMode) {
    return recipe.customMode;
  }

  if (recipe.parts.length === 0 && (recipe.steps ?? []).length === 0) {
    return '';
  }

  if (isSimpleInputRecipe(recipe)) {
    const steps = recipe.steps ?? [];
    if (steps.length > 0 && steps.some((step) => getStepMode(step) === 'number')) {
      return 'number';
    }

    if (steps.length > 0) {
      return 'text';
    }
  }

  return 'concat';
}

function isCustomValueConfigured(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode) {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (mode === '') {
    return false;
  }

  if (mode === 'number' || mode === 'text') {
    return Boolean(getSimpleInputPart(recipe).inputColumnId && recipe.steps?.[0]);
  }

  return recipe.parts.length > 0 && recipe.parts.every((part) => part.type === 'text' || Boolean(part.inputColumnId));
}

function canPreviewNumericValue(recipe: Extract<OutputRecipe, { type: 'combine' }>, sampleInputValues?: Record<string, string>) {
  const part = getSimpleInputPart(recipe);
  if (!sampleInputValues || !part.inputColumnId) {
    return true;
  }

  const firstStep = recipe.steps?.[0];
  if (firstStep?.type === 'noop' || firstStep?.type === 'extractNumber' || firstStep?.type === 'toText' || (firstStep && isTextStepType(firstStep.type))) {
    return true;
  }

  return parseNumericValue(sampleInputValues[part.inputColumnId]) !== null;
}

export function createCustomValueRecipeForMode(mode: CustomValueMode, current: Extract<OutputRecipe, { type: 'combine' }>): Extract<OutputRecipe, { type: 'combine' }> {
  if (mode === '') {
    return { type: 'combine', parts: [], separator: '' };
  }

  if (mode === 'number') {
    return buildSimpleCustomValueRecipe('number', getSimpleInputPart(current).inputColumnId, current.steps?.[0] ?? createNoopStep(), current);
  }

  if (mode === 'text') {
    return buildSimpleCustomValueRecipe('text', getSimpleInputPart(current).inputColumnId, current.steps?.[0] ?? createNoopStep(), current);
  }

  return {
    ...current,
    customMode: 'concat',
    separator: current.separator ?? '',
    steps: current.steps ?? [],
  };
}

function getValueConstructionMode(mode: CustomValueMode): ValueConstructionMode {
  if (mode === 'concat') {
    return 'concat';
  }

  if (mode === 'text' || mode === 'number') {
    return 'steps';
  }

  return '';
}

export function createRecipeForConstructionMode(mode: ValueConstructionMode, current: Extract<OutputRecipe, { type: 'combine' }>): Extract<OutputRecipe, { type: 'combine' }> {
  if (mode === '') {
    return { type: 'combine', parts: [], separator: '' };
  }

  if (mode === 'concat') {
    if (current.customMode === 'concat') {
      return { ...current, customMode: 'concat', separator: current.separator ?? '' };
    }

    return { type: 'combine', customMode: 'concat', parts: [], separator: '', steps: [] };
  }

  if (current.customMode === 'number' || current.customMode === 'text') {
    return current;
  }

  return buildSimpleCustomValueRecipeWithSteps('text', '', [createNoopStep('text')], current);
}

export function buildSimpleCustomValueRecipe(
  mode: 'number' | 'text',
  inputColumnId: string,
  step: TransformStep,
  current?: Extract<OutputRecipe, { type: 'combine' }>,
): Extract<OutputRecipe, { type: 'combine' }> {
  return buildSimpleCustomValueRecipeWithSteps(mode, inputColumnId, [step], current);
}

function buildSimpleCustomValueRecipeWithSteps(
  mode: 'number' | 'text',
  inputColumnId: string,
  steps: TransformStep[],
  current?: Extract<OutputRecipe, { type: 'combine' }>,
): Extract<OutputRecipe, { type: 'combine' }> {
  const existingPart = current?.parts.find((part) => part.type === 'input');
  const nextSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || current?.steps?.[index]?.id || crypto.randomUUID(),
    mode: getStepMode(step, mode),
  }));

  return {
    type: 'combine',
    customMode: mode,
    parts: [{
      id: existingPart?.id ?? crypto.randomUUID(),
      type: 'input',
      inputColumnId,
    }],
    separator: '',
    steps: nextSteps,
  };
}

function getSimpleInputPart(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const part = recipe.parts.find((item) => item.type === 'input');
  return part?.type === 'input' ? part : { id: crypto.randomUUID(), type: 'input' as const, inputColumnId: '' };
}

function createNumericOperationStep(): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: 'number',
    type: 'numericOperation',
    operation: 'addPercentage',
    amount: 10,
    rounding: 2,
    applyToEmptyValues: false,
  };
}

function createNoopStep(modeHint: TransformStepMode = 'text'): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: modeHint,
    type: 'noop',
    applyToEmptyValues: false,
  };
}

function createTextOperationStep(type: TransformStepType, condition?: TransformCondition): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: inferStepModeFromType(type),
    type,
    value: '',
    searchValue: '',
    replaceValue: '',
    condition,
    applyToEmptyValues: false,
  };
}

function replaceStepType(step: TransformStep, type: TransformStepType, mode: TransformStepMode): Partial<TransformStep> {
  if (type === 'numericOperation') {
    return {
      ...createNumericOperationStep(),
      id: step.id,
      mode,
      condition: step.condition,
      applyToEmptyValues: step.applyToEmptyValues,
    };
  }

  return {
    ...createTextOperationStep(type, step.condition),
    id: step.id,
    mode,
    applyToEmptyValues: step.applyToEmptyValues,
  };
}

export function normalizeStepsForMode(steps: TransformStep[], fallbackMode: TransformStepMode): TransformStep[] {
  return steps.map((step) => {
    const mode = getStepMode(step, fallbackMode);
    return isStepAllowedForMode(step.type, mode) ? { ...step, mode } : createNoopStepFromStep(step, mode);
  });
}

function isStepAllowedForMode(type: TransformStepType, mode: TransformStepMode) {
  return getStepTypesForMode(mode).some((stepType) => stepType.value === type);
}

export function changeStepMode(step: TransformStep, mode: TransformStepMode): Partial<TransformStep> {
  return isStepAllowedForMode(step.type, mode) ? { mode } : createNoopStepFromStep(step, mode);
}

function createNoopStepFromStep(step: TransformStep, mode: TransformStepMode): TransformStep {
  return {
    id: step.id,
    mode,
    type: 'noop',
    condition: step.condition,
    applyToEmptyValues: step.applyToEmptyValues ?? false,
  };
}

export function getStepMode(step: TransformStep, fallbackMode: TransformStepMode = 'text'): TransformStepMode {
  return normalizeStepMode(step.mode) ?? (step.type === 'noop' ? fallbackMode : inferStepModeFromType(step.type));
}

function normalizeStepMode(mode?: string): TransformStepMode | undefined {
  return mode === 'text' || mode === 'number' || mode === 'conversion' ? mode : undefined;
}

export function inferStepModeFromType(type: TransformStepType): TransformStepMode {
  if (type === 'numericOperation') {
    return 'number';
  }

  if (type === 'extractNumber' || type === 'toNumber' || type === 'toText') {
    return 'conversion';
  }

  return 'text';
}

function isSimpleInputRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.parts.length === 1 && recipe.parts[0]?.type === 'input' && (recipe.steps ?? []).length > 0;
}

function isTextStepType(type: TransformStepType) {
  return ['trim', 'uppercase', 'lowercase', 'addPrefix', 'addSuffix', 'removeText', 'replaceText', 'toText'].includes(type);
}

function getDirectInputColumnId(column: OutputColumn, inputColumns: InputColumn[]) {
  if (column.recipe.type === 'direct' && column.recipe.inputColumnId) {
    return column.recipe.inputColumnId;
  }

  return inputColumns[0]?.id ?? '';
}

function createInputPart(inputColumns: InputColumn[], id: string = crypto.randomUUID(), inputColumnId = ''): RecipePart {
  return {
    id,
    type: 'input',
    inputColumnId,
  };
}

function updatePart(parts: RecipePart[], id: string, nextPart: RecipePart) {
  return parts.map((part) => (part.id === id ? nextPart : part));
}
