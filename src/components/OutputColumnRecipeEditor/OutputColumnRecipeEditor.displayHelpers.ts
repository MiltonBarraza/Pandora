import { defaultDateInputFormat, parseDateValue } from '../../domain/import/dateOperations';
import { describeManualRangeStepSummary } from '../../domain/import/manualRangeModel';
import { parseNumericValue } from '../../domain/import/numericOperations';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { InputColumn, InputRow, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep } from '../../types/import';
import { canPreviewNumericValue, describeConcatPartSource, getCustomValueMode, getFirstStepSource, getInputColumnSummary, getSimpleInputPart, getStepMode, getVisibleRecipeSteps, hasConfiguredConcatStep, hasConfiguredManualRangeStep, hasConfiguredNumericStepOperands, isCustomValueConfigured, type CustomValueMode } from './OutputColumnRecipeEditor.recipeHelpers';
import { getNumericOperandLabels } from './OutputColumnRecipeEditor.optionHelpers';

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

export function getCustomValuePartsDisplayLabel(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  void recipe;
  return '';
}

export function getCustomValuePartsDisplaySummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  const concatStep = getConfiguredConcatStep(recipe);

  if (concatStep?.parts?.length) {
    return concatStep.parts.map((part) => describeConcatPartSource(part, inputColumns)).join(' | ');
  }

  if (recipe.parts.length === 0) {
    return 'Sin partes configuradas';
  }

  return describeCombineParts(recipe, inputColumns);
}

export function getConstructorAdjustmentsSummary(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  inputColumns: InputColumn[],
  limit = 3,
) {
  const adjustments = getConstructorAdjustmentDescriptions(recipe, inputColumns);

  if (adjustments.length === 0) {
    return '';
  }

  if (adjustments.length <= limit) {
    return adjustments.join(' · ');
  }

  return `${adjustments.slice(0, limit).join(' · ')} · ${adjustments.length - limit} pasos más`;
}

export function getConstructorAdjustmentLabels(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  inputColumns: InputColumn[],
  limit = 4,
) {
  const adjustments = getConstructorAdjustmentDescriptions(recipe, inputColumns);

  if (adjustments.length <= limit) {
    return adjustments.map(formatAdjustmentForDisplay);
  }

  return [
    ...adjustments.slice(0, limit).map(formatAdjustmentForDisplay),
    `${adjustments.length - limit} pasos más`,
  ];
}

function getConstructorAdjustmentDescriptions(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  return [
    ...recipe.parts.flatMap((part) => describePartAdjustments(part, inputColumns)),
    ...describeStepAdjustments(recipe.steps ?? [], inputColumns),
  ];
}

export function getConfiguredConcatStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).find((step) => step.type === 'concat' && (step.parts?.length ?? 0) > 0);
}

function formatAdjustmentForDisplay(adjustment: string) {
  const labels: Record<string, string> = {
    'limpiar espacios': 'Limpiar espacios',
    'sin operación seleccionada': 'Sin operación seleccionada',
    mayúsculas: 'Mayúsculas',
    minúsculas: 'Minúsculas',
    concatenar: 'Concatenar',
    'usar número del texto': 'Usar número del texto',
    'convertir a número': 'Convertir a número',
    'convertir a texto': 'Convertir a texto',
    'sin redondeo': 'Sin redondeo',
  };

  return labels[adjustment] ?? adjustment.charAt(0).toUpperCase() + adjustment.slice(1);
}

function describePartAdjustments(part: RecipePart, inputColumns: InputColumn[]) {
  const partLabel = part.type === 'text'
    ? `Texto: "${part.value || ''}"`
    : inputColumns.find((column) => column.id === part.inputColumnId)
      ? getInputColumnSummary(inputColumns.find((column) => column.id === part.inputColumnId)!)
      : 'Columna de entrada';
  const stepAdjustments = describeStepAdjustments(part.steps ?? [], inputColumns).map((adjustment) => `${adjustment} en ${partLabel}`);
  const separatorAdjustment = part.separatorAfter ? [`separador "${part.separatorAfter}" en ${partLabel}`] : [];

  return [...stepAdjustments, ...separatorAdjustment];
}

