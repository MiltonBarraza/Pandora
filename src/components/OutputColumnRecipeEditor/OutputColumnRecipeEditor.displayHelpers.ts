import { describeManualRangeStepSummary } from '../../domain/import/manualRangeModel';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { InputColumn, InputRow, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep } from '../../types/import';
import { canPreviewNumericValue, describeConcatPartSource, getCustomValueMode, getFirstStepSource, getInputColumnSummary, getSimpleInputPart, getVisibleRecipeSteps, hasConfiguredConcatStep, hasConfiguredManualRangeStep, hasConfiguredNumericStepOperands, isCustomValueConfigured, type CustomValueMode } from './OutputColumnRecipeEditor.recipeHelpers';

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
  const concatStep = getConfiguredConcatStep(recipe);

  if (!concatStep && recipe.parts.length === 1) {
    return 'Origen/base';
  }

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
    'extraer número': 'Extraer número',
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
    return ['extraer número'];
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

export function getStepSummary(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'numericOperation') {
    return describeNumericOperation(step);
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