export function describeStepAdjustments(steps: TransformStep[], inputColumns: InputColumn[] = []) {
  return steps.flatMap((step) => {
    if (step.type === 'numericOperation') {
      return [
        describeNumericOperation(step),
        describeRounding(step.rounding ?? 2),
      ];
    }

    return describeSimpleStep(step, inputColumns);
  }).filter(Boolean);
}

function describeSimpleStep(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'trim') {
    return ['limpiar espacios'];
  }

  if (step.type === 'noop') {
    if (step.source?.type === 'fixedText') return ['usar texto fijo'];
    if (step.source?.type === 'input') return ['usar columna de entrada'];
    if (step.source?.type === 'previousResult') return ['usar resultado anterior'];
    return ['usar valor tal cual'];
  }

  if (step.type === 'uppercase') {
    return ['mayúsculas'];
  }

  if (step.type === 'lowercase') {
    return ['minúsculas'];
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
    return ['usar número del texto'];
  }

  if (step.type === 'toNumber') {
    return ['convertir a número'];
  }

  if (step.type === 'toText') {
    return ['convertir a texto'];
  }

  if (step.type === 'formatDate') {
    return ['formatear fecha'];
  }

  if (step.type === 'manualRange') {
    return [describeManualRangeStepSummary(step, inputColumns)];
  }

  if (step.type === 'concat') {
    return ['concatenar'];
  }

  return [`reemplazar "${step.searchValue ?? ''}" por "${step.replaceValue ?? ''}"`];
}

function describeNumericOperation(step: TransformStep) {
  const amount = getConfiguredNumericDisplayAmount(step);
  const amountSuffix = amount === null ? '' : ` ${amount}`;

  if (step.operation === 'subtract') {
    return `restar valor${amountSuffix}`;
  }

  if (step.operation === 'multiply') {
    return `multiplicar por${amountSuffix}`;
  }

  if (step.operation === 'divide') {
    return `dividir por${amountSuffix}`;
  }

  if (step.operation === 'addPercentage') {
    return amount === null ? 'sumar %' : `sumar ${amount}%`;
  }

  if (step.operation === 'subtractPercentage') {
    return amount === null ? 'restar %' : `restar ${amount}%`;
  }

  if (step.operation === 'removeIncludedPercentage') {
    return amount === null ? 'quitar % incluido' : `quitar ${amount}% incluido`;
  }

  return `sumar valor${amountSuffix}`;
}

function getConfiguredNumericDisplayAmount(step: TransformStep) {
  if (step.rightOperand) {
    return step.rightOperand.type === 'fixedText' && step.rightOperand.value.trim() !== ''
      ? step.rightOperand.value.trim()
      : null;
  }

  return typeof step.amount === 'number' && Number.isFinite(step.amount)
    ? String(step.amount)
    : null;
}

function describeRounding(rounding: TransformStep['rounding']) {
  if (rounding === 'none') {
    return 'sin redondeo';
  }

  return `${rounding ?? 2} decimales`;
}

export function getStepSummary(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'numericOperation') {
    return describeNumericOperation(step);
  }

  if (step.type === 'manualRange') {
    const count = step.ranges?.length ?? 0;
    return `${count} ${count === 1 ? 'rango creado' : 'rangos creados'}`;
  }

  const [summary] = describeSimpleStep(step, inputColumns);
  return summary;
}

export function getRecipeStepTitle(
  step: TransformStep,
  inputColumns: InputColumn[] = [],
  source: StepSource | undefined = step.source,
) {
  if (step.type === 'noop') {
    const mode = getStepMode(step);
    if (mode === 'number' && source?.type === 'input' && source.inputColumnId) return 'Usar número desde columna';
    if (mode === 'number' && source?.type === 'fixedText') return 'Usar número fijo';
    if (mode === 'date' && source?.type === 'input' && source.inputColumnId) return 'Usar fecha desde columna';
    if (mode === 'date' && source?.type === 'fixedText') return 'Usar fecha fija';
    if ((mode === 'date' || mode === 'number') && source?.type === 'previousResult') return 'Usar resultado anterior';
    if (source?.type === 'fixedText') return 'Usar texto fijo';
    if (source?.type === 'input' && source.inputColumnId) return 'Usar columna de entrada';
    if (source?.type === 'previousResult') return 'Usar resultado anterior';
    return 'Sin configurar';
  }

  const summary = getStepSummary(step, inputColumns);
  return summary ? summary.charAt(0).toUpperCase() + summary.slice(1) : '';
}

export function buildCustomValuePreview(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues?: Record<string, string>,
  modal = false,
  modeOverride?: CustomValueMode,
  manualRangeRows: InputRow[] = [],
) {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (mode === '') {
    return modal ? 'Configurá el Paso 1 para ver la vista previa.' : 'Sin valores configurados';
  }

  const hasNumericOperands = hasConfiguredNumericStepOperands(recipe);
  const effectiveMode = hasNumericOperands ? 'number' : mode;

  if (effectiveMode === 'number' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasNumericOperands) {
    return 'Seleccioná una columna numérica.';
  }

  if (effectiveMode === 'text' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasConfiguredManualRangeStep(recipe)) {
    return 'Seleccioná una columna de texto.';
  }

  if (effectiveMode === 'concat' && recipe.parts.length === 0 && !hasConfiguredConcatStep(recipe)) {
    return 'Agrega una parte para ver la vista previa.';
  }

  if (!isCustomValueConfigured(recipe, effectiveMode)) {
    return 'No se han elegido valores suficientes.';
  }

  if (effectiveMode === 'number' && !canPreviewNumericValue(recipe, sampleInputValues)) {
    return 'No se pudo calcular: valor no numérico.';
  }

  if (recipeHasManualRange(recipe)) {
    return buildManualRangeAwarePreview(recipe, manualRangeRows) ?? 'Sin vista previa para los rangos configurados';
  }

  const numericPreview = getNumericOperationPreview(recipe, sampleInputValues, manualRangeRows);
  if (numericPreview.message) {
    return numericPreview.message;
  }

  const previewSampleInputValues = numericPreview.sampleInputValues
    ?? getDatePreviewSampleInputValues(recipe, sampleInputValues, manualRangeRows);
  return buildCombinePreview(recipe, previewSampleInputValues) ?? 'Sin datos de ejemplo disponibles';
}

export function getNumericOperationPreview(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  rows: InputRow[],
): { message?: string; sampleInputValues?: Record<string, string> } {
  const operandSteps = getVisibleRecipeSteps(recipe).filter((step) => (
    step.type === 'numericOperation' && Boolean(step.leftOperand || step.rightOperand)
  ));
  if (operandSteps.length === 0) {
    return {};
  }

  for (const step of operandSteps) {
    const labels = getNumericOperandLabels(step.operation);
    const operands = [
      { operand: step.leftOperand ?? { type: 'previousResult' as const }, label: labels.left },
      { operand: step.rightOperand ?? { type: 'fixedText' as const, value: String(step.amount ?? '') }, label: labels.right },
    ];
    const incompleteOperand = operands.find(({ operand }) => (
      (operand.type === 'fixedText' && operand.value.trim() === '' && !Number.isFinite(operand.numericFallback))
      || (operand.type === 'input' && !operand.inputColumnId)
    ));
    if (incompleteOperand) {
      return { message: `Completá ${incompleteOperand.label} para ver la vista previa.` };
    }
  }

  const inputColumnIds = Array.from(new Set(operandSteps.flatMap((step) => (
    [step.leftOperand, step.rightOperand]
      .filter((operand): operand is Extract<StepSource, { type: 'input' }> => operand?.type === 'input')
      .map((operand) => operand.inputColumnId)
  ))));
  if (inputColumnIds.length === 0) {
    return { sampleInputValues: sampleInputValues ?? {} };
  }

  const candidates = [
    ...rows.map((row) => row.values),
    ...(sampleInputValues ? [sampleInputValues] : []),
  ];
  const numericCandidate = candidates.find((values) => inputColumnIds.every((inputColumnId) => (
    parseNumericValue(values[inputColumnId]) !== null
  )));
  return numericCandidate
    ? { sampleInputValues: numericCandidate }
    : { message: 'No se encontraron valores numéricos para calcular la vista previa.' };
}

function getDatePreviewSampleInputValues(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  rows: InputRow[],
) {
  const dateInputStep = [...getVisibleRecipeSteps(recipe)].reverse().find((step) => (
    (step.mode === 'date' || step.type === 'formatDate')
    && step.source?.type === 'input'
    && Boolean(step.source.inputColumnId)
  ));
  if (!dateInputStep || dateInputStep.source?.type !== 'input') {
    return sampleInputValues;
  }

  const inputColumnId = dateInputStep.source.inputColumnId;
  const candidates = [
    ...rows.map((row) => row.values),
    ...(sampleInputValues ? [sampleInputValues] : []),
  ].filter((values) => String(values[inputColumnId] ?? '').trim() !== '');

  if (dateInputStep.type === 'formatDate') {
    const parseableValues = candidates.find((values) => (
      parseDateValue(values[inputColumnId], dateInputStep.dateInputFormat ?? defaultDateInputFormat) !== null
    ));
    return parseableValues ?? candidates[0] ?? sampleInputValues;
  }

  return candidates[0] ?? sampleInputValues;
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

export function buildManualRangeAwarePreview(recipe: Extract<OutputRecipe, { type: 'combine' }>, rows: InputRow[]) {
  const previewRows = getManualRangeAwarePreviewRows(recipe, rows);

  if (previewRows.length === 0) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'constructor-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };

  for (const row of previewRows) {
    const [processedRow] = buildProcessedRows([row], [previewColumn]);
    const value = processedRow?.outputValues[previewColumn.id] ?? '';
    if (value.trim() !== '') {
      return `Fila ${row.rowNumber}: ${value}`;
    }
  }

  return null;
}

export function buildManualRangeRecipePreview(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  const previewRows = getManualRangePreviewRows(recipe, rows, sampleInputValues);
  if (previewRows.length === 0) {
    return null;
  }

  const previewColumn: OutputColumn = {
    id: 'manual-range-preview',
    label: 'Vista previa',
    order: 0,
    enabled: true,
    recipe,
  };

  for (const row of previewRows) {
    const [processedRow] = buildProcessedRows([row], [previewColumn]);
    const value = processedRow?.outputValues[previewColumn.id] ?? '';
    if (value.trim() !== '') {
      return `Fila ${row.rowNumber}: ${value}`;
    }
  }

  return null;
}

function getManualRangeAwarePreviewRows(recipe: Extract<OutputRecipe, { type: 'combine' }>, rows: InputRow[]) {
  const manualRangeSteps = collectManualRangeSteps(recipe.steps ?? []);
  recipe.parts.forEach((part) => {
    manualRangeSteps.push(...collectManualRangeSteps(part.steps ?? []));
  });

  if (manualRangeSteps.length === 0) {
    return [];
  }

  return rows.filter((row) => manualRangeSteps.some((step) => (
    (step.ranges ?? []).some((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber)
  )));
}

function collectManualRangeSteps(steps: TransformStep[]): TransformStep[] {
  return steps.flatMap((step) => {
    const nestedSteps = step.parts?.flatMap((part) => part.steps ?? []) ?? [];
    const nestedManualRangeSteps = collectManualRangeSteps(nestedSteps);
    return step.type === 'manualRange' ? [step, ...nestedManualRangeSteps] : nestedManualRangeSteps;
  });
}

function getManualRangePreviewRows(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  rows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  const rowsInRange = rows.filter((row) => recipe.ranges.some((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber));
  if (rowsInRange.length > 0 || !sampleInputValues) {
    return rowsInRange;
  }

  return recipe.ranges.map((range) => ({
    rowNumber: range.startRowNumber,
    values: sampleInputValues,
  }));
}

function recipeHasManualRange(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return stepsHaveManualRange(recipe.steps ?? [])
    || recipe.parts.some((part) => stepsHaveManualRange(part.steps ?? []));
}

function stepsHaveManualRange(steps: TransformStep[]): boolean {
  return steps.some((step) => (
    step.type === 'manualRange'
    || stepsHaveManualRange(step.parts?.flatMap((part) => part.steps ?? []) ?? [])
  ));
}

