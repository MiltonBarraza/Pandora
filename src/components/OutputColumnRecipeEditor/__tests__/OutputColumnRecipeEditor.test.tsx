import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { addManualRangeValue, createDefaultManualRangeValue, createManualRangeRecipe, describeManualRangeCondition, describeManualRangeStepSummary, duplicateManualRangeValue, generateManualRangesFromDataBlocks, generateManualRangesFromTexts, getManualRangeCountLabel, getManualRangeFixedTextValue, getManualRangeInputSource, getManualRangeRangeTextHelpText, getManualRangeRangeTextSource, getManualRangeReferenceText, getManualRangeRowCount, getManualRangeRowCountFromInputs, getManualRangeSelectedTextOptions, getManualRangeTextOptions, getManualRangeValueSourceType, hasInvalidManualRange, hasOverlappingManualRanges, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, manualRangeValueSourceOptions, parseManualRangeRowInput, reconcileManualRangeTextSelections, removeManualRangeValue, sortManualRangesByStart, updateManualRangeCondition, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueRecipeSteps, updateManualRangeValueSourceType } from '../../../domain/import/manualRangeModel';
import { buildInputRows, buildProcessedRows } from '../../../domain/import/outputModel';
import type { InputColumn, InputRow, OutputColumn, OutputRecipe } from '../../../types/import';
import { Dropdown, filterDropdownOptions, getDropdownEmptyMessage } from '../../ui/Dropdown/Dropdown';
import { ColumnTextPicker, createFixedTextSourceFromColumnText, getUniqueColumnTextOptions } from '../ColumnTextPicker';
import { ComposePartEditor, ComposeStepHeader, ManualRangeRecipeEditor, ManualRangeTableRow, ManualRangeTextGenerator, OutputColumnRecipeEditor, StepConditionFields, addConcatPartToList, appendConcatPartAdditionalStep, applyRecipeEditorDraft, buildCombinePreview, buildCustomValuePreview, buildManualRangeAwarePreview, buildManualRangeGeneratorSummary, buildManualRangeRecipePreview, buildRecipeForSelectedType, buildSimpleCustomValueRecipe, changeStepMode, clearManualRangeValues, createCustomValueRecipeForMode, createDefaultConcatPart, createRecipeForConstructionMode, createRecipeForStudioMode, dateInputFormatOptions, dateOutputFormatOptions, describeCombineParts, describeConcatPartSource, formatManualRangeRowInput, getComposeColumnTextOptions, getComposeValidColumnTextSelection, getConstructorAdjustmentLabels, getConstructorAdjustmentsSummary, getConstructorPartsSummary, getCustomValuePartsDisplayLabel, getCustomValuePartsDisplaySummary, getDatePickerValue, getFormatDateSourceSelection, getManualRangeGeneratorIntervalSummary, getManualRangeGeneratorWarnings, getManualRangePreviewColumnsForRows, getManualRangePreviewRowsForRange, getNextSelectedConcatPartIdAfterRemove, getOutputRecipeTypeOptions, getOutputRecipeTypeSelectorValue, getPreviousResultDisplay, getPreviousStepPreviewValue, getRecipeEditorModalRecipe, getRecipeStudioMode, getSafeSelectedConcatPartId, getSimpleStepValue, getStepMode, getStepModeOptions, getStepSourceDropdownOptions, getStepSourceDropdownValue, getStepSourceForTextAction, getStepSourceFromDropdownValue, getStepTextSourceActionOptions, getStepTypesForMode, getTextStepSourceLabel, getVisibleConcatPartPrimaryStep, getVisibleLeftOperand, getVisibleRecipeSteps, getVisibleRightOperand, hasRecipeEditorDraftChanges, inferStepModeFromType, isDeterministicPreviousResultRecipe, manualRangeDetectionModeOptions, manualRangeUsageHelpText, normalizeConcatPartsAfterReorder, normalizeStepsForMode, numericOperationOptions, outputRecipeTypeOptions, recipeEditorAdditionalStepLabel, recipeEditorDiscardChangesMessage, recipeEditorDiscardChangesTitle, recipeEditorModalApplyLabel, recipeEditorModalCancelLabel, recipeEditorPreviousResultHelpText, removeConcatPartFromList, reorderComposeRecipeParts, reorderConcatParts, replaceWholeStepForAction, replaceWholeStepForMode, resolveManualRangeGeneratorRowBounds, setSimpleStep, shouldShowPreviousResultSourceHelp, shouldShowStepTypeSelectForStep, shouldShowTextSourceFields, stepModeOptions, updateComposeColumnTextSelection, updateConcatPartInList, updateConcatPartPrimarySource, updateConcatPartPrimaryStep, updateConcatPartSteps, updateStep, valueConstructionOptions } from '../OutputColumnRecipeEditor';
import { CustomValueEditor } from '../OutputColumnRecipeEditor';
import { StepSourceFields, StepTypeSelect, getCompatibleStepValueInputColumns, getConversionStepActionOptions, getNumericStepTypeFromSelection, getStepActionHelpText, getStepValueSourceOptions, getTextStepActionOptions } from '../OutputColumnRecipeEditor.StepFields';
import { StepEditorBlock, getNumericOperandInputColumns, getNumericOperationUiWarning } from '../StepEditorBlock';
import { getNumericFormulaUiWarning } from '../NumericFormulaEditor';
import { getNumericOperandLabels } from '../OutputColumnRecipeEditor.optionHelpers';
import { getRecipeStepTitle } from '../OutputColumnRecipeEditor.displayHelpers';
import { applyComposeConcatPartUpdate, applyComposeRecipePartsUpdate, getComposeConcatPartFromStorage, getComposeRecipePartsFromStorage, getComposeRecipePartsStorageMode, hasComposePreviousResultSource } from '../OutputColumnRecipeEditor.composePartsStorage';
import { getConcatPartFromRecipePart, getConcatPartsFromRecipeParts, getRecipePartFromConcatPart } from '../OutputColumnRecipeEditor.recipeHelpers';
import { RangeValueEditor, appendRangeValueStep, createDefaultRangeValueConcatParts, getRangeValueConcatPartSourceDropdownOptions, getRangeValueSourceDropdownOptions, getRangeValueSourceSelection, updateRangeConcatPartPrimarySource } from '../RangeValueEditor';
import { getAllowedSourceActions, getAllowedStepActions, getAllowedStepModes } from '../OutputColumnRecipeEditor.stepPolicy';
import { RecipeStudioShell, addComposeRecipePart, getComposePreviewCountText, getPreviewRowsFromStart, getPreviewStartRowNumber } from '../RecipeStudio';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-name',
    columnIndex: 3,
    columnLetter: 'D',
    label: 'D',
    header: 'Nombre',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-pack',
    columnIndex: 5,
    columnLetter: 'F',
    label: 'F',
    header: 'Envase',
    alias: 'Presentacion',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-price',
    columnIndex: 39,
    columnLetter: 'AN',
    label: 'AN',
    header: 'Precio',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '20L' } },
  { rowNumber: 9, values: { 'input-name': '', 'input-pack': '10L' } },
  { rowNumber: 10, values: { 'input-name': 'RODILLO SIMIL LANA', 'input-pack': '5L' } },
];

function renderRangeValueEditor(
  range: Parameters<typeof RangeValueEditor>[0]['range'],
  options: { inputColumns?: InputColumn[]; manualRangeRows?: InputRow[] } = {},
) {
  vi.stubGlobal('document', { body: {} });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    return renderToStaticMarkup(
      <RangeValueEditor
        range={range}
        inputColumns={options.inputColumns ?? inputColumns}
        manualRangeRows={options.manualRangeRows ?? manualRangeRows}
        onSourceAndStepsChange={() => undefined}
        onStepsChange={() => undefined}
      />,
    );
  } finally {
    consoleError.mockRestore();
  }
}

function renderManualRangeTableRow(
  range: Parameters<typeof ManualRangeTableRow>[0]['range'],
  options: { rows?: InputRow[]; initiallyShowRowsPreview?: boolean } = {},
) {
  vi.stubGlobal('document', { body: {} });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    return renderToStaticMarkup(
      <ManualRangeTableRow
        recipe={{ type: 'manualRange', ranges: [range] }}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={options.rows ?? manualRangeRows}
        initiallyShowRowsPreview={options.initiallyShowRowsPreview}
        onChange={() => undefined}
      />,
    );
  } finally {
    consoleError.mockRestore();
  }
}

const combineColumn: OutputColumn = {
  id: 'output-code',
  label: 'Codigo',
  order: 0,
  enabled: true,
  recipe: {
    type: 'combine',
    parts: [{ id: 'part-code', type: 'input', inputColumnId: 'input-code' }],
    steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
  },
};

function expectedRangeTextValueRecipe(inputColumnId: string, selectedText: string) {
  return {
    source: { type: 'rangeText' as const, inputColumnId, selectedText },
    steps: [],
  };
}

function expectedEmptyRangeValueRecipe() {
  return {
    source: { type: 'fixedText' as const, value: '' },
    steps: [],
  };
}

function expectedFixedTextRangeValueRecipe(value: string) {
  return {
    source: { type: 'fixedText' as const, value },
    steps: [],
  };
}

function renderRecipeEditorMarkup(
  column: OutputColumn,
  options: { manualRangeRows?: InputRow[]; sampleInputValues?: Record<string, string> } = {},
) {
  vi.stubGlobal('document', { body: {} });
  const rows = options.manualRangeRows ?? [];
  const activeInputColumns = inputColumns.filter((inputColumn) => inputColumn.active);
  const studio = column.recipe.type === 'combine' || column.recipe.type === 'manualRange' ? (
    <RecipeStudioShell
      recipe={column.recipe}
      inputColumns={activeInputColumns}
      manualRangeRows={rows}
      sampleInputValues={options.sampleInputValues}
      preview=""
      customValueMode={column.recipe.type === 'combine' ? column.recipe.customMode ?? '' : ''}
      renderCustomValueEditor={(props) => <CustomValueEditor {...props} />}
      renderComposePartEditor={(props) => <ComposePartEditor {...props} />}
      renderComposeStepHeader={(props) => <ComposeStepHeader {...props} />}
      renderManualRangeRecipeEditor={(props) => <ManualRangeRecipeEditor {...props} />}
      renderManualRangeTextGenerator={(props) => <ManualRangeTextGenerator {...props} />}
      onChange={() => undefined}
    />
  ) : null;
  return renderToStaticMarkup(
    <>
      {React.createElement(OutputColumnRecipeEditor, {
        column,
        inputColumns,
        manualRangeRows: options.manualRangeRows,
        sampleInputValues: options.sampleInputValues,
        onChange: () => undefined,
      })}
      {studio}
    </>,
  );
}

describe('buildRecipeForSelectedType', () => {
  it('drops hidden steps when switching from combine to direct', () => {
    expect(buildRecipeForSelectedType('direct', combineColumn, inputColumns)).toEqual({
      type: 'direct',
      inputColumnId: 'input-code',
    });
  });

  it('drops hidden steps when switching from combine to fixed text', () => {
    expect(buildRecipeForSelectedType('fixedText', combineColumn, inputColumns)).toEqual({
      type: 'fixedText',
      value: '',
    });
  });

  it('drops hidden steps when switching from combine to empty', () => {
    expect(buildRecipeForSelectedType('empty', combineColumn, inputColumns)).toEqual({
      type: 'empty',
    });
  });

  it('does not create default parts when switching to custom value', () => {
    expect(buildRecipeForSelectedType('combine', combineColumn, inputColumns)).toEqual({
      type: 'combine',
      parts: [],
      separator: '',
    });
  });

  it('creates a manual range recipe when switching to work with ranges', () => {
    expect(buildRecipeForSelectedType('manualRange', combineColumn, inputColumns)).toEqual({
      type: 'manualRange',
      ranges: [],
    });
  });
});

describe('constructor helpers', () => {
  it('keeps work with ranges out of the main recipe type selector', () => {
    expect(outputRecipeTypeOptions.map((option) => option.value)).toEqual(['direct', 'fixedText', 'combine']);
    expect(outputRecipeTypeOptions.map((option) => option.label)).not.toContain('Trabajar con rangos');
    expect(getOutputRecipeTypeOptions({ type: 'empty' }).map((option) => option.label)).not.toContain('Mantener configuración actual');
    expect(getOutputRecipeTypeOptions({ type: 'empty' })[0]).toEqual({
      value: 'empty',
      label: 'Sin valor',
    });
  });

  it('shows existing manual range recipes as custom values in the main selector', () => {
    expect(getOutputRecipeTypeSelectorValue({ type: 'manualRange', ranges: [] })).toBe('combine');
    expect(stepModeOptions).toContainEqual({ value: 'manualRange', label: 'Trabajar con rangos' });
  });

  it('shows a compact operation summary for manual ranges', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'range-output',
      label: 'Categoría',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: Array.from({ length: 18 }, (_, index) => ({
          id: `range-${index}`,
          startRowNumber: index + 1,
          endRowNumber: index + 1,
          value: `Valor ${index + 1}`,
        })),
      },
    });

    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Valores por rangos');
    expect(markup).toContain('Asigna valores según rangos de filas configurados.');
    expect(markup).toContain('18 rangos creados');
    expect(markup).not.toContain('Origen/base');
    expect(markup).not.toContain('Transformaciones');
    expect(markup).not.toContain('8-13');
  });

  it('detects the visual studio mode from the current recipe', () => {
    expect(getRecipeStudioMode({ type: 'direct', inputColumnId: 'input-code' })).toBe('takeValue');
    expect(getRecipeStudioMode({ type: 'fixedText', value: 'OK' })).toBe('fixedText');
    expect(getRecipeStudioMode({ type: 'manualRange', ranges: [] })).toBe('ranges');
    expect(getRecipeStudioMode({ type: 'empty' })).toBe('advanced');
    expect(getRecipeStudioMode({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
    })).toBe('compose');
    expect(getRecipeStudioMode({
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'text-part', type: 'text', value: 'OK' }],
      separator: '',
      steps: [],
    })).toBe('fixedText');
  });

  it('replaces compose mode navigation with the technical-style header', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-sidebar',
      label: 'Valor',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [{ id: 'part-code', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
      },
    });

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).not.toContain('recipeStudioSidebar');
    expect(markup).not.toContain('Combinar valores');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).not.toContain('Avanzado');
    expect(markup).toContain('Configuración general');
    expect(markup).toContain('Paso 1 · Concatenar');
    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Acción');
    expect(markup).toContain('Concatenar');
    expect(markup).toContain('Agregar parte');
    const composeHeaderMarkup = markup.slice(
      markup.indexOf('<section class="recipeStudioSection recipeStudioGeneralSection composeStudioHeader"'),
      markup.indexOf('</section>') + '</section>'.length,
    );
    expect(composeHeaderMarkup).not.toContain('disabled');
    expect(getStepModeOptions().map((option) => option.value)).toEqual(
      expect.arrayContaining(['text', 'number', 'conversion', 'date', 'manualRange']),
    );
    expect(getStepModeOptions({ allowManualRange: false }).map((option) => option.value)).not.toContain('manualRange');
    expect(getStepTypesForMode('text').map((option) => option.value)).toEqual(
      expect.arrayContaining(['concat', 'trim', 'uppercase']),
    );
    const textActions = getTextStepActionOptions(false).map((option) => option.label);
    expect(textActions).toEqual([
      'Usar columna de entrada',
      'Usar texto fijo',
      'Elegir texto desde celda',
      'Limpiar espacios',
      'Convertir a mayúsculas',
      'Convertir a minúsculas',
      'Agregar prefijo',
      'Agregar sufijo',
      'Quitar texto',
      'Reemplazar texto',
      'Concatenar',
    ]);
    expect(textActions).not.toContain('Usar valor tal cual');
    expect(markup).not.toContain('Tomar valor');
    expect(markup).not.toContain('Texto fijo');
  });

  it('starts directly in the technical editor for simple recipes', () => {
    const takeValueMarkup = renderRecipeEditorMarkup({
      id: 'output-take-value',
      label: 'Valor',
      order: 0,
      enabled: true,
      recipe: buildSimpleCustomValueRecipe('text', 'input-code', { id: 'step-1', type: 'noop' }),
    });
    expect(takeValueMarkup).not.toContain('Avanzado');
    expect(takeValueMarkup).not.toContain('recipeStudioModeBar');
    expect(takeValueMarkup).toContain('recipeStudioSection recipeStudioGeneralSection');
    expect(takeValueMarkup).toContain('composeStudioHeaderTitle');
    expect(takeValueMarkup).toContain('Configuración general');
    expect(takeValueMarkup).not.toContain('recipeStudioActionSection');
    expect(takeValueMarkup).not.toContain('Configuración del paso');
    expect(takeValueMarkup).toContain('Tipo de operación');
    expect(takeValueMarkup).toContain('Acción');
    expect(takeValueMarkup).not.toContain('composePartsBuilder');
    expect(takeValueMarkup.indexOf('Configuración general')).toBeLessThan(takeValueMarkup.indexOf('Condición'));
    expect(takeValueMarkup.indexOf('Condición')).toBeLessThan(takeValueMarkup.indexOf('Agregar paso'));

    const fixedTextMarkup = renderRecipeEditorMarkup({
      id: 'output-fixed-text',
      label: 'Estado',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'text-part', type: 'text', value: 'OK' }],
        separator: '',
        steps: [{ id: 'fixed-step', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'OK' } }],
      },
    });
    expect(fixedTextMarkup).not.toContain('Avanzado');
    expect(fixedTextMarkup).not.toContain('recipeStudioModeBar');
    expect(fixedTextMarkup).toContain('Configuración general');
    expect(fixedTextMarkup).toContain('Tipo de operación');
  });

  it('keeps primary selectors in first row and action fields in second row', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-prefix-layout',
      label: 'Código final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: 'prefix',
          mode: 'text',
          type: 'addPrefix',
          value: 'SKU-',
          source: { type: 'fixedText', value: 'ABC' },
        }],
      },
    });

    const primaryRowStart = markup.indexOf('stepPrimaryFieldsRow');
    const extraRowStart = markup.indexOf('stepExtraFieldsRow');
    const primaryRow = markup.slice(primaryRowStart, extraRowStart);
    const extraRowEnd = markup.indexOf('<div class="transformConditionBlock', extraRowStart);
    const extraRow = markup.slice(extraRowStart, extraRowEnd);

    expect(primaryRow).toContain('Tipo de operación');
    expect(primaryRow).toContain('Acción');
    expect(primaryRow).not.toContain('Prefijo');
    expect(extraRow.indexOf('Prefijo')).toBeLessThan(extraRow.indexOf('Valor fijo'));
    expect(extraRow).toContain('Valor base');
    expect(extraRow).toContain('Valor fijo');
    expect(extraRow).toContain('Texto fijo actual');
    expect(extraRow).toContain('Prefijo');
    expect(extraRow).not.toContain('<span>Texto fijo</span>');
    expect(markup).not.toContain('recipeStudioActionSection');
    expect(markup).not.toContain('Configuración del paso');
    expect(markup).toContain('Agregar paso');
  });

  it.each([
    ['uppercase', 'Convertir a mayúsculas'],
    ['lowercase', 'Convertir a minúsculas'],
    ['trim', 'Limpiar espacios'],
  ] as const)('renders %s with a fresh value selector instead of stale action fields', (type, label) => {
    const markup = renderRecipeEditorMarkup({
      id: `output-${type}-source`,
      label,
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{ id: type, mode: 'text', type, source: { type: 'input', inputColumnId: 'input-code' } }],
      },
    });

    expect(markup).toContain(label);
    expect(markup).toContain('Valor base');
    expect(markup).not.toContain('Texto fijo');
    expect(markup).not.toContain('Elegir texto desde celda');
    expect(markup).not.toContain('<span>Texto fijo</span>');
    expect(markup).not.toContain('<span>Prefijo</span>');
    expect(markup).not.toContain('<span>Sufijo</span>');
  });

  it.each([
    ['addPrefix', 'Prefijo'],
    ['addSuffix', 'Sufijo'],
    ['removeText', 'Texto a quitar'],
    ['replaceText', 'Texto a buscar'],
  ] as const)('renders %s without a redundant generic fixed-text input', (type, fieldLabel) => {
    const markup = renderRecipeEditorMarkup({
      id: `output-${type}-fields`,
      label: fieldLabel,
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: type,
          mode: 'text',
          type,
          source: { type: 'fixedText', value: 'Base' },
          value: 'X',
          searchValue: 'A',
          replaceValue: 'B',
        }],
      },
    });

    expect(markup).toContain('Valor base');
    expect(markup).toContain(fieldLabel);
    expect(markup).toContain(`class="field compact recipeField"><span>${fieldLabel}</span>`);
    if (type === 'replaceText') {
      expect(markup).toContain('class="field compact recipeField"><span>Reemplazar por</span>');
    }
    expect(markup).toContain('<span>Valor fijo</span>');
    expect(markup).toContain('Texto fijo actual');
    expect(markup).not.toContain('<span>Texto fijo</span>');
  });

  it('hides neutral noop from conversion actions while preserving internal compatibility', () => {
    expect(getConversionStepActionOptions().map((option) => option.value)).toEqual(['extractNumber', 'toNumber', 'toText']);
    expect(getConversionStepActionOptions()[0]).toEqual({ value: 'extractNumber', label: 'Usar número del texto' });
    expect(getConversionStepActionOptions().map((option) => option.label)).not.toContain('Usar valor tal cual');
    expect(getStepTypesForMode('conversion').map((option) => option.value)).toContain('noop');
  });

  it('describes conversion actions with specific help text', () => {
    expect(getStepActionHelpText('extractNumber', 'conversion')).toBe('Busca el primer número dentro del texto y usa ese número como resultado. Ejemplo: “Serie 304” → “304”.');
    expect(getStepActionHelpText('toNumber', 'conversion')).toBe('Convierte valores numéricos escritos como texto. Si no puede convertirlos, conserva el valor original.');
    expect(getStepActionHelpText('toText', 'conversion')).toBe('Trata el valor como texto para los siguientes pasos.');
    expect(getStepActionHelpText('removeIncludedPercentage', 'number')).toBe('Calcula el valor antes de un porcentaje ya incluido. Ejemplo: 120 con 20% incluido → 100.');
  });

  it('keeps typed noop hidden until it has a direct value source', () => {
    const unconfiguredNumberMarkup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'number-noop', mode: 'number', type: 'noop' }}
        mode="number"
        onChange={() => undefined}
      />,
    );
    const unconfiguredDateMarkup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'date-noop', mode: 'date', type: 'noop' }}
        mode="date"
        onChange={() => undefined}
      />,
    );
    const configuredNumberMarkup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'number-noop', mode: 'number', type: 'noop', source: { type: 'fixedText', value: '' } }}
        mode="number"
        onChange={() => undefined}
      />,
    );
    const configuredDateMarkup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'date-noop', mode: 'date', type: 'noop', source: { type: 'fixedText', value: '' } }}
        mode="date"
        onChange={() => undefined}
      />,
    );
    const conversionMarkup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'conversion-noop', mode: 'conversion', type: 'noop' }}
        mode="conversion"
        onChange={() => undefined}
      />,
    );

    expect(unconfiguredNumberMarkup).toContain('Seleccionar acción');
    expect(unconfiguredDateMarkup).toContain('Seleccionar acción');
    expect(configuredNumberMarkup).toContain('Usar valor tal cual');
    expect(configuredDateMarkup).toContain('Usar valor tal cual');
    expect(conversionMarkup).not.toContain('Usar valor tal cual');
    expect(conversionMarkup).toContain('Seleccionar acción');
  });

  it('renders compose studio as horizontal parts with selected-part configuration', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose',
      label: 'Nombre final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [
          { id: 'part-product', type: 'input', inputColumnId: 'input-name' },
          { id: 'part-separator', type: 'text', value: ' - ' },
          { id: 'part-code', type: 'input', inputColumnId: 'input-code' },
        ],
        separator: '',
      },
    }, { manualRangeRows });

    expect(markup).not.toContain('Combinar valores');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).not.toContain('Avanzado');
    expect(markup).not.toContain('<h4>Combinar valores</h4>');
    expect(markup).not.toContain('Armá el resultado uniendo columnas y textos.');
    expect(markup).toContain('Paso 1 · Concatenar');
    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Acción');
    expect(markup).toContain('Arrastrá las partes para cambiar el orden.');
    expect(markup).not.toContain('Construcci');
    expect(markup).not.toContain('Separador');
    expect(markup).toContain('Columna D');
    expect(markup).toContain('&quot; - &quot;');
    expect(markup).toContain('compositionTokenList');
    expect(markup).toContain('composePartsBuilder');
    expect(markup).toContain('Editor de partes');
    expect(markup).toContain('compositionTokenCard');
    expect(markup).toContain('compositionTokenCard compositionToken-input selected');
    expect(markup).toContain('compositionTokenCard compositionToken-text unselected');
    expect(markup).toContain('<span class="compositionJoiner">+</span>');
    expect(markup).not.toContain('compositionPartDivider');
    expect(markup).toContain('sortableRow-horizontal');
    expect(markup).toContain('Arrastrar parte');
    expect(markup).toContain('compositionTokenActions');
    expect(markup).toContain('Parte seleccionada');
    expect(markup).not.toContain('composeTokenPrimaryFields');
    expect(markup).not.toContain('>Fuente<');
    expect(markup).toContain('Paso 1 · Usar columna de entrada');
    expect(markup).toContain('Columna de entrada');
    expect(markup).toContain('Columna');
    expect(markup).toContain('class="dragHandle"');
    expect(markup).not.toContain('aria-label="Duplicar parte"');
    expect(markup).toContain('aria-label="Eliminar parte"');
    const selectedTokenCardIndex = markup.indexOf('compositionTokenCard compositionToken-input selected');
    const selectedTokenButtonIndex = markup.indexOf('class="compositionToken compositionToken-input selected"', selectedTokenCardIndex);
    const selectedTokenDragIndex = markup.indexOf('class="dragHandle"', selectedTokenCardIndex);
    const selectedTokenDeleteIndex = markup.indexOf('aria-label="Eliminar parte"', selectedTokenCardIndex);
    expect(selectedTokenButtonIndex).toBeLessThan(selectedTokenDragIndex);
    expect(selectedTokenDragIndex).toBeLessThan(selectedTokenDeleteIndex);
    expect(markup).not.toContain('Izquierda');
    expect(markup).not.toContain('Derecha');
    expect(markup).toContain('Vista previa');
    expect(markup).toContain('lucide-eye');
    expect(markup).toContain('actionButton actionButton-secondary actionButton-md composeStudioActionButton');
    expect(markup).toContain('actionButton actionButton-icon actionButton-sm actionButton-iconOnly composeStudioActionButton composePreviewButton');
    expect(markup).not.toContain('<span class="actionButtonText">Columna</span>');
    expect(markup).not.toContain('<span class="actionButtonText">Texto</span>');
    expect(markup.indexOf('Agregar parte')).toBeLessThan(markup.indexOf('aria-label="Partes de combinación"'));
    expect(markup.indexOf('aria-label="Vista previa"')).toBeLessThan(markup.indexOf('aria-label="Partes de combinación"'));
    expect(markup).toContain('Vista previa del resultado');
    expect(markup).toContain('Mostrando 3 filas desde la fila 8 de 10 filas del archivo.');
    expect(markup).toContain('Ver desde fila');
    expect(markup).toContain('composePreviewColumnRow');
    expect(markup).toContain('composePreviewColumnResult');
    expect(markup).not.toContain('style="width:15%"');
    expect(markup).not.toContain('style="width:85%"');
    expect(markup).toContain('<th>Fila</th>');
    expect(markup).toContain('<th>Resultado</th>');
    expect(markup).toContain('<td>8</td>');
    expect(markup).toContain('PINCELES SERIE 304 - ');
    expect(markup).toContain('Reglas y condiciones de esta parte');
    expect(markup).toContain('<summary class="composeTokenRulesHeader">');
    expect(markup).toContain('composeTokenRulesContent');
    expect(markup).not.toContain('<details class="composeTokenRules" open');
    expect(markup).toContain('Todos los pasos aplican siempre');
    expect(markup).toContain('<th>Paso y accion</th>');
    expect(markup).toContain('<th>Condicion</th>');
    expect(markup).toContain('<td>Paso base · Usar columna de entrada</td>');
    expect(markup).toContain('<td>Aplicar siempre</td>');
    expect(markup).not.toContain('Preview combinado');
    expect(markup).not.toContain('piezas usan opciones avanzadas');
    expect(markup).not.toContain('Opciones avanzadas');
    expect(markup).toContain('composePartTechnicalEditor');
    expect(markup).toContain('composeStudio composeStudioFlat');
    expect(markup).toContain('composeTokenInspector composeTokenInspectorFlat');
    expect(markup).toContain('composePartTechnicalEditor composePartTechnicalEditorFlat');
    const composeMarkup = markup.slice(markup.indexOf('<div class="composeStudio composeStudioFlat">'), markup.indexOf('</main>'));
    expect(composeMarkup).not.toContain('concatPartDetailPanel');
    expect(composeMarkup).not.toContain('recipeSubBlock');
    expect(composeMarkup).not.toContain('composePartDivider');
    expect((composeMarkup.match(/class="recipeStudioSection /g) ?? [])).toHaveLength(3);
    expect(composeMarkup).toContain('recipeStudioSection recipeStudioGeneralSection composeStudioHeader');
    expect(composeMarkup).toContain('recipeStudioSection recipeStudioSectionLight composePartsBuilder');
    expect(composeMarkup).toContain('recipeStudioSection composeTokenInspector composeTokenInspectorFlat');
    expect(composeMarkup).toContain('class="compositionTokenList"');
    expect(composeMarkup).toContain('composeStudioHeaderFields stepPrimaryFieldsRow');
    expect(composeMarkup).toContain('stepExtraFieldsRow');
    expect(markup).toContain('Agregar paso');
    const addStepMarkup = markup.slice(markup.lastIndexOf('<div class="concatPartStepsActions">'), markup.indexOf('</button>', markup.lastIndexOf('<div class="concatPartStepsActions">')) + '</button>'.length);
    expect(addStepMarkup).toContain('actionButton actionButton-secondary actionButton-md constructorAddStepButton');
    expect(addStepMarkup).not.toContain('concatAddAdjustmentButton');
    expect(addStepMarkup).not.toContain('infoTooltip');
    expect(markup.indexOf('composePartTechnicalEditor')).toBeLessThan(markup.indexOf('composeTokenRules'));
    expect(markup.toLowerCase()).not.toContain('pieza');
  });

  it('renders numeric formula studio as separate general, formula editor and selected value sections', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-formula-studio-layout',
      label: 'Total',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'number',
        parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
        separator: '',
        steps: [{
          id: 'formula-step',
          mode: 'number',
          type: 'numericFormula',
          formula: {
            version: 1,
            expression: {
              kind: 'binary',
              operator: 'add',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-price' } },
              right: { kind: 'operand', operand: { type: 'fixedText', value: '10' } },
            },
          },
          rounding: 2,
        }, {
          id: 'follow-up',
          mode: 'number',
          type: 'noop',
          source: { type: 'previousResult' },
        }, {
          id: 'third-step',
          mode: 'number',
          type: 'noop',
          source: { type: 'previousResult' },
        }],
      },
    });

    const studioMarkup = markup;
    const firstStepIndex = studioMarkup.indexOf('Paso 1');
    const editorIndex = studioMarkup.indexOf('Editor de fórmula', firstStepIndex);
    const selectedValueIndex = studioMarkup.indexOf('Valor seleccionado', editorIndex);
    const secondStepIndex = studioMarkup.indexOf('Paso 2', selectedValueIndex);
    const thirdStepIndex = studioMarkup.indexOf('Paso 3', secondStepIndex);
    const firstAddStepIndex = studioMarkup.indexOf('Agregar paso', thirdStepIndex);

    expect(studioMarkup).toContain('recipeStudioSection recipeStudioGeneralSection');
    expect(studioMarkup).toContain('recipeStudioSection recipeStudioSectionLight composePartsBuilder numericFormulaBuilderSection');
    expect(studioMarkup).toContain('recipeStudioSection composeTokenInspector composeTokenInspectorFlat numericFormulaInspector');
    expect(firstStepIndex).toBeGreaterThanOrEqual(0);
    expect(editorIndex).toBeGreaterThan(firstStepIndex);
    expect(selectedValueIndex).toBeGreaterThan(editorIndex);
    expect(secondStepIndex).toBeGreaterThan(selectedValueIndex);
    expect(thirdStepIndex).toBeGreaterThan(secondStepIndex);
    expect(firstAddStepIndex).toBeGreaterThan(thirdStepIndex);
    expect(studioMarkup.match(/Agregar paso/g)).toHaveLength(1);
    expect(studioMarkup.match(/numericFormulaAfterStep/g)).toHaveLength(2);
    expect(studioMarkup.indexOf('Condición', firstStepIndex)).toBeLessThan(editorIndex);
    expect(studioMarkup.indexOf('Define cuándo se aplica esta fórmula completa.', firstStepIndex)).toBeLessThan(editorIndex);
    expect(studioMarkup.indexOf('Decimales / redondeo', editorIndex)).toBeLessThan(selectedValueIndex);
    expect(studioMarkup.indexOf('numericFormulaBuilderSection')).toBeLessThan(studioMarkup.indexOf('numericFormulaInspector'));
    expect(studioMarkup).not.toContain('numericFormulaPanel');
  });

  it('places the numeric formula add-step action after the selected value block when there is a single step', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-formula-single-step-layout',
      label: 'Total',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'number',
        parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
        separator: '',
        steps: [{
          id: 'formula-step',
          mode: 'number',
          type: 'numericFormula',
          formula: {
            version: 1,
            expression: {
              kind: 'binary',
              operator: 'add',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-price' } },
              right: { kind: 'operand', operand: { type: 'fixedText', value: '10' } },
            },
          },
          rounding: 2,
        }],
      },
    });

    const selectedValueIndex = markup.indexOf('Valor seleccionado');
    const addStepIndex = markup.indexOf('Agregar paso', selectedValueIndex);

    expect(markup).toContain('numericFormulaStepFlow');
    expect(markup).toContain('numericFormulaAddStepActions');
    expect(selectedValueIndex).toBeGreaterThan(markup.indexOf('Editor de fórmula'));
    expect(addStepIndex).toBeGreaterThan(selectedValueIndex);
    expect(markup.match(/Agregar paso/g)).toHaveLength(1);
  });

  it('shows ten compact rows and the available total in compose preview', () => {
    const previewRows: InputRow[] = Array.from({ length: 20 }, (_, index) => ({
      rowNumber: index + 1,
      values: { 'input-name': `Producto ${index + 1}` },
    }));
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-preview-limit',
      label: 'Preview',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [{ id: 'part', type: 'input', inputColumnId: 'input-name' }],
        separator: '',
      },
    }, { manualRangeRows: previewRows });
    const tableStart = markup.indexOf('<table class="composePreviewTable">');
    const tableMarkup = markup.slice(tableStart, markup.indexOf('</table>', tableStart));

    expect(markup.indexOf('Vista previa del resultado')).toBeLessThan(markup.indexOf('Mostrando 10 filas desde la fila 1 de 20 filas del archivo.'));
    expect(tableMarkup.match(/<td>/g)).toHaveLength(20);
    expect(tableMarkup).toContain('composePreviewColumnRow');
    expect(tableMarkup).toContain('composePreviewColumnResult');
    expect(tableMarkup).not.toContain('style="width:15%"');
    expect(tableMarkup).not.toContain('style="width:85%"');
  });

  it('selects compose preview rows by real Excel row number without clamping to the last row', () => {
    const rows = [
      { rowNumber: '1', value: 'Uno' },
      { rowNumber: '50', value: 'Cincuenta' },
      { rowNumber: '52', value: 'Cincuenta y dos' },
      { rowNumber: '137', value: 'Ultima' },
    ];

    expect(getPreviewStartRowNumber('50')).toBe(50);
    expect(getPreviewRowsFromStart(rows, 1).map((row) => row.rowNumber)).toEqual(['1', '50', '52', '137']);
    expect(getPreviewRowsFromStart(rows, 50).map((row) => row.rowNumber)).toEqual(['50', '52', '137']);
    expect(getPreviewRowsFromStart(rows, 137).map((row) => row.rowNumber)).toEqual(['137']);
    expect(getPreviewRowsFromStart(rows, 180)).toEqual([]);
    expect(getComposePreviewCountText(0, 180, 137)).toBeNull();
    expect(getComposePreviewCountText(10, 50, 137)).toBe('Mostrando 10 filas desde la fila 50 de 137 filas del archivo.');
    expect(getComposePreviewCountText(10, 50, 137)).not.toContain('disponibles');
  });

  it('uses a neutral title while the initial source is only an empty technical default', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-unconfigured-title',
      label: 'Sin configurar',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
        separator: '',
        steps: [{ id: 'step', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: '' } }],
      },
    });

    expect(markup).toContain('Paso 1 · Sin configurar');
    expect(markup).not.toContain('Paso 1 · Usar valor tal cual');
    expect(markup).toContain('Acción');
    expect(markup).not.toContain('Qué valor usar');
  });

  it('shows per-step conditions for the selected compose part', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-conditions',
      label: 'Nombre final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [
          {
            id: 'part-product',
            type: 'input',
            inputColumnId: 'input-name',
            steps: [
              { id: 'step-1', type: 'noop' },
              { id: 'step-2', type: 'uppercase', condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty' } },
            ],
          },
        ],
        separator: '',
      },
    });

    expect(markup).toContain('Reglas y condiciones de esta parte');
    expect(markup).toContain('2 pasos · 1 con condicion');
    expect(markup).toContain('<td>Paso 1 · Usar columna de entrada</td>');
    expect(markup).toContain('<td>Aplicar siempre</td>');
    expect(markup).toContain('<td>Paso 2 · Mayúsculas</td>');
    expect(markup).toContain('<td>A No esta vacio</td>');
  });

  it('shows clear compose preview empty state when there are no parts', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-empty',
      label: 'Nombre final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [],
        separator: '',
      },
    });

    expect(markup).toContain('Agregá una parte para empezar.');
    expect(markup).toContain('Vista previa del resultado');
    expect(markup).toContain('Agregá una parte para ver la vista previa.');
  });

  it('adds and selects one safe default compose part', () => {
    const result = addComposeRecipePart({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
    }, inputColumns);

    expect(result.recipe.parts).toEqual([{
      id: result.selectedPartId,
      type: 'input',
      inputColumnId: '',
    }]);

    const withoutColumns = addComposeRecipePart({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
    }, []);
    expect(withoutColumns.recipe.parts).toEqual([{
      id: withoutColumns.selectedPartId,
      type: 'input',
      inputColumnId: '',
    }]);
  });

  it('characterizes compose part storage mode for legacy and step concat recipes', () => {
    const legacyRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'part-name', type: 'input', inputColumnId: 'input-name' }],
      separator: ' - ',
    };
    const stepConcatRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        mode: 'text',
        parts: [{ id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } }],
      }],
    };

    expect(getComposeRecipePartsStorageMode(legacyRecipe)).toBe('recipeParts');
    expect(getComposeRecipePartsStorageMode(stepConcatRecipe)).toBe('concatStepParts');
    expect(getComposeRecipePartsStorageMode({ ...stepConcatRecipe, steps: [{ ...stepConcatRecipe.steps![0], parts: [] }] })).toBe('recipeParts');
    expect(hasComposePreviousResultSource(legacyRecipe)).toBe(false);
    expect(hasComposePreviousResultSource(stepConcatRecipe)).toBe(true);
    expect(hasComposePreviousResultSource({ ...stepConcatRecipe, steps: [{ ...stepConcatRecipe.steps![0], parts: [] }] })).toBe(false);
  });

  it('updates legacy compose recipe parts without migrating storage', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [
        { id: 'part-name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
        { id: 'part-text', type: 'text', value: 'Manual' },
      ],
      separator: '',
    };
    const nextParts = [
      { id: 'part-text', type: 'text' as const, value: 'Manual', steps: [{ id: 'upper', type: 'uppercase' as const }] },
      { id: 'part-name', type: 'input' as const, inputColumnId: 'input-name' },
    ];

    const updated = applyComposeRecipePartsUpdate(recipe, nextParts);

    expect(updated.parts).toEqual(nextParts);
    expect(updated.steps).toBeUndefined();
    expect(updated.separator).toBe('');
    expect(updated.customMode).toBe('concat');
    expect(buildCombinePreview(updated, { 'input-name': 'Pincel' })).toBe('MANUALPincel');
  });

  it('updates step concat recipe parts without migrating storage', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        mode: 'text',
        parts: [
          { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
          { id: 'part-text', source: { type: 'fixedText', value: 'Manual' }, separatorBefore: ' - ' },
        ],
      }],
    };
    const nextParts = [
      { id: 'part-text', type: 'text' as const, value: 'Manual', steps: [{ id: 'upper', type: 'uppercase' as const }] },
      { id: 'part-name', type: 'input' as const, inputColumnId: 'input-name', separatorAfter: ' / ' },
    ];

    const updated = applyComposeRecipePartsUpdate(recipe, nextParts);

    expect(updated.parts).toEqual([]);
    expect(updated.steps?.[0]).toMatchObject({
      id: 'concat-step',
      type: 'concat',
      parts: [
        { id: 'part-text', source: { type: 'fixedText', value: 'Manual' }, steps: [{ id: 'upper', type: 'uppercase' }] },
        { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
      ],
    });
    expect(updated.customMode).toBe('concat');
    expect(buildCustomValuePreview(updated, { 'input-name': 'Pincel' })).toBe('MANUALPincel');
  });

  it('keeps step concat storage when adding and reordering compose parts', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        mode: 'text',
        parts: [
          { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
          { id: 'part-fixed', source: { type: 'fixedText', value: 'Manual' }, separatorBefore: ' - ' },
        ],
      }],
    };

    const added = addComposeRecipePart(recipe, inputColumns);
    expect(added.recipe.parts).toEqual([]);
    expect(added.recipe.steps?.[0].parts).toHaveLength(3);
    expect(added.recipe.steps?.[0].parts?.[2]).toMatchObject({
      id: added.selectedPartId,
      source: { type: 'input', inputColumnId: '' },
    });

    const reordered = reorderComposeRecipeParts(recipe, ['part-fixed', 'part-name']);
    expect(reordered.parts).toEqual([]);
    expect(reordered.steps?.[0].parts?.map((part) => part.id)).toEqual(['part-fixed', 'part-name']);
    expect(buildCustomValuePreview(reordered, { 'input-name': 'Pincel' })).toBe('ManualPincel');
  });

  it('reads compose parts and concat parts from legacy storage by id', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [
        { id: 'part-name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
        { id: 'part-text', type: 'text', value: 'Manual', steps: [{ id: 'trim', type: 'trim' }] },
      ],
      separator: '',
    };

    expect(getComposeRecipePartsFromStorage(recipe)).toEqual(recipe.parts);
    expect(getComposeConcatPartFromStorage(recipe, 'part-name')).toEqual({
      id: 'part-name',
      source: { type: 'input', inputColumnId: 'input-name' },
    });
    expect(getComposeConcatPartFromStorage(recipe, 'part-text')).toEqual({
      id: 'part-text',
      source: { type: 'fixedText', value: 'Manual' },
      steps: [{ id: 'trim', type: 'trim' }],
    });
    expect(getComposeConcatPartFromStorage(recipe, 'missing')).toBeUndefined();
  });

  it('reads compose parts and concat parts from step concat storage by id', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        mode: 'text',
        parts: [
          { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
          { id: 'part-fixed', source: { type: 'fixedText', value: 'Manual' }, separatorBefore: ' - ', steps: [{ id: 'upper', type: 'uppercase' }] },
        ],
      }],
    };

    expect(getComposeRecipePartsFromStorage(recipe)).toEqual([
      { id: 'part-name', type: 'input', inputColumnId: 'input-name' },
      { id: 'part-fixed', type: 'text', value: 'Manual', steps: [{ id: 'upper', type: 'uppercase' }] },
    ]);
    expect(getComposeConcatPartFromStorage(recipe, 'part-fixed')).toEqual({
      id: 'part-fixed',
      source: { type: 'fixedText', value: 'Manual' },
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
    expect(getComposeConcatPartFromStorage(recipe, 'missing')).toBeUndefined();
  });

  it('updates one legacy compose concat part by id while preserving legacy separators and preview', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [
        { id: 'part-name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
        { id: 'part-text', type: 'text', value: 'Manual' },
      ],
      separator: '',
    };

    const updated = applyComposeConcatPartUpdate(recipe, 'part-name', {
      id: 'part-name',
      source: { type: 'fixedText', value: 'nuevo' },
      steps: [{ id: 'upper', type: 'uppercase' }],
    });

    expect(updated.parts).toEqual([
      { id: 'part-name', type: 'text', value: 'nuevo', steps: [{ id: 'upper', type: 'uppercase' }], separatorAfter: ' - ' },
      { id: 'part-text', type: 'text', value: 'Manual' },
    ]);
    expect(updated.steps).toBeUndefined();
    expect(buildCombinePreview(updated, { 'input-name': 'Pincel' })).toBe('NUEVO - Manual');
  });

  it('updates one step concat part by id while preserving modern storage and preview', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        mode: 'text',
        parts: [
          { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
          { id: 'part-fixed', source: { type: 'fixedText', value: 'manual' }, separatorBefore: ' - ' },
        ],
      }],
    };

    const updated = applyComposeConcatPartUpdate(recipe, 'part-fixed', {
      id: 'part-fixed',
      source: { type: 'fixedText', value: 'manual' },
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });

    expect(updated.parts).toEqual([]);
    expect(updated.steps?.[0].parts).toEqual([
      { id: 'part-name', source: { type: 'input', inputColumnId: 'input-name' } },
      { id: 'part-fixed', source: { type: 'fixedText', value: 'manual' }, separatorBefore: ' - ', steps: [{ id: 'upper', type: 'uppercase' }] },
    ]);
    expect(buildCustomValuePreview(updated, { 'input-name': 'Pincel' })).toBe('Pincel - MANUAL');
  });

  it('renders a text compose part with fixed text input by default', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-text-piece',
      label: 'Nombre final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [{ id: 'part-text', type: 'text', value: 'Manual' }],
        separator: '',
      },
    });

    expect(markup).toContain('Parte seleccionada');
    expect(markup).toContain('Paso 1 · Usar texto fijo');
    expect(markup).toContain('Usar texto fijo');
    expect(markup).toContain('<span>Texto fijo</span>');
    expect(markup).toContain('value="Manual"');
    expect(markup).not.toContain('<span>Columna de entrada</span>');
  });

  it('keeps previous result out of the first concat-part step and available in later steps', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-previous-result',
      label: 'Pasos',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [{
          id: 'part',
          type: 'input',
          inputColumnId: 'input-code',
          steps: [
            { id: 'base', mode: 'text', type: 'noop' },
            { id: 'next', mode: 'text', type: 'noop' },
          ],
        }],
        separator: '',
      },
    });

    const firstStep = markup.slice(markup.indexOf('Paso 1'), markup.indexOf('Paso 2'));
    expect(firstStep).not.toContain('Usar resultado anterior');
    expect(markup).toContain('Paso 2 · Sin configurar');
    expect(markup).toContain('concatPartStepDivider');
  });

  it('renders useful previous-result transforms with the same additional-step structure outside concat', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-general-previous-result',
      label: 'Pasos generales',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'base-step', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
          { id: 'upper-step', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        ],
      },
    });

    expect(markup).toContain('concatPartStepDivider');
    expect(markup).toContain('Paso 2');
    expect(markup).toContain('Convertir a mayúsculas');
    expect(markup).toContain('Usar resultado anterior');
    expect(markup).toContain('Eliminar paso');
    expect(markup.match(/Agregar paso/g)).toHaveLength(2);
    expect(markup.indexOf('Paso 1')).toBeLessThan(markup.indexOf('Agregar paso'));
    expect(markup.indexOf('Agregar paso')).toBeLessThan(markup.indexOf('Paso 2'));
    expect(getTextStepActionOptions(true).map((option) => option.label)).not.toContain('Usar resultado anterior');
    expect(getStepValueSourceOptions(inputColumns, 'text', true, true).map((option) => option.label)).toContain('Usar resultado anterior');
  });

  it('limits new text transformer source options to input and previous result', () => {
    expect(getStepValueSourceOptions(inputColumns, 'text', false, true, {
      allowedSources: ['input'],
    }).map((option) => option.label)).toEqual(['A', 'D - Nombre', 'F - Presentacion', 'AN - Precio']);

    expect(getStepValueSourceOptions(inputColumns, 'text', true, true, {
      allowedSources: ['previousResult', 'input'],
    }).map((option) => option.label)).toEqual(['Usar resultado anterior', 'A', 'D - Nombre', 'F - Presentacion', 'AN - Precio']);

    expect(getStepValueSourceOptions(inputColumns, 'text', true, true, {
      allowedSources: ['previousResult', 'input'],
    }).map((option) => option.label)).not.toContain('Texto fijo');
    expect(getStepValueSourceOptions(inputColumns, 'text', true, true, {
      allowedSources: ['previousResult', 'input'],
    }).map((option) => option.label)).not.toContain('Elegir texto desde celda');
  });

  it('can preserve the current fixed text source for legacy text transformers', () => {
    expect(getStepValueSourceOptions(inputColumns, 'text', false, true, {
      allowedSources: ['input', 'fixedText'],
      fixedTextLabel: 'Texto fijo actual',
    }).map((option) => option.label)).toEqual(['A', 'D - Nombre', 'F - Presentacion', 'AN - Precio', 'Texto fijo actual']);
  });

  it('keeps legacy follow-up source replacements visible and evaluable', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'first', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'A' } },
        { id: 'legacy-overwrite', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'B' } },
      ],
    };
    const markup = renderRecipeEditorMarkup({
      id: 'output-legacy-overwrite',
      label: 'Legacy overwrite',
      order: 0,
      enabled: true,
      recipe,
    });

    expect(markup).toContain('Paso 2 · Usar texto fijo');
    expect(markup).toContain('value="B"');
    expect(buildCustomValuePreview(recipe, { 'input-code': 'base' }, true, 'text')).toBe('B');
  });

  it('uses a clear, compact date fallback field', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-date-fallback',
      label: 'Fecha formateada',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: 'date',
          mode: 'date',
          type: 'formatDate',
          source: { type: 'input', inputColumnId: 'input-code' },
          dateInvalidFallback: 'fixedText',
          dateInvalidFallbackText: 'Sin fecha',
        }],
      },
    });

    expect(markup).toContain('Texto si no es fecha válida');
    expect(markup).toContain('Qué fecha usar');
    expect(markup).toContain('Paso 1 · Formatear fecha');
    expect(markup).toContain('value="Sin fecha"');
    expect(markup).toContain('class="field compact recipeField"><span>Texto si no es fecha válida</span>');
    expect(markup).not.toContain('Texto fallback');
  });

  it('renders custom date output format controls for loaded custom recipes', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [{
        id: 'date',
        mode: 'date',
        type: 'formatDate',
        source: { type: 'input', inputColumnId: 'input-code' },
        dateOutputFormat: 'MM-DD-YYYY',
      }],
    };
    const markup = renderRecipeEditorMarkup({
      id: 'output-custom-date',
      label: 'Fecha custom',
      order: 0,
      enabled: true,
      recipe,
    });

    expect(markup).toContain('Personalizado');
    expect(markup).toContain('Formato personalizado');
    expect(markup).toContain('Bloque 1');
    expect(markup).toContain('Bloque 2');
    expect(markup).toContain('Bloque 3');
    expect(markup).toContain('Separador 1');
    expect(markup).toContain('Separador 2');
    expect(markup).toContain('MM');
    expect(markup).toContain('DD');
    expect(markup).toContain('AAAA');
    expect(markup).not.toContain('value="MM-DD-YYYY"');
    expect(markup).not.toContain('Ejemplo: MM-DD-YYYY.');
    expect(buildCustomValuePreview(recipe, { 'input-code': '31/12/2025' }, true, 'text')).toBe('12-31-2025');
  });

  it('shows a clear custom date output format error', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-invalid-custom-date',
      label: 'Fecha custom',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: 'date',
          mode: 'date',
          type: 'formatDate',
          source: { type: 'input', inputColumnId: 'input-code' },
          dateOutputFormat: 'mm-dd-yyyy',
        }],
      },
    });

    expect(markup).toContain('Personalizado');
    expect(markup).toContain('Formato personalizado');
    expect(markup).toContain('infoTooltipTrigger');
    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('Advertencia: formato personalizado inválido');
    expect(markup.indexOf('infoTooltipTrigger')).toBeLessThan(markup.indexOf('warningTooltipTrigger'));
    expect(markup).not.toContain('aria-invalid="true"');
    expect(markup).not.toContain('errorText');
  });

  it('renders custom date output controls inside range value recipes', () => {
    const markup = renderRangeValueEditor({
      id: 'range-custom-date',
      startRowNumber: 8,
      endRowNumber: 10,
      valueRecipe: {
        source: { type: 'input', inputColumnId: 'input-code' },
        steps: [{
          id: 'date',
          mode: 'date',
          type: 'formatDate',
          dateInputFormat: 'DD/MM/YYYY',
          dateOutputFormat: 'DD.MM.YYYY',
        }],
      },
    }, {
      manualRangeRows: [{ rowNumber: 8, values: { 'input-code': '31/12/2025' } }],
    });

    expect(markup).toContain('Personalizado');
    expect(markup).toContain('Formato personalizado');
    expect(markup).toContain('Bloque 1');
    expect(markup).toContain('Separador 1');
    expect(markup).toContain('AAAA');
    expect(markup).not.toContain('value="DD.MM.YYYY"');
  });

  it('renders conversion fallback controls only when a fixed fallback is selected', () => {
    const fixedFallbackMarkup = renderRecipeEditorMarkup({
      id: 'output-conversion-fallback',
      label: 'Numero convertido',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: 'to-number',
          mode: 'conversion',
          type: 'toNumber',
          source: { type: 'input', inputColumnId: 'input-code' },
          conversionInvalidFallback: 'fixedText',
          conversionInvalidFallbackText: '0',
        }],
      },
    });
    const originalFallbackMarkup = renderRecipeEditorMarkup({
      id: 'output-conversion-original',
      label: 'Numero convertido',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{
          id: 'extract',
          mode: 'conversion',
          type: 'extractNumber',
          source: { type: 'input', inputColumnId: 'input-code' },
        }],
      },
    });

    expect(fixedFallbackMarkup).toContain('Si no se puede obtener un número');
    expect(fixedFallbackMarkup).toContain('Usar valor fijo');
    expect(fixedFallbackMarkup).toContain('Valor fallback');
    expect(fixedFallbackMarkup).toContain('value="0"');
    expect(originalFallbackMarkup).toContain('Si no se puede obtener un número');
    expect(originalFallbackMarkup).toContain('Conservar valor original');
    expect(originalFallbackMarkup).not.toContain('Valor fallback');
  });

  it('renders typed source UX for number and date values without new recipe shapes', () => {
    const numericMarkup = renderRecipeEditorMarkup({
      id: 'output-number-source',
      label: 'Número',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'number',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
        separator: '',
        steps: [{ id: 'number', mode: 'number', type: 'noop', source: { type: 'fixedText', value: '12.5' } }],
      },
    }, { manualRangeRows });
    const dateMarkup = renderRecipeEditorMarkup({
      id: 'output-date-source',
      label: 'Fecha',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{ id: 'date', mode: 'date', type: 'noop', source: { type: 'fixedText', value: '2026-06-28' } }],
      },
    }, { manualRangeRows });

    expect(numericMarkup).toContain('Usar número fijo');
    expect(numericMarkup).not.toContain('Qué valor usar');
    expect(numericMarkup).toContain('Valor fijo');
    expect(numericMarkup).toContain('type="number"');
    expect(dateMarkup).toContain('Usar fecha fija');
    expect(dateMarkup).not.toContain('Qué fecha usar');
    expect(dateMarkup).toContain('Fecha fija');
    expect(dateMarkup).toContain('type="date"');
    expect(getStepValueSourceOptions(inputColumns, 'number', false).map((option) => option.label)).toEqual([
      'A', 'D - Nombre', 'F - Presentacion', 'AN - Precio', 'Valor fijo', 'Elegir valor desde celda',
    ]);
    expect(getStepValueSourceOptions(inputColumns, 'date', false).map((option) => option.label)).toEqual([
      'A', 'D - Nombre', 'F - Presentacion', 'AN - Precio', 'Fecha fija', 'Elegir fecha desde celda',
    ]);
    expect(getNumericStepTypeFromSelection('')).toEqual({ type: 'noop' });
    expect(getNumericStepTypeFromSelection('add')).toEqual({ type: 'numericOperation', operation: 'add' });
  });

  it('renders number and date pickers as fixed selections from existing rows', () => {
    const textPicker = renderToStaticMarkup(
      <StepSourceFields
        source={{ type: 'fixedText', value: '' }}
        inputColumns={inputColumns.slice(0, 1)}
        inputRows={[{ rowNumber: 1, values: { 'input-code': '   ' } }]}
        allowPreviousResult={false}
        valueKind="text"
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );
    const numericPicker = renderToStaticMarkup(
      <StepSourceFields
        label="Qué valor usar"
        source={{ type: 'fixedText', value: '10' }}
        inputColumns={inputColumns}
        inputRows={manualRangeRows}
        allowPreviousResult={false}
        valueKind="number"
        fixedTextInputType="number"
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );
    const datePicker = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'fixedText', value: '2026-06-28' }}
        inputColumns={inputColumns}
        inputRows={[{ rowNumber: 1, values: { 'input-code': '2026-06-28' } }]}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );
    const mixedDatePicker = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'fixedText', value: '2026-06-28' }}
        inputColumns={inputColumns.slice(0, 1)}
        inputRows={[
          { rowNumber: 1, values: { 'input-code': 'no-es-fecha' } },
          { rowNumber: 2, values: { 'input-code': '2026-06-28' } },
        ]}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );
    const invalidDatePicker = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'fixedText', value: '' }}
        inputColumns={inputColumns.slice(0, 1)}
        inputRows={[{ rowNumber: 1, values: { 'input-code': 'no-es-fecha' } }]}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );

    expect(textPicker).toContain('Valores no válidos');
    expect(textPicker).not.toContain('No hay textos disponibles');
    expect(textPicker).toContain('warningTooltipTrigger');
    expect(textPicker).toContain('aria-label="Aviso de compatibilidad"');
    expect(textPicker).toContain('disabled=""');
    expect(textPicker).toContain('dropdownSearchableControl-disabled');
    expect(numericPicker).toContain('Buscar valores en');
    expect(numericPicker).toContain('Valor encontrado');
    expect(numericPicker).toContain('disabled=""');
    expect(numericPicker).toContain('dropdownSearchableControl-disabled');
    expect(datePicker).toContain('Buscar fechas en');
    expect(datePicker).toContain('Fecha encontrada');
    expect(mixedDatePicker).not.toContain('Se omitieron valores que no parecen fechas válidas.');
    expect(mixedDatePicker).toContain('warningTooltipTrigger');
    expect(mixedDatePicker).toContain('aria-label="Aviso de compatibilidad"');
    expect(mixedDatePicker).not.toContain('columnValuePickerHelp');
    expect(datePicker.match(/dropdownField compact recipeField/g)).toHaveLength(3);
    expect(datePicker).not.toContain('manualRangeValueDetailField');
    expect(invalidDatePicker).toContain('Valores no válidos');
    expect(invalidDatePicker).not.toContain('No hay fechas válidas disponibles');
    expect(invalidDatePicker).toContain('warningTooltipTrigger');
    expect(invalidDatePicker).toContain('aria-label="Aviso de compatibilidad"');
    expect(invalidDatePicker).toContain('disabled=""');
    expect(invalidDatePicker).toContain('dropdownSearchableControl-disabled');
  });

  it('filters format-date cell choices with the same parser used by its handler', () => {
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': '28/06/2026' } },
      { rowNumber: 2, values: { 'input-code': 'PINCELES' } },
      { rowNumber: 3, values: { 'input-code': '2026-06-28' } },
    ];
    const acceptsFormatDateValue = (value: string) => Boolean(getDatePickerValue(value, 'DD/MM/YYYY'));
    const markup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'fixedText', value: '28/06/2026' }}
        inputColumns={inputColumns.slice(0, 1)}
        inputRows={rows}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        dateValueValidator={acceptsFormatDateValue}
        columnTextPickerOpen
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Fecha encontrada');
    expect(markup).not.toContain('Se omitieron valores que no parecen fechas válidas.');
    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('aria-label="Aviso de compatibilidad"');
    expect(markup).not.toContain('columnValuePickerHelp');
    expect(getUniqueColumnTextOptions(rows, 'input-code', acceptsFormatDateValue)).toEqual([
      { value: '28/06/2026', label: '28/06/2026' },
      { value: '2026-06-28', label: '2026-06-28' },
    ]);
  });

  it('rejects an invalid format-date handler value with visible feedback instead of clearing it', () => {
    expect(getFormatDateSourceSelection('PINCELES', 'DD/MM/YYYY')).toEqual({
      accepted: false,
      warning: 'Ese valor no parece una fecha válida.',
    });
    expect(getFormatDateSourceSelection('28/06/2026', 'DD/MM/YYYY')).toEqual({
      accepted: true,
      sourceValue: '2026-06-28',
      dateInputFormat: 'YYYY-MM-DD',
    });
    expect(getFormatDateSourceSelection('28/06/2026', 'DD/MM/YYYY', true)).toEqual({
      accepted: true,
      sourceValue: '28/06/2026',
      dateInputFormat: 'DD/MM/YYYY',
    });
  });

  it('explains a legacy invalid selected date instead of failing silently', () => {
    const markup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'fixedText', value: 'no-es-fecha' }}
        inputColumns={inputColumns.slice(0, 1)}
        inputRows={[
          { rowNumber: 1, values: { 'input-code': 'no-es-fecha' } },
          { rowNumber: 2, values: { 'input-code': '2026-06-28' } },
        ]}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('aria-label="Este valor no parece una fecha válida. Valor guardado: no-es-fecha"');
    expect(markup).not.toContain('columnValuePickerWarning');
    expect(markup).not.toContain('>no-es-fecha</button>');
  });

  it('explains when typed source selectors hide incompatible columns', () => {
    const typedColumns: InputColumn[] = [
      { id: 'text', columnIndex: 0, columnLetter: 'A', label: 'A', active: true, sampleValues: ['ACCESORIOS'], nonEmptyCount: 1 },
      { id: 'number', columnIndex: 1, columnLetter: 'B', label: 'B', active: true, sampleValues: ['123'], nonEmptyCount: 1 },
      { id: 'date', columnIndex: 2, columnLetter: 'C', label: 'C', active: true, sampleValues: ['2026-06-28'], nonEmptyCount: 1 },
    ];
    const numberMarkup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué valor usar"
        source={{ type: 'input', inputColumnId: 'number' }}
        inputColumns={typedColumns}
        allowPreviousResult={false}
        valueKind="number"
        fixedTextInputType="number"
        onChange={() => undefined}
      />,
    );
    const dateMarkup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué fecha usar"
        source={{ type: 'input', inputColumnId: 'date' }}
        inputColumns={typedColumns}
        allowPreviousResult={false}
        valueKind="date"
        fixedTextInputType="date"
        onChange={() => undefined}
      />,
    );
    const noCompatibleMarkup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué valor usar"
        source={{ type: 'fixedText', value: '' }}
        inputColumns={[typedColumns[0]]}
        allowPreviousResult={false}
        valueKind="number"
        fixedTextInputType="number"
        onChange={() => undefined}
      />,
    );

    expect(numberMarkup).not.toContain('No se muestran algunas columnas porque no contienen valores numéricos compatibles.');
    expect(numberMarkup).toContain('warningTooltipTrigger');
    expect(numberMarkup).toContain('aria-label="Aviso de compatibilidad"');
    expect(numberMarkup).not.toContain('compatibilityHint');
    expect(dateMarkup).not.toContain('No se muestran algunas columnas porque Pandora no detectó valores de fecha compatibles.');
    expect(dateMarkup).toContain('warningTooltipTrigger');
    expect(dateMarkup).toContain('aria-label="Aviso de compatibilidad"');
    expect(dateMarkup).not.toContain('compatibilityHint');
    expect(noCompatibleMarkup).not.toContain('No hay columnas compatibles para esta operación.');
    expect(noCompatibleMarkup).toContain('warningTooltipTrigger');
    expect(noCompatibleMarkup).toContain('aria-label="Aviso de compatibilidad"');
    expect(noCompatibleMarkup).not.toContain('compatibilityHint');
    expect(getCompatibleStepValueInputColumns(typedColumns, 'date').map((column) => column.id)).toEqual(['date']);
    expect(getCompatibleStepValueInputColumns(typedColumns, 'number').map((column) => column.id)).toEqual(['number']);
  });

  it('keeps ordinary text cell choices unfiltered', () => {
    expect(getUniqueColumnTextOptions([
      { rowNumber: 1, values: { 'input-code': 'PINCELES' } },
      { rowNumber: 2, values: { 'input-code': 'LISTA DE PRECIOS' } },
    ], 'input-code')).toEqual([
      { value: 'PINCELES', label: 'PINCELES' },
      { value: 'LISTA DE PRECIOS', label: 'LISTA DE PRECIOS' },
    ]);
  });

  it('labels compose parts from their real configuration and explains visual states', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-labels',
      label: 'Partes',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [
          { id: 'missing', type: 'input', inputColumnId: '' },
          { id: 'column', type: 'input', inputColumnId: 'input-code' },
          { id: 'fixed', type: 'text', value: ' - ' },
          { id: 'advanced', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'upper', type: 'uppercase' }] },
          { id: 'advanced-many', type: 'input', inputColumnId: 'input-pack', steps: [{ id: 'upper-pack', type: 'uppercase' }, { id: 'trim-pack', type: 'trim' }] },
        ],
        separator: '',
      },
    });

    expect(markup).toContain('Parte 1');
    expect(markup).toContain('Sin configurar');
    expect(markup).toContain('title="Falta seleccionar origen"');
    expect(markup).toContain('compositionTokenCard compositionToken-warning');
    expect(markup).toContain('Dato de Excel');
    expect(markup).toContain('Columna A');
    expect(markup).toContain('Texto fijo');
    expect(markup).toContain('&quot; - &quot;');
    expect(markup).toContain('title="Fuente: Columna D. Esta parte usa pasos avanzados"');
    expect(markup).toContain('2 pasos configurados');
    expect(markup).toContain('3 pasos configurados');
    expect(markup).not.toContain('1 paso: Mayúsculas');
    expect(markup).not.toContain('Mayúsculas · Limpiar espacios');
    expect(markup).toContain('compositionTokenCard compositionToken-input');
  });

  it('labels text selected from a column without changing recipe data', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-column-text',
      label: 'Texto elegido',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [],
        separator: '',
        steps: [{
          id: 'concat',
          mode: 'text',
          type: 'concat',
          parts: [{
            id: 'picked',
            source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
          }],
        }],
      },
    });

    expect(markup).toContain('Texto elegido');
    expect(markup).toContain('PINCELES SERIE 304');
    expect(markup).not.toContain('Fragmento avanzado');
  });

  it('builds compact column-text options for compose text pieces', () => {
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': '  PINCELES SERIE 304  ', 'input-pack': '' } },
      { rowNumber: 2, values: { 'input-name': '', 'input-pack': '20L' } },
      { rowNumber: 3, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '10L' } },
      { rowNumber: 4, values: { 'input-name': 'RODILLO SIMIL LANA', 'input-pack': '20L' } },
    ];

    expect(getComposeColumnTextOptions(rows, 'input-name')).toEqual(['PINCELES SERIE 304', 'RODILLO SIMIL LANA']);
    expect(getComposeColumnTextOptions([], 'input-name', { 'input-name': '  MUESTRA  ' })).toEqual(['MUESTRA']);
    expect(getComposeColumnTextOptions(rows, 'input-code')).toEqual([]);
  });

  it('keeps a picked compose column text as fixed text recipe data', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'part-text', type: 'text', value: '' }],
      separator: '',
    };

    const nextRecipe = updateComposeColumnTextSelection(recipe, 'part-text', 'PINCELES SERIE 304');

    expect(nextRecipe.parts).toEqual([{ id: 'part-text', type: 'text', value: 'PINCELES SERIE 304' }]);
  });

  it('clears compose column text selection when the next column does not contain it', () => {
    expect(getComposeValidColumnTextSelection(' PINCELES SERIE 304 ', ['PINCELES SERIE 304'])).toBe('PINCELES SERIE 304');
    expect(getComposeValidColumnTextSelection('PINCELES SERIE 304', ['RODILLO SIMIL LANA'])).toBe('');
  });

  it('keeps compose source fields and drag handle on the compact card pattern', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-card-pattern',
      label: 'Nombre final',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [{ id: 'part-text', type: 'text', value: 'Manual' }],
        separator: '',
      },
    });

    expect(markup).not.toContain('composeTokenPrimaryFields');
    expect(markup).toContain('stepDetailPanel');
    expect(markup).toContain('simpleCustomValueGrid');
    expect(markup).toContain('field compact');
    expect(markup).toContain('dropdownField compact');
    expect(markup).toContain('compositionTokenCard');
    expect(markup).toContain('class="dragHandle"');
    expect(markup).toContain('actionButton-iconOnly');
  });

  it('routes existing range recipes directly without the removed mode header', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-ranges',
      label: 'Rangos',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [
          {
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: { source: { type: 'fixedText', value: 'Cerda china mango amarillo' }, steps: [] },
          },
        ],
      },
    });

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).not.toContain('Avanzado');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
    expect(markup).toContain('Valores por rangos');
    expect(markup).toContain('Cerda china mango amarillo');
  });

  it('prepares a recipe for each studio sidebar mode', () => {
    const advancedRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      parts: [],
      separator: '',
      steps: [{ id: 'advanced-step', type: 'addPrefix', value: 'SKU-' }],
    };

    expect(getRecipeStudioMode(createRecipeForStudioMode('takeValue', advancedRecipe, inputColumns))).toBe('takeValue');
    expect(getRecipeStudioMode(createRecipeForStudioMode('fixedText', advancedRecipe, inputColumns))).toBe('fixedText');
    expect(getRecipeStudioMode(createRecipeForStudioMode('compose', advancedRecipe, inputColumns))).toBe('compose');
    expect(createRecipeForStudioMode('ranges', advancedRecipe, inputColumns)).toEqual({ type: 'manualRange', ranges: [] });
  });

  it('renders empty range recipes directly, without a mode header', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-empty-ranges',
      label: 'Rangos',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges: [] },
    });

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).not.toContain('Avanzado');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
    expect(markup).toContain('Valores por rangos');
    expect(markup).toContain('Cancelar');
    expect(markup).toContain('Aplicar');
  });

  it('reorders compose parts without changing part data', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [
        { id: 'part-name', type: 'input', inputColumnId: 'input-name' },
        { id: 'part-text', type: 'text', value: ' - ' },
        { id: 'part-price', type: 'input', inputColumnId: 'input-price' },
      ],
      separator: '',
    };

    const reordered = reorderComposeRecipeParts(recipe, ['part-price', 'part-name', 'part-text']);

    expect(reordered.parts.map((part) => part.id)).toEqual(['part-price', 'part-name', 'part-text']);
    expect(reordered.parts).toContainEqual({ id: 'part-text', type: 'text', value: ' - ' });
    expect(reordered.parts).toContainEqual({ id: 'part-price', type: 'input', inputColumnId: 'input-price' });
  });

  it('keeps numeric input columns as simple compose tokens', () => {
    const numberRecipe = buildSimpleCustomValueRecipe('number', 'input-price', { id: 'number-step', type: 'noop' });
    const composeRecipe = createRecipeForStudioMode('compose', numberRecipe, inputColumns);

    expect(composeRecipe.type).toBe('combine');
    if (composeRecipe.type !== 'combine') return;
    expect(composeRecipe.customMode).toBe('concat');
    expect(composeRecipe.parts).toContainEqual(expect.objectContaining({ type: 'input', inputColumnId: 'input-price' }));

    const markup = renderRecipeEditorMarkup({
      id: 'output-compose-number',
      label: 'Precio texto',
      order: 0,
      enabled: true,
      recipe: composeRecipe,
    });

    expect(markup).toContain('Columna AN');
    expect(markup).toContain('Dato de Excel');
    expect(markup).not.toContain('Fragmento avanzado');
  });

  it('does not add mode navigation around the existing range editor', () => {
    const column: OutputColumn = {
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges: [] },
    };

    const markup = renderRecipeEditorMarkup(column);

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
    expect(markup).toContain('Valores por rangos');
    expect(markup).not.toContain('Generar desde textos');
    expect(markup).not.toContain('Generar rangos sugeridos');
  });

  it('renders manual range details without the removed studio navigation', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges: [] },
    });

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).not.toContain('Asignar por rangos');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
    expect(markup).toContain('Valores por rangos');
    expect(markup).not.toContain('Ayuda: valores por rangos');
    expect(markup).not.toContain('<p class="muted">Asigná un valor distinto según el rango de filas reales del Excel.</p>');
  });

  it('shows manual range usage help only in the title info icon', () => {
    const manualRangeMarkup = renderRecipeEditorMarkup({
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges: [] },
    });
    const directMarkup = renderRecipeEditorMarkup({
      id: 'output-direct',
      label: 'Directa',
      order: 0,
      enabled: true,
      recipe: { type: 'direct', inputColumnId: 'input-code' },
    });

    expect(manualRangeMarkup).not.toContain('>Info</button>');
    expect(manualRangeMarkup).not.toContain('manualRangeInfoChip');
    expect(manualRangeMarkup).not.toContain('Usá rangos para completar datos contextuales que aplican a varias filas.');
    expect(manualRangeUsageHelpText).toBe('Los rangos sirven cuando un valor debe repetirse en varias filas. Si el valor ya está en cada fila, usá una columna de entrada.');
    expect(directMarkup).not.toContain('Ayuda: valores por rangos');
  });

  it('keeps existing range actions inside the direct editor', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueRecipe: expectedEmptyRangeValueRecipe() }],
      },
    });

    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
    expect(markup).not.toContain('Borrar rangos');
  });

  it('clears all manual ranges without changing the rest of the recipe', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      condition: { inputColumnId: 'input-name', operator: 'isNotEmpty' },
      ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueRecipe: expectedEmptyRangeValueRecipe() }],
    };
    const nextRecipe = clearManualRangeValues(recipe);
    const markup = renderRecipeEditorMarkup({
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: nextRecipe,
    });

    expect(nextRecipe).toEqual({
      type: 'manualRange',
      condition: recipe.condition,
      ranges: [],
    });
    expect(markup).not.toContain('recipeStudioModeBar');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
    expect(markup).not.toContain('class="rangeStudio"');
  });

  it('defaults suggested range initial values to empty', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={() => undefined}
      />,
    );
    const detectedMarkup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialValueMode="detectedText"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Guardar como valor');
    expect(markup).toContain('Sin valor');
    expect(detectedMarkup).toContain('Usar valor detectado en la columna guía');
    expect(detectedMarkup).not.toContain('Usar nombre detectado');
  });

  it('renders compact suggested range generator controls with tooltip help', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Criterio para sugerir rangos');
    expect(markup).toContain('Cada dato inicia un rango');
    expect(markup).toContain('Buscar inicios de rango en');
    expect(markup).toContain('Cada celda con dato en la columna elegida crea un rango de una fila.');
    expect(markup).toContain('placeholder="Inicio"');
    expect(markup).toContain('placeholder="Fin"');
    expect(markup).not.toContain('Aceptar como grupo sólo si');
    expect(markup).not.toContain('El grupo llega hasta la última fila con dato en');
    expect(markup).not.toContain('Condición de grupo');
    expect(markup).not.toContain('Sin ajuste');
    expect(markup).not.toContain('Sin filtro');
    expect(markup).not.toContain('Incluir filas posteriores');
    expect(markup).toContain('Guardar como valor');
    expect(markup).toContain('Ayuda: generar rangos sugeridos');
    expect(markup).toContain('Ayuda: detectar rangos');
    expect(markup).not.toContain('Ayuda: aceptar como grupo');
    expect(markup).not.toContain('Ayuda: fin del grupo');
    expect(markup).toContain('Ayuda: guardar como valor');
    expect(markup).not.toContain('Configurá cómo detectar rangos y agregalos para revisarlos.');
    expect(markup).not.toContain('Pandora busca posibles rangos dentro del intervalo indicado usando la columna elegida.');
    expect(markup).not.toContain('no crea rangos nuevos');
    expect(markup).not.toContain('Opciones avanzadas');
    expect(manualRangeDetectionModeOptions).toEqual([
      { value: 'textStarts', label: 'Cada dato inicia un rango' },
      { value: 'dataBlocks', label: 'Bloques consecutivos con datos' },
    ]);
  });

  it('suggests one-row ranges for isolated guide values', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 42, values: { 'input-code': '100' } },
          { rowNumber: 44, values: { 'input-code': '200' } },
          { rowNumber: 46, values: { 'input-code': '300' } },
        ]}
        initialStartRowInput="40"
        initialEndRowInput="56"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('42-42: 100');
    expect(markup).toContain('44-44: 200');
    expect(markup).toContain('46-46: 300');
    expect(markup).not.toContain('42-43');
  });

  it('cuts data blocks when omitted Excel row numbers reveal empty rows', () => {
    const ranges = generateManualRangesFromDataBlocks([
      { rowNumber: 42, values: { 'input-code': '100' } },
      { rowNumber: 44, values: { 'input-code': '200' } },
      { rowNumber: 46, values: { 'input-code': '300' } },
    ], {
      dataColumnId: 'input-code',
      startRowNumber: 40,
      endRowNumber: 56,
      idFactory: () => 'range',
    });

    expect(ranges.map((range) => [range.startRowNumber, range.endRowNumber])).toEqual([
      [42, 42],
      [44, 44],
      [46, 46],
    ]);
  });

  it('renders column lookup value controls for suggested ranges', () => {
    const firstMarkup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialValueMode="firstValueInColumn"
        onChange={() => undefined}
      />,
    );
    const lastMarkup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialValueMode="lastValueInColumn"
        onChange={() => undefined}
      />,
    );

    expect(firstMarkup).toContain('Usar primer valor con datos de columna');
    expect(firstMarkup).toContain('Columna para tomar el valor');
    expect(firstMarkup).toContain('Ayuda: columna para tomar el valor');
    expect(lastMarkup).toContain('Usar último valor con datos de columna');
    expect(lastMarkup).toContain('Columna para tomar el valor');
  });

  it('renders a suggested range generator summary for text starts', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialStartRowInput="12"
        initialEndRowInput="33"
        initialValueMode="firstValueInColumn"
        initialValueColumnId="input-name"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('usará cada dato de A como inicio de un rango, desde la fila 12 hasta la fila 33');
    expect(markup).toContain('Cada rango termina antes del siguiente dato encontrado');
    expect(markup).toContain('primer valor con datos de D');
  });

  it('builds a suggested range generator summary with group filters and end adjustment', () => {
    const summary = buildManualRangeGeneratorSummary({
      detectionMode: 'textStarts',
      inputColumn: inputColumns[1],
      startRowInput: '12',
      endRowInput: '33',
      startFilterColumn: inputColumns[0],
      startFilterOperator: 'isEmpty',
      validRowsColumn: inputColumns[0],
      initialValueMode: 'firstValueInColumn',
      initialValueColumn: inputColumns[1],
      conditionSummary: 'A no está vacía',
    });

    expect(summary).toContain('usará cada dato de D como inicio de un rango, desde la fila 12 hasta la fila 33');
    expect(summary).toContain('Cada rango termina antes del siguiente dato encontrado');
    expect(summary).toContain('grupos donde A está vacía');
    expect(summary).toContain('última fila con dato en A');
    expect(summary).toContain('primer valor con datos de D');
    expect(summary).toContain('El valor se aplicará sólo a filas donde A no está vacía');
  });

  it('resolves empty generator bounds from first and last real dataset rows', () => {
    const rows: InputRow[] = [
      { rowNumber: 18, values: {} },
      { rowNumber: 4, values: {} },
      { rowNumber: 11, values: {} },
    ];

    expect(resolveManualRangeGeneratorRowBounds(rows, '', '')).toEqual({
      startRowNumber: 4,
      endRowNumber: 18,
    });
    expect(resolveManualRangeGeneratorRowBounds(rows, '7', '')).toEqual({
      startRowNumber: 7,
      endRowNumber: 18,
    });
    expect(resolveManualRangeGeneratorRowBounds(rows, '', '12')).toEqual({
      startRowNumber: 4,
      endRowNumber: 12,
    });
    expect(resolveManualRangeGeneratorRowBounds(rows, 'invalid', '')).toEqual({
      startRowNumber: undefined,
      endRowNumber: 18,
    });
  });

  it('describes empty generator bounds as start and end', () => {
    expect(getManualRangeGeneratorIntervalSummary('', '200')).toBe('desde el inicio hasta la fila 200');
    expect(getManualRangeGeneratorIntervalSummary('12', '')).toBe('desde la fila 12 hasta el final');
    expect(getManualRangeGeneratorIntervalSummary('', '')).toBe('desde el inicio hasta el final');
    expect(getManualRangeGeneratorIntervalSummary('12', '200')).toBe('desde la fila 12 hasta la fila 200');
  });

  it('uses the first available row when text-start generation has an empty start', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 5, values: { 'input-code': 'Inicio' } },
          { rowNumber: 8, values: { 'input-code': 'Siguiente' } },
          { rowNumber: 12, values: { 'input-code': 'Fuera' } },
        ]}
        initialStartRowInput=""
        initialEndRowInput="8"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('desde el inicio hasta la fila 8');
    expect(markup).toContain('5-5: Inicio');
    expect(markup).toContain('8-8: Siguiente');
    expect(markup).not.toContain('12-12: Fuera');
  });

  it('uses the last available row when data-block generation has an empty end', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 5, values: { 'input-code': 'Fuera' } },
          { rowNumber: 6, values: { 'input-code': 'Bloque A' } },
          { rowNumber: 7, values: { 'input-code': 'Bloque A' } },
          { rowNumber: 8, values: { 'input-code': '' } },
          { rowNumber: 10, values: { 'input-code': 'Bloque B' } },
        ]}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="6"
        initialEndRowInput=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('desde la fila 6 hasta el final');
    expect(markup).toContain('6-7');
    expect(markup).toContain('10-10');
  });

  it('uses the full available range when both generator bounds are empty', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 3, values: { 'input-code': 'Primero' } },
          { rowNumber: 9, values: { 'input-code': 'Último' } },
        ]}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('desde el inicio hasta el final');
    expect(markup).toContain('3-3: Primero');
    expect(markup).toContain('9-9: Último');
  });

  it('hides trailing rows controls and ignores legacy trailing values for text starts', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialTrailingRowCount={1}
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain('Incluir filas posteriores');
    expect(markup).not.toContain('Ayuda: incluir filas posteriores');
    expect(markup).not.toContain('Incluira 1 fila posterior al bloque');
    expect(markup).not.toContain('El rango incluira filas posteriores');
  });

  it('generates data blocks with trailing rows fixed at zero', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 8, values: { 'input-code': 'Bloque A' } },
          { rowNumber: 9, values: { 'input-code': '' } },
          { rowNumber: 10, values: { 'input-code': '' } },
          { rowNumber: 11, values: { 'input-code': 'Bloque B' } },
        ]}
        initialDetectionMode="dataBlocks"
        initialTrailingRowCount={1}
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain('Incluir filas posteriores');
    expect(markup).not.toContain('Incluira 1 fila posterior al bloque');
    expect(markup).toContain('8-8');
    expect(markup).not.toContain('8-9');
    expect(markup).toContain('11-11');
  });

  it('renders a suggested range generator summary for data blocks', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="8"
        initialEndRowInput="26"
        initialValueMode="lastValueInColumn"
        initialValueColumnId="input-name"
        initialTrailingRowCount={1}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('creará un rango por cada bloque consecutivo con datos en A, desde la fila 8 hasta la fila 26');
    expect(markup).toContain('Las filas consecutivas con datos forman un bloque. Una fila vacía corta el bloque.');
    expect(markup).not.toContain('Incluira 1 fila posterior al bloque');
    expect(markup).toContain('último valor con datos de D');
  });

  it('shows a useful warning when no suggested ranges are found', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="8"
        initialEndRowInput="10"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('No se encontraron rangos con esta');
    expect(markup).toContain('Revis');
    expect(markup).toContain('manualRangeGeneratorWarnings');
  });

  it('warns when many suggested ranges have one row', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-code': 'Grupo 1' } },
      { rowNumber: 9, values: { 'input-code': 'Grupo 2' } },
      { rowNumber: 10, values: { 'input-code': 'Grupo 3' } },
      { rowNumber: 11, values: { 'input-code': 'Grupo 4' } },
    ];
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={rows}
        initialStartRowInput="8"
        initialEndRowInput="15"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Muchos rangos sugeridos tienen una sola fila.');
    expect(markup).toContain('precios o cantidades');
    expect(markup).not.toContain('disabled="">Agregar rangos sugeridos');
  });

  it('warns when lookup values are empty without blocking suggested ranges', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'PINCELES SERIE 304', 'input-price': '' } },
      { rowNumber: 9, values: { 'input-code': 'P-2', 'input-name': '', 'input-price': '' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': '', 'input-price': '' } },
      { rowNumber: 15, values: { 'input-code': 'P-3', 'input-name': 'PINCELES SERIE 404', 'input-price': '100' } },
    ];
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={rows}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="8"
        initialEndRowInput="15"
        initialValueMode="firstValueInColumn"
        initialValueColumnId="input-price"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Algunos rangos no encontraron valor');
    expect(markup).toContain('valor vacío');
    expect(markup).not.toContain('disabled="">Agregar rangos sugeridos');
  });

  it('detects group filters that discard all possible groups', () => {
    expect(getManualRangeGeneratorWarnings({
      canPreview: true,
      generatedRanges: [],
      rangesBeforeStartFilter: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      }],
      isColumnLookupValueMode: false,
    })[0]).toContain('El filtro de grupo descartó todos los posibles grupos');
  });

  it('warns when trailing rows would apply values to all rows in the range', () => {
    expect(getManualRangeGeneratorWarnings({
      canPreview: true,
      generatedRanges: [{
        id: 'range-10-13',
        startRowNumber: 10,
        endRowNumber: 13,
        valueRecipe: expectedFixedTextRangeValueRecipe('NOTA A'),
        valueSource: { type: 'fixedText', value: 'NOTA A' },
      }],
      isColumnLookupValueMode: false,
      trailingRowCount: 1,
      appliesToAllRows: true,
    })[0]).toContain('El rango incluira filas posteriores');
  });

  it('renders a close action when the suggested range generator receives a close handler', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onClose={() => undefined}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Agregar rangos sugeridos');
    expect(markup).toContain('Limpiar');
    expect(markup).toContain('Cerrar');
  });

  it('does not show generated range examples before there are generated ranges', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={[]}
        onChange={() => undefined}
      />,
    );

    expect(markup).not.toContain('Ejemplos');
    expect(markup).not.toContain('Ejemplos de rangos sugeridos');
  });

  it('labels generated range examples and shows hidden examples in a tooltip title', () => {
    const rows = Array.from({ length: 10 }, (_, index): InputRow => ({
      rowNumber: index + 1,
      values: { 'input-code': `Ejemplo ${index + 1}` },
    }));
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={rows}
        initialStartRowInput="1"
        initialEndRowInput="10"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Ejemplos');
    expect(markup).toContain('1-1: Ejemplo 1');
    expect(markup).toContain('6-6: Ejemplo 6');
    expect(markup).toContain('4 ejemplos más');
    expect(markup).toContain('manualRangeMoreExamplesTooltip');
    expect(markup).not.toContain('title="7-7: Ejemplo 7');
    expect(markup).toContain('<span>7-7: Ejemplo 7</span>');
    expect(markup).toContain('<span>10-10: Ejemplo 10</span>');
    expect(markup).toContain('Ver ejemplos restantes');
  });

  it('renders data block generation controls without text-only options', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialDetectionMode="dataBlocks"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Columna que marca el bloque');
    expect(markup).toContain('Bloques consecutivos con datos');
    expect(markup).toContain('Pandora creará un rango por cada bloque consecutivo con datos en A, desde el inicio hasta el final');
    expect(markup).toContain('Las filas consecutivas con datos forman un bloque. Una fila vacía corta el bloque.');
    expect(markup).toContain('Ayuda: detectar rangos');
    expect(markup).not.toContain('Configurá cómo detectar rangos y agregalos para revisarlos.');
    expect(markup).not.toContain('Columna con datos');
    expect(markup).not.toContain('Aceptar como grupo sólo si');
    expect(markup).not.toContain('Condición de grupo');
    expect(markup).toContain('Guardar como valor');
    expect(markup).not.toContain('El grupo llega hasta la última fila con dato en');
    expect(markup).not.toContain('textos encontrados');
    expect(markup).not.toContain('texto detectado');
  });

  it('mentions the selected data block column in the block help text', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={[inputColumns[2], ...inputColumns.filter((inputColumn) => inputColumn.id !== 'input-pack')]}
        manualRangeRows={manualRangeRows}
        initialDetectionMode="dataBlocks"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('creará un rango por cada bloque consecutivo con datos en F');
    expect(markup).toContain('Una fila vacía corta el bloque');
  });

  it('shows calculated lookup values in suggested data block examples', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'P-2', 'input-name': 'Detalle' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 15, values: { 'input-code': 'P-3', 'input-name': 'PINCELES SERIE 404' } },
    ];
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={rows}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="8"
        initialEndRowInput="15"
        initialValueMode="firstValueInColumn"
        initialValueColumnId="input-name"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('8-9: PINCELES SERIE 304');
    expect(markup).toContain('15-15: PINCELES SERIE 404');
  });

  it('renders manual range step conditions with contextual copy', () => {
    const alwaysMarkup = renderToStaticMarkup(
      <StepConditionFields
        variant="manualRange"
        step={{ id: 'range-step', type: 'manualRange', ranges: [] }}
        inputColumns={inputColumns}
        onChange={() => undefined}
      />,
    );
    const conditionalMarkup = renderToStaticMarkup(
      <StepConditionFields
        variant="manualRange"
        step={{
          id: 'range-step',
          type: 'manualRange',
          ranges: [],
          condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty', valueType: 'text' },
        }}
        inputColumns={inputColumns}
        onChange={() => undefined}
      />,
    );

    expect(alwaysMarkup).toContain('Aplicar a todas sus filas');
    expect(conditionalMarkup).toContain('Aplicar el valor');
    expect(conditionalMarkup).toContain('Aplicar sólo a filas que cumplan condición');
    expect(conditionalMarkup).toContain('A');
    expect(conditionalMarkup).toContain('No esta vacio');
  });

  it('summarizes one manual range step with created range count only', () => {
    const markup = renderToStaticMarkup(
      <CustomValueEditor
        recipe={{
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [{
            id: 'range-step',
            mode: 'manualRange',
            type: 'manualRange',
            ranges: [{ id: 'range-18-25', startRowNumber: 18, endRowNumber: 25, value: 'Promo' }],
          }],
        }}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        mode="text"
        onChange={() => undefined}
      />,
    );

    const headerStart = markup.indexOf('composeStudioHeaderTitle');
    const headerMarkup = markup.slice(headerStart, markup.indexOf('</div>', headerStart));
    expect(headerMarkup).toContain('Paso 1 · 1 rango creado');
    expect(headerMarkup).not.toContain('18-25');
    expect(headerMarkup).not.toContain('18 - 25');
  });

  it('summarizes multiple manual range steps with created range count only', () => {
    const markup = renderToStaticMarkup(
      <CustomValueEditor
        recipe={{
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [{
            id: 'range-step',
            mode: 'manualRange',
            type: 'manualRange',
            ranges: [
              { id: 'range-18-25', startRowNumber: 18, endRowNumber: 25, value: 'Promo' },
              { id: 'range-28-34', startRowNumber: 28, endRowNumber: 34, value: 'Promo 2' },
              { id: 'range-37-44', startRowNumber: 37, endRowNumber: 44, value: 'Promo 3' },
            ],
          }],
        }}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        mode="text"
        onChange={() => undefined}
      />,
    );

    const headerStart = markup.indexOf('composeStudioHeaderTitle');
    const headerMarkup = markup.slice(headerStart, markup.indexOf('</div>', headerStart));
    expect(headerMarkup).toContain('Paso 1 · 3 rangos creados');
    expect(headerMarkup).not.toContain('18-25, 28-34');
    expect(headerMarkup).not.toContain('18 - 25, 28 - 34');
  });

  it('mounts one spreadsheet below general configuration for a manual range step', () => {
    vi.stubGlobal('document', { body: {} });
    const markup = renderToStaticMarkup(
      <CustomValueEditor
        recipe={{
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [{
            id: 'range-step',
            mode: 'manualRange',
            type: 'manualRange',
            ranges: [{ id: 'range-8-10', startRowNumber: 8, endRowNumber: 10, value: 'Promo' }],
            condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty', valueType: 'text' },
          }],
        }}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        mode="text"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Configuración general');
    expect(markup).toContain('Trabajar con rangos');
    expect(markup).toContain('manualRangeSpreadsheet');
    expect((markup.match(/class="manualRangeSpreadsheet"/g) ?? [])).toHaveLength(1);
    expect(markup.indexOf('Configuración general')).toBeLessThan(markup.indexOf('manualRangeSpreadsheet'));
    expect(markup).toContain('Aplicar el valor');
    expect(markup).not.toContain('manualRangeList');
    expect(markup).not.toContain('manualRangeGenerator');
    expect(markup).not.toContain('La edición de rangos no está disponible en este paso.');
  });

  it('shows the text-mode empty message when no suggested text ranges are found', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialStartRowInput="8"
        initialEndRowInput="10"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('No se encontraron rangos con esta');
    expect(markup).toContain('manualRangeGeneratorWarnings');
  });

  it('shows the data-block empty message when no useful rows are found', () => {
    const markup = renderToStaticMarkup(
      <ManualRangeTextGenerator
        recipe={createManualRangeRecipe()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        initialDetectionMode="dataBlocks"
        initialStartRowInput="8"
        initialEndRowInput="10"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('No se encontraron rangos con esta');
    expect(markup).toContain('manualRangeGeneratorWarnings');
    expect(markup).not.toContain('No se encontraron textos en la zona definida.');
  });

  it('shows suggested text references in manual range rows', () => {
    const markup = renderManualRangeTableRow({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      suggestedFromText: 'PINCELES SERIE 304',
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    });

    expect(markup).toContain('Referencia');
    expect(markup).toContain('PINCELES SERIE 304');
    expect(markup).toContain('manualRangeMetadataRow');
    expect(markup).toContain('manualRangeEditorRow');
  });

  it('uses the configured range value as its visual reference', () => {
    expect(getManualRangeReferenceText({
      id: 'range-text',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' }, steps: [] },
    })).toBe('RODILLO ANTIGOTA');
    expect(getManualRangeReferenceText({
      id: 'fixed',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: { source: { type: 'fixedText', value: 'Texto elegido' }, steps: [] },
    })).toBe('Texto elegido');
    expect(getManualRangeReferenceText({
      id: 'concat',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'concat-step',
          type: 'concat',
          parts: [
            { id: 'one', source: { type: 'fixedText', value: 'RODILLO' } },
            { id: 'two', source: { type: 'fixedText', value: 'ANTIGOTA' }, separatorBefore: ' ' },
          ],
        }],
      },
    })).toBe('RODILLO ANTIGOTA');
  });

  it('renders a row preview action for configured manual ranges', () => {
    const markup = renderManualRangeTableRow({
      id: 'range-12-16',
      startRowNumber: 12,
      endRowNumber: 16,
      valueRecipe: expectedFixedTextRangeValueRecipe('FORESTA ADVANCE SATINADO'),
      valueSource: { type: 'fixedText', value: 'FORESTA ADVANCE SATINADO' },
    });

    expect(markup).toContain('aria-label="Ver filas"');
    expect(markup).toContain('title="Ver filas"');
    expect(markup).toContain('manualRangeIconAction');
    expect(markup).toContain('manualRangeIconActionLabel');
    expect(markup).toContain('Ver filas');
    expect(markup).not.toContain('Ver filas del Excel');
  });

  it('renders row preview data for a single manual range when expanded', () => {
    const rows: InputRow[] = [
      { rowNumber: 12, values: { 'input-name': 'FORESTA ADVANCE SATINADO', 'input-code': '', 'input-pack': '' } },
      { rowNumber: 13, values: { 'input-name': 'Impregnante + preservador', 'input-code': '4404503', 'input-pack': '1' } },
      { rowNumber: 16, values: { 'input-name': 'Incoloro-Roble-Nogal', 'input-code': '4404507', 'input-pack': '20' } },
    ];
    const markup = renderManualRangeTableRow({
      id: 'range-12-16',
      startRowNumber: 12,
      endRowNumber: 16,
      valueRecipe: expectedFixedTextRangeValueRecipe('FORESTA ADVANCE SATINADO'),
      valueSource: { type: 'fixedText', value: 'FORESTA ADVANCE SATINADO' },
    }, { rows, initiallyShowRowsPreview: true });

    expect(markup).toContain('Filas del rango');
    expect(markup).toContain('Filas reales del Excel incluidas en este rango.');
    expect(markup).toContain('Fila');
    expect(markup).toContain('12');
    expect(markup).toContain('16');
    expect(markup).toContain('FORESTA ADVANCE SATINADO');
    expect(markup).toContain('4404503');
  });

  it('renders an empty state when manual range preview rows are unavailable', () => {
    const markup = renderManualRangeTableRow({
      id: 'range-12-16',
      startRowNumber: 12,
      endRowNumber: 16,
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    }, { rows: [], initiallyShowRowsPreview: true });

    expect(markup).toContain('No hay filas disponibles para previsualizar este rango.');
  });

  it('limits manual range row previews to 30 rows', () => {
    const rows = Array.from({ length: 35 }, (_, index): InputRow => ({
      rowNumber: index + 1,
      values: { 'input-name': `Fila ${index + 1}` },
    }));
    const preview = getManualRangePreviewRowsForRange({ startRowNumber: 1, endRowNumber: 35 }, rows);
    const columns = getManualRangePreviewColumnsForRows(preview.rows, inputColumns);
    const markup = renderManualRangeTableRow({
      id: 'range-1-35',
      startRowNumber: 1,
      endRowNumber: 35,
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    }, { rows, initiallyShowRowsPreview: true });

    expect(preview.rows).toHaveLength(30);
    expect(preview.total).toBe(35);
    expect(columns.map((column) => column.id)).toContain('input-name');
    expect(markup).toContain('Mostrando 30 de 35 filas del rango.');
    expect(markup).toContain('Fila 30');
    expect(markup).not.toContain('Fila 31');
  });

  it('keeps the reference slot for manual ranges without suggested metadata', () => {
    const markup = renderManualRangeTableRow({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    });

    expect(markup).toContain('Referencia');
    expect(markup).toMatch(/manualRangeReferenceField[^>]*><span>Referencia<\/span><strong>-<\/strong>/);
  });

  it('renders a date picker for fixed text used by a date step', () => {
    const column: OutputColumn = {
      id: 'date-output',
      label: 'Fecha',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        parts: [{ id: 'part-date', type: 'input', inputColumnId: 'input-code' }],
        steps: [{
          id: 'date-step',
          mode: 'date',
          type: 'formatDate',
          source: { type: 'fixedText', value: '2024-06-01' },
          dateInputFormat: 'YYYY-MM-DD',
          dateOutputFormat: 'YYYY-MM-DD',
        }],
      },
    };

    const markup = renderRecipeEditorMarkup(column);

    expect(markup).toContain('type="date"');
    expect(markup).toContain('value="2024-06-01"');
    expect(markup).not.toContain('Formato de entrada');
  });

  it('keeps a normal text input for non-date fixed text sources', () => {
    const column: OutputColumn = {
      id: 'text-output',
      label: 'Texto',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        parts: [{ id: 'part-text', type: 'input', inputColumnId: 'input-code' }],
        steps: [{
          id: 'text-step',
          mode: 'text',
          type: 'addPrefix',
          source: { type: 'fixedText', value: 'ABC' },
          value: 'PRE-',
        }],
      },
    };

    const markup = renderRecipeEditorMarkup(column);

    expect(markup).toContain('type="text"');
    expect(markup).toContain('value="ABC"');
    expect(markup).not.toContain('type="date"');
  });

  it('normalizes date picker values to ISO or an empty safe value', () => {
    expect(getDatePickerValue('2024-06-01')).toBe('2024-06-01');
    expect(getDatePickerValue('01/06/2024', 'DD/MM/YYYY')).toBe('2024-06-01');
    expect(getDatePickerValue('no es fecha', 'DD/MM/YYYY')).toBe('');
  });

  it('uses confirm/cancel modal copy without the pending-apply footer text', () => {
    expect(recipeEditorModalCancelLabel).toBe('Cancelar');
    expect(recipeEditorModalApplyLabel).toBe('Aplicar');

    const markup = renderRecipeEditorMarkup(combineColumn);
    expect(markup).not.toContain('Los cambios se aplican al confirmar');
  });

  it('renders the custom value modal header with the column name and preview label', () => {
    const markup = renderRecipeEditorMarkup({
      id: 'output-custom-header',
      label: 'Nueva columna A',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'fixed', type: 'text', value: 'ABC' }],
        separator: '',
      },
    }, { sampleInputValues: { 'input-name': 'Producto' } });

    expect(markup).toContain('Columna: &quot;Nueva columna A&quot;');
    expect(markup).toContain('<strong>Vista previa</strong>');
    expect(markup).not.toContain('Valor personalizado');
    expect(markup).not.toContain('Nombre de columna:');
    expect(markup).not.toContain('Vista previa del primer dato:');
  });

  it('uses draft recipe inside the modal without changing the persisted column until apply', () => {
    const draftRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      parts: [],
      separator: '',
      steps: [{ id: 'draft', type: 'addPrefix', value: 'DRAFT-' }],
    };

    expect(getRecipeEditorModalRecipe(combineColumn.recipe, null)).toBe(combineColumn.recipe);
    expect(getRecipeEditorModalRecipe(combineColumn.recipe, draftRecipe)).toBe(draftRecipe);
    expect(applyRecipeEditorDraft(combineColumn, null)).toBe(combineColumn);
    expect(applyRecipeEditorDraft(combineColumn, draftRecipe)).toEqual({
      ...combineColumn,
      recipe: draftRecipe,
    });
  });

  it('uses draft manual range recipe inside the modal and applies it on save', () => {
    const manualRangeColumn: OutputColumn = {
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [
          { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Original' },
        ],
      },
    };
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Editado' },
      ],
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
    };

    expect(getRecipeEditorModalRecipe(manualRangeColumn.recipe, null)).toBe(manualRangeColumn.recipe);
    expect(getRecipeEditorModalRecipe(manualRangeColumn.recipe, draftRecipe)).toBe(draftRecipe);
    expect(applyRecipeEditorDraft(manualRangeColumn, draftRecipe)).toEqual({
      ...manualRangeColumn,
      recipe: draftRecipe,
    });
  });

  it('previews manual range modal draft recipes before applying them', () => {
    const originalRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Original' }, steps: [] },
      }],
    };
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'fixedText', value: '' },
          steps: [{
            id: 'concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
              { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
            ],
          }],
        },
      }],
    };

    expect(getRecipeEditorModalRecipe(originalRecipe, draftRecipe)).toBe(draftRecipe);
    expect(buildManualRangeRecipePreview(originalRecipe, manualRangeRows)).toBe('Fila 8: Original');
    expect(buildManualRangeRecipePreview(draftRecipe, manualRangeRows)).toBe('Fila 8: PINCELES SERIE 304 - 20L');
    expect(applyRecipeEditorDraft({
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: originalRecipe,
    }, null).recipe).toBe(originalRecipe);
  });

  it('previews manual range drafts using real row numbers instead of internal row indexes', () => {
    const draftRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'fixedText', value: '' },
          steps: [{
            id: 'concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
            ],
          }],
        },
      }],
    };
    const rowsWithRealNumbers: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } },
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' } },
    ];

    expect(buildManualRangeRecipePreview(draftRecipe, rowsWithRealNumbers)).toBe('Fila 8: PINCELES SERIE 304VIR 1');
    expect(buildManualRangeRecipePreview(draftRecipe, [{ rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } }])).toBeNull();
    expect(buildManualRangeRecipePreview(draftRecipe, [], { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' })).toBe('Fila 8: PINCELES SERIE 304VIR 1');
  });

  it('applies generated manual ranges from a concat part into the final recipe', () => {
    let nextId = 1;
    const column: OutputColumn = {
      id: 'output-title',
      label: 'Titulo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [],
        separator: '',
        steps: [{
          id: 'concat-step',
          type: 'concat',
          parts: [
            {
              id: 'range-part',
              source: { type: 'fixedText', value: '' },
              steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
            },
            {
              id: 'pack-part',
              source: { type: 'input', inputColumnId: 'input-pack' },
              separatorBefore: ' - ',
            },
          ],
        }],
      },
    };
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA', 'input-pack': '12' } },
      { rowNumber: 43, values: { 'input-name': '', 'input-pack': '13' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA', 'input-pack': '14' } },
    ];
    const generatedRanges = generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 44,
      mode: 'untilNextText',
      initialValueMode: 'detectedText',
      idFactory: () => `generated-${nextId++}`,
    });

    if (column.recipe.type !== 'combine' || column.recipe.steps?.[0]?.type !== 'concat') {
      throw new Error('Expected concat step recipe');
    }

    const concatStep = column.recipe.steps[0];
    const rangePart = concatStep.parts?.[0];
    if (!rangePart) {
      throw new Error('Expected range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch({
      type: 'manualRange',
      ranges: generatedRanges,
    }));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const draftRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      ...column.recipe,
      steps: updateStep(column.recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };
    const appliedColumn = applyRecipeEditorDraft(column, draftRecipe);
    const [processedRow] = buildProcessedRows([rows[0]], [appliedColumn]);

    if (appliedColumn.recipe.type !== 'combine') {
      throw new Error('Expected applied combine recipe');
    }

    const appliedRanges = appliedColumn.recipe.steps?.[0]?.parts?.[0]?.steps?.[0]?.ranges ?? [];
    expect(appliedRanges).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        suggestedFromText: 'RODILLO SIMIL LANA',
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 44,
        suggestedFromText: 'RODILLO ANTIGOTA',
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
    ]);
    expect(processedRow.outputValues['output-title']).toBe('RODILLO SIMIL LANA - 12');
  });

  it('preserves manual range valueRecipe when applying a concat part edit', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        parts: [{
          id: 'range-part',
          source: { type: 'previousResult' },
          steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
        }],
      }],
    };
    const rangeRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
        valueSource: { type: 'fixedText', value: 'Promo' },
      }],
    };
    const concatStep = recipe.steps?.[0];
    const rangePart = concatStep?.parts?.[0];

    if (!concatStep || !rangePart) {
      throw new Error('Expected concat range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch(rangeRecipe));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const nextRecipe = {
      ...recipe,
      steps: updateStep(recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };

    expect(nextRecipe.steps?.[0].parts?.[0].steps?.[0].ranges?.[0]).toEqual(rangeRecipe.ranges[0]);
  });

  it('preserves manual range input valueRecipe steps when applying a concat part edit', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat-step',
        type: 'concat',
        parts: [{
          id: 'range-part',
          source: { type: 'previousResult' },
          steps: [{ id: 'range-step', type: 'manualRange', ranges: [] }],
        }],
      }],
    };
    const rangeRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: {
          source: { type: 'input', inputColumnId: 'input-name' },
          steps: [{
            id: 'range-concat',
            mode: 'text',
            type: 'concat',
            parts: [
              { id: 'previous', source: { type: 'previousResult' } },
              { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' ' },
            ],
          }],
        },
      }],
    };
    const concatStep = recipe.steps?.[0];
    const rangePart = concatStep?.parts?.[0];

    if (!concatStep || !rangePart) {
      throw new Error('Expected concat range part');
    }

    const nextRangeSteps = updateConcatPartPrimaryStep(rangePart.steps ?? [], manualRangeRecipeToStepPatch(rangeRecipe));
    const nextParts = updateConcatPartSteps(concatStep.parts ?? [], rangePart.id, nextRangeSteps);
    const nextRecipe = {
      ...recipe,
      steps: updateStep(recipe.steps ?? [], concatStep.id, { parts: nextParts }),
    };

    expect(nextRecipe.steps?.[0].parts?.[0].steps?.[0].ranges?.[0]).toEqual(rangeRecipe.ranges[0]);
  });

  it('detects draft changes before discarding the modal editor', () => {
    const originalRecipe = combineColumn.recipe as Extract<OutputRecipe, { type: 'combine' }>;
    const sameDraft = structuredClone(originalRecipe);
    const changedDraft: Extract<OutputRecipe, { type: 'combine' }> = {
      ...sameDraft,
      steps: [{ id: 'draft-change', type: 'addPrefix', value: 'DRAFT-' }],
    };

    expect(hasRecipeEditorDraftChanges(originalRecipe, null)).toBe(false);
    expect(hasRecipeEditorDraftChanges(originalRecipe, sameDraft)).toBe(false);
    expect(hasRecipeEditorDraftChanges(originalRecipe, changedDraft)).toBe(true);
    expect(recipeEditorDiscardChangesTitle).toBe('Descartar');
    expect(recipeEditorDiscardChangesMessage).toContain('Hay cambios sin aplicar');
  });

  it('uses clear presentation copy for part steps and previous result help', () => {
    expect(recipeEditorAdditionalStepLabel).toBe('Agregar paso');
    expect(recipeEditorAdditionalStepLabel).not.toBe('Agregar ajuste');
    expect(recipeEditorAdditionalStepLabel).not.toBe('Agregar otra transformación');
    expect(recipeEditorPreviousResultHelpText).toBe('Este valor se calcula para cada fila según los pasos anteriores.');
  });

  it('makes the first add-step click visible inside a concat part', () => {
    const nextSteps = appendConcatPartAdditionalStep([]);

    expect(nextSteps).toHaveLength(2);
    expect(nextSteps[0]).toMatchObject({ mode: 'text', type: 'noop' });
    expect(nextSteps[1]).toMatchObject({ mode: 'text', type: 'noop' });
  });

  it('shows previous result help only when previous result is selected', () => {
    expect(shouldShowPreviousResultSourceHelp({ type: 'previousResult' })).toBe(true);
    expect(shouldShowPreviousResultSourceHelp({ type: 'input', inputColumnId: 'input-code' })).toBe(false);
    expect(shouldShowPreviousResultSourceHelp({ type: 'fixedText', value: 'AS4350' })).toBe(false);
  });

  it('maps unified source dropdown values to step sources', () => {
    expect(getStepSourceDropdownValue({ type: 'previousResult' })).toBe('previousResult');
    expect(getStepSourceDropdownValue({ type: 'fixedText', value: 'Manual' })).toBe('fixedText');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: 'input-code' })).toBe('input:input-code');
    expect(getStepSourceDropdownValue({ type: 'input', inputColumnId: '' })).toBe('');

    expect(getStepSourceFromDropdownValue('previousResult', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'previousResult' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'fixedText', value: 'Manual' })).toEqual({ type: 'fixedText', value: 'Manual' });
    expect(getStepSourceFromDropdownValue('fixedText', { type: 'input', inputColumnId: 'input-code' })).toEqual({ type: 'fixedText', value: '' });
    expect(getStepSourceFromDropdownValue('input:input-name', { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-name' });
  });

  it('builds unified source dropdown options with variable sources only', () => {
    expect(getStepSourceDropdownOptions(inputColumns.slice(0, 2), true)).toEqual([
      { value: 'previousResult', label: 'Resultado del paso anterior' },
      { value: 'columnTextPicker', label: 'Elegir texto desde celda' },
      { value: 'input:input-code', label: 'A' },
      { value: 'input:input-name', label: 'D - Nombre' },
    ]);

    expect(getStepSourceDropdownOptions(inputColumns.slice(0, 1), false)).toEqual([
      { value: 'columnTextPicker', label: 'Elegir texto desde celda' },
      { value: 'input:input-code', label: 'A' },
    ]);

    expect(getStepSourceDropdownOptions(inputColumns.slice(0, 1), false, false)).toEqual([
      { value: 'input:input-code', label: 'A' },
    ]);
    expect(getStepSourceDropdownOptions(inputColumns, true).map((option) => option.label)).not.toContain('Texto fijo');
  });

  it('builds an empty custom value recipe when no operation mode is selected', () => {
    expect(createCustomValueRecipeForMode('', {
      type: 'combine',
      parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      steps: [{ id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    })).toEqual({ type: 'combine', parts: [], separator: '' });
  });

  it('builds and edits manual range recipes', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const withRows = updateManualRangeValue(withRange, rangeId, {
      startRowNumber: 8,
      endRowNumber: 13,
    });
    const edited = updateManualRangeFixedTextValue(withRows, rangeId, 'Cerda china mango amarillo');

    expect(emptyRecipe).toEqual({ type: 'manualRange', ranges: [] });
    expect(edited.ranges[0]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText', value: 'Cerda china mango amarillo' }, steps: [] },
      valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
    });
    expect(getManualRangeFixedTextValue(edited.ranges[0])).toBe('Cerda china mango amarillo');
    expect(getManualRangeFixedTextValue({ id: 'legacy', startRowNumber: 1, endRowNumber: 1, value: 'Legacy' })).toBe('Legacy');
    expect(getManualRangeRowCount(edited.ranges[0])).toBe('6');
    expect(getManualRangeRowCount({ startRowNumber: 13, endRowNumber: 8 })).toBe('');
    expect(removeManualRangeValue(edited, rangeId).ranges).toEqual([]);
  });

  it('reads manual range fixed text from valueRecipe before legacy sources', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText' as const, value: 'Nuevo' }, steps: [] },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
      value: 'Legacy',
    };

    expect(getManualRangeValueSourceType(range)).toBe('fixedText');
    expect(getManualRangeFixedTextValue(range)).toBe('Nuevo');
  });

  it('reads manual range range text from valueRecipe before legacy sources', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: 'Sinteplast' },
        steps: [],
      },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
    };

    expect(getManualRangeValueSourceType(range)).toBe('rangeText');
    expect(getManualRangeRangeTextSource(range)).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
  });

  it('reads manual range input sources from valueRecipe', () => {
    const range = {
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'input' as const, inputColumnId: 'input-name' },
        steps: [],
      },
      valueSource: { type: 'fixedText' as const, value: 'Viejo' },
    };

    expect(manualRangeValueSourceOptions).toContainEqual({ value: 'input', label: 'Columna de entrada' });
    expect(getManualRangeValueSourceType(range)).toBe('input');
    expect(getManualRangeInputSource(range)).toEqual({ type: 'input', inputColumnId: 'input-name' });
  });

  it('configures manual range text sources', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const rangeTextRecipe = updateManualRangeValueSourceType(withRange, rangeId, 'rangeText', inputColumns);
    const configured = updateManualRangeRangeTextValue(rangeTextRecipe, rangeId, {
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });

    expect(manualRangeValueSourceOptions).toContainEqual({ value: 'rangeText', label: 'Texto encontrado en el rango' });
    expect(getManualRangeValueSourceType(configured.ranges[0])).toBe('rangeText');
    expect(getManualRangeRangeTextSource(configured.ranges[0])).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
    expect(configured.ranges[0].valueRecipe).toEqual({
      source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' },
      steps: [],
    });
    expect(configured.ranges[0].valueSource).toEqual({
      type: 'rangeText',
      inputColumnId: 'input-name',
      selectedText: 'Sinteplast',
    });
    expect(configured.ranges[0]).not.toHaveProperty('value');
  });

  it('configures manual range input sources without legacy valueSource', () => {
    const emptyRecipe = createManualRangeRecipe();
    const withRange = addManualRangeValue(emptyRecipe);
    const rangeId = withRange.ranges[0].id;
    const inputRecipe = updateManualRangeValueSourceType(withRange, rangeId, 'input', inputColumns);
    const configured = updateManualRangeInputValue(inputRecipe, rangeId, 'input-name');

    expect(getManualRangeValueSourceType(configured.ranges[0])).toBe('input');
    expect(getManualRangeInputSource(configured.ranges[0])).toEqual({ type: 'input', inputColumnId: 'input-name' });
    expect(configured.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [],
    });
    expect(configured.ranges[0]).not.toHaveProperty('valueSource');
    expect(configured.ranges[0]).not.toHaveProperty('value');
  });

  it('updates manual range value recipe transformations without changing the source', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
      }],
    };

    const added = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'trim' },
    ]);
    const edited = updateManualRangeValueRecipeSteps(added, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'uppercase' },
    ]);
    const removed = updateManualRangeValueRecipeSteps(edited, 'range-8-13', []);

    expect(added.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
    });
    expect(edited.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'trim-step', mode: 'text', type: 'uppercase' }],
    });
    expect(removed.ranges[0].valueRecipe).toEqual({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [],
    });
  });

  it('creates valueRecipe steps from legacy sources and filters nested range operations', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: ' Promo ' },
      }],
    };

    const updated = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      { id: 'trim-step', mode: 'text', type: 'trim' },
      { id: 'range-step', mode: 'manualRange', type: 'manualRange', ranges: [] },
      { id: 'concat-step', mode: 'text', type: 'concat', parts: [] },
    ]);

    expect(updated.ranges[0].valueRecipe).toEqual({
      source: { type: 'fixedText', value: ' Promo ' },
      steps: [
        { id: 'trim-step', mode: 'text', type: 'trim' },
        { id: 'concat-step', mode: 'text', type: 'concat', parts: [] },
      ],
    });
  });

  it('keeps concat valueRecipe steps and filters nested manual range part steps', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' }, steps: [] },
      }],
    };

    const updated = updateManualRangeValueRecipeSteps(recipe, 'range-8-13', [
      {
        id: 'concat-step',
        mode: 'text',
        type: 'concat',
        parts: [
          { id: 'previous', source: { type: 'previousResult' } },
          {
            id: 'input-pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            separatorBefore: ' ',
            steps: [
              { id: 'trim-pack', mode: 'text', type: 'trim' },
              { id: 'nested-range', mode: 'manualRange', type: 'manualRange', ranges: [] },
              { id: 'nested-concat', mode: 'text', type: 'concat', parts: [] },
            ],
          },
        ],
      },
      { id: 'range-step', mode: 'manualRange', type: 'manualRange', ranges: [] },
    ]);

    expect(updated.ranges[0].valueRecipe?.steps).toEqual([
      {
        id: 'concat-step',
        mode: 'text',
        type: 'concat',
        parts: [
          { id: 'previous', source: { type: 'previousResult' }, steps: [] },
          {
            id: 'input-pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            separatorBefore: ' ',
            steps: [{ id: 'trim-pack', mode: 'text', type: 'trim' }],
          },
        ],
      },
    ]);
  });

  it('offers concat but not manual ranges inside range value transformations', () => {
    expect(getAllowedStepModes({ kind: 'range' })).not.toContain('manualRange');
    expect(getAllowedStepActions('text', { kind: 'range' })).toContain('concat');
    expect(getAllowedStepActions('text', { kind: 'rangeConcat' })).not.toContain('concat');
  });

  it('renders range values as a mini operation editor instead of separate value and transformations blocks', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
    });

    expect(markup).not.toContain('Valor del rango');
    expect(markup).toContain('rangeValuePrimaryControls');
    expect(markup).toContain('rangeValueSourceControls');
    expect(markup).toContain('Tipo de operación');
    expect(markup).toContain('Acción');
    expect(markup).toContain('Usar columna de entrada');
    expect(markup).toContain('D - Nombre');
    expect(markup).toContain('Columna de entrada');
    expect(markup).not.toContain('Fuente del valor');
    expect(markup).not.toMatch(/<span>Texto<\/span>/);
    expect(markup).not.toContain('Transformaciones del valor');
    expect(markup).not.toMatch(/>Valor<\/span>/);
  });

  it('builds range value source dropdown options with variable sources only', () => {
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Texto encontrado en el rango',
      'Elegir texto desde celda',
      'A',
      'D - Nombre',
      'F - Presentacion',
      'AN - Precio',
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.value)).toEqual([
      'rangeText',
      'columnTextPicker',
      'input:input-code',
      'input:input-name',
      'input:input-pack',
      'input:input-price',
    ]);
    expect(getRangeValueSourceDropdownOptions(inputColumns).map((option) => option.label)).not.toContain('Texto fijo');
  });

  it('maps range value source dropdown column selections to input sources', () => {
    expect(getRangeValueSourceSelection('input:input-name')).toEqual({
      type: 'inputColumn',
      inputColumnId: 'input-name',
    });
    expect(getRangeValueSourceSelection('fixedText')).toEqual({
      type: 'valueSourceType',
      value: 'fixedText',
    });
    expect(getRangeValueSourceSelection('rangeText')).toEqual({
      type: 'valueSourceType',
      value: 'rangeText',
    });
  });

  it('limits range row-by-row numeric source compatibility to covered rows', () => {
    const columns: InputColumn[] = [
      { id: 'number-in-range', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Number in range', active: true, sampleValues: [''], nonEmptyCount: 1 },
      { id: 'number-outside-range', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'Number outside range', active: true, sampleValues: ['999'], nonEmptyCount: 1 },
      { id: 'text-only', columnIndex: 2, columnLetter: 'C', label: 'C', header: 'Text only', active: true, sampleValues: ['ABC'], nonEmptyCount: 1 },
    ];
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'number-in-range': '12', 'number-outside-range': '', 'text-only': 'ABC' } },
      { rowNumber: 2, values: { 'number-in-range': '', 'number-outside-range': '', 'text-only': 'DEF' } },
      { rowNumber: 8, values: { 'number-in-range': '', 'number-outside-range': '999', 'text-only': 'GHI' } },
    ];
    const markup = renderRangeValueEditor({
      id: 'range-number-1-2',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: {
        source: { type: 'input', inputColumnId: 'number-in-range' },
        steps: [{ id: 'number-step', mode: 'number', type: 'noop', source: { type: 'input', inputColumnId: 'number-in-range' } }],
      },
    }, { inputColumns: columns, manualRangeRows: rows });

    expect(getCompatibleStepValueInputColumns(columns, 'number', rows.slice(0, 2)).map((column) => column.id)).toEqual(['number-in-range']);
    expect(markup).toContain('A - Number in range');
    expect(markup).not.toContain('B - Number outside range');
    expect(markup).not.toContain('No se muestran algunas columnas porque no contienen valores numéricos compatibles.');
  });

  it('limits range row-by-row date source compatibility to covered rows', () => {
    const columns: InputColumn[] = [
      { id: 'date-in-range', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Date in range', active: true, sampleValues: [''], nonEmptyCount: 1 },
      { id: 'date-outside-range', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'Date outside range', active: true, sampleValues: ['2026-07-07'], nonEmptyCount: 1 },
      { id: 'text-only', columnIndex: 2, columnLetter: 'C', label: 'C', header: 'Text only', active: true, sampleValues: ['ABC'], nonEmptyCount: 1 },
    ];
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'date-in-range': '2026-07-07', 'date-outside-range': '', 'text-only': 'ABC' } },
      { rowNumber: 2, values: { 'date-in-range': '', 'date-outside-range': '', 'text-only': 'DEF' } },
      { rowNumber: 8, values: { 'date-in-range': '', 'date-outside-range': '2026-07-08', 'text-only': 'GHI' } },
    ];
    const markup = renderRangeValueEditor({
      id: 'range-date-1-2',
      startRowNumber: 1,
      endRowNumber: 2,
      valueRecipe: {
        source: { type: 'input', inputColumnId: 'date-in-range' },
        steps: [{ id: 'date-step', mode: 'date', type: 'noop', source: { type: 'input', inputColumnId: 'date-in-range' } }],
      },
    }, { inputColumns: columns, manualRangeRows: rows });

    expect(getCompatibleStepValueInputColumns(columns, 'date', rows.slice(0, 2)).map((column) => column.id)).toEqual(['date-in-range']);
    expect(markup).toContain('A - Date in range');
    expect(markup).not.toContain('B - Date outside range');
    expect(markup).not.toContain('No se muestran algunas columnas porque Pandora no detectó valores de fecha compatibles.');
  });

  it('keeps range cell pickers using all rows and columns', () => {
    const columns: InputColumn[] = [
      { id: 'number-outside-range', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Number outside range', active: true, sampleValues: ['999'], nonEmptyCount: 1 },
      { id: 'number-in-range', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'Number in range', active: true, sampleValues: [''], nonEmptyCount: 1 },
    ];
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'number-outside-range': '', 'number-in-range': '12' } },
      { rowNumber: 2, values: { 'number-outside-range': '', 'number-in-range': '' } },
      { rowNumber: 8, values: { 'number-outside-range': '999', 'number-in-range': '' } },
    ];
    const markup = renderToStaticMarkup(
      <StepSourceFields
        label="Qué valor usar"
        source={{ type: 'fixedText', value: '999' }}
        inputColumns={columns}
        inputRows={rows}
        inputCompatibilityRows={rows.slice(0, 2)}
        allowPreviousResult={false}
        valueKind="number"
        fixedTextInputType="number"
        columnTextPickerOpen
        limitColumnTextPickerToCompatibleColumns={false}
        onChange={() => undefined}
      />,
    );

    expect(getCompatibleStepValueInputColumns(columns, 'number', rows.slice(0, 2)).map((column) => column.id)).toEqual(['number-in-range']);
    expect(markup).toContain('A - Number outside range');
    expect(markup).toContain('999');
  });

  it('keeps general editor typed compatibility based on column samples', () => {
    const columns: InputColumn[] = [
      { id: 'number-sample', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Number sample', active: true, sampleValues: ['999'], nonEmptyCount: 1 },
      { id: 'text-sample', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'Text sample', active: true, sampleValues: ['ABC'], nonEmptyCount: 1 },
    ];

    expect(getStepValueSourceOptions(columns, 'number', false).map((option) => option.label)).toEqual([
      'A - Number sample',
      'Valor fijo',
      'Elegir valor desde celda',
    ]);
  });

  it('renders range text sources inside the range value operation editor', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' }, steps: [] },
    });

    expect(markup).toContain('Texto encontrado en el rango');
    expect(markup).not.toContain('Fuente del valor');
    expect(markup).toContain('Buscar textos en');
    expect(markup).toContain('Texto encontrado');
    expect(markup).toContain('PINCELES SERIE 304');
  });

  it('shows a short invalid range-text label with warning help', () => {
    const markup = renderRangeValueEditor({
      id: 'range-without-texts',
      startRowNumber: 50,
      endRowNumber: 60,
      valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' }, steps: [] },
    });

    expect(markup).toContain('Valores no válidos');
    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('No se encontraron textos en este rango.');
    expect(markup).not.toContain('Usa el valor tal cual.');
  });

  it('renders fixed text sources inside the range value operation editor', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'fixedText', value: 'Promo especial' }, steps: [] },
    });

    expect(markup).not.toContain('Fuente del valor');
    expect(markup).toContain('Usar texto fijo');
    expect(markup).toContain('Texto');
    expect(markup).toContain('Promo especial');
  });

  it('renders concat as the primary range value operation with its parts', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: {
        source: { type: 'input', inputColumnId: 'input-name' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'previous', source: { type: 'previousResult' } },
            { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
            { id: 'fixed', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' ' },
          ],
        }],
      },
    });

    expect(markup).toContain('Acción');
    expect(markup).toContain('Concatenar');
    expect(markup).toContain('composePartsBuilder');
    expect(markup).toContain('Editor de partes');
    expect(markup).toContain('compositionTokenList');
    expect(markup).toContain('compositionTokenCard');
    expect(markup).toContain('composeTokenInspector');
    expect(markup).toContain('Parte seleccionada');
    expect(markup).toContain('dragHandle');
    const rangeTokenCardIndex = markup.indexOf('compositionTokenCard');
    const rangeTokenButtonIndex = markup.indexOf('class="compositionToken', rangeTokenCardIndex);
    const rangeTokenDragIndex = markup.indexOf('class="dragHandle"', rangeTokenCardIndex);
    const rangeTokenDeleteIndex = markup.indexOf('aria-label="Eliminar parte"', rangeTokenCardIndex);
    expect(rangeTokenButtonIndex).toBeLessThan(rangeTokenDragIndex);
    expect(rangeTokenDragIndex).toBeLessThan(rangeTokenDeleteIndex);
    expect(markup).toContain('rangeValueOperationPanel');
    expect(markup).toContain('rangeValueFlatSteps');
    expect(markup).toContain('stepDetailPanel');
    expect(markup).toContain('stepCardHeader');
    expect(markup).toContain('Paso 1');
    expect(markup).toContain('Parte 1');
    expect(markup).toContain('Resultado anterior');
    expect(markup).toContain('F - Presentacion');
    expect(markup).toContain('OK');
    expect(markup).not.toContain('concatStepFields');
    expect(markup).not.toContain('concatPartsSidebar');
    expect(markup).not.toContain('rangeValueConcatWorkspaceFlat');
    expect(markup).not.toContain('Fuente del valor');
    expect(markup).not.toContain('Usar resultado anterior');
    expect(markup).not.toContain('Buscar textos en');
    expect(markup).not.toContain('Texto encontrado</span>');
    expect(markup).not.toMatch(/<span id="[^"]+">Fuente<\/span>/);
    expect(markup).not.toContain('Pasos adicionales');
  });

  it('maps normal text value actions onto existing persisted sources', () => {
    expect(getStepTextSourceActionOptions(false).map((option) => option.label)).toEqual([
      'Usar columna de entrada',
      'Usar texto fijo',
      'Elegir texto desde celda',
    ]);
    expect(getStepTextSourceActionOptions(true).slice(-1)[0]?.label).toBe('Usar resultado anterior');
    expect(getStepSourceForTextAction('useFixedText', { type: 'input', inputColumnId: 'input-code' }, inputColumns)).toEqual({ type: 'fixedText', value: '' });
    expect(getStepSourceForTextAction('useInputColumn', { type: 'fixedText', value: 'Legacy' }, inputColumns)).toEqual({ type: 'input', inputColumnId: 'input-code' });
    expect(getStepSourceForTextAction('pickColumnText', { type: 'fixedText', value: 'NEGRO' }, inputColumns)).toEqual({ type: 'fixedText', value: 'NEGRO' });
  });

  it('shows cell-based copy for text picking outside ranges', () => {
    const markup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'pick-cell-text', mode: 'text', type: 'noop', source: { type: 'fixedText', value: '' } }}
        mode="text"
        textSourceAction="pickColumnText"
        onTextSourceAction={() => undefined}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Elegir texto desde celda');
    expect(markup).not.toContain('Elegir texto desde columna');
  });

  it('shows fixed text as a text action instead of a value source option', () => {
    const fixedSource = { type: 'fixedText' as const, value: 'Legacy' };
    const markup = renderToStaticMarkup(
      <StepTypeSelect
        step={{ id: 'fixed-text-step', mode: 'text', type: 'noop', source: fixedSource }}
        mode="text"
        textSourceAction="useFixedText"
        onTextSourceAction={() => undefined}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Acción');
    expect(markup).toContain('Usar texto fijo');
    expect(getStepSourceDropdownOptions(inputColumns, false).map((option) => option.label)).not.toContain('Texto fijo');
  });

  it('renders persisted fixed text sources without a redundant source selector', () => {
    const markup = renderToStaticMarkup(
      <StepSourceFields
        source={{ type: 'fixedText', value: 'Legacy' }}
        inputColumns={inputColumns}
        allowPreviousResult={false}
        hideSourceSelector
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Texto fijo');
    expect(markup).toContain('value="Legacy"');
    expect(markup).not.toContain('Fuente del valor');
    expect(markup).not.toContain('Seleccionar fuente');
  });

  it('offers textual value sources as actions instead of a second source selector', () => {
    expect(getAllowedSourceActions({ mode: 'text', type: 'noop' }, { kind: 'range' })).toEqual([
      'useInputColumn',
      'useFixedText',
      'pickColumnText',
      'useRangeText',
    ]);
  });

  it.each([
    ['addPrefix', 'Prefijo'],
    ['addSuffix', 'Sufijo'],
  ] as const)('avoids the redundant fixed text input for concat %s', (stepType, fieldLabel) => {
    const markup = renderRangeValueEditor({
      id: `range-${stepType}`,
      startRowNumber: 8,
      endRowNumber: 10,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [{
            id: 'fixed-part',
            source: { type: 'fixedText', value: '' },
            steps: [{ id: 'modifier', mode: 'text', type: stepType, value: 'PROMO-' }],
          }],
        }],
      },
    });

    expect(markup).not.toContain('Usar texto fijo');
    expect(markup).not.toContain('Fuente del valor');
    expect(markup).toContain(`>${fieldLabel}<`);
    expect(markup).not.toContain('<span>Texto</span><input');
  });

  it('lists unique non-empty column texts in Excel appearance order', () => {
    expect(getUniqueColumnTextOptions([
      { rowNumber: 1, values: { 'input-code': 'BLANCO' } },
      { rowNumber: 2, values: { 'input-code': '' } },
      { rowNumber: 3, values: { 'input-code': ' NEGRO ' } },
      { rowNumber: 4, values: { 'input-code': 'BLANCO' } },
      { rowNumber: 5, values: { 'input-code': '   ' } },
      { rowNumber: 6, values: { 'input-code': 'ROJO' } },
    ], 'input-code')).toEqual([
      { value: 'BLANCO', label: 'BLANCO' },
      { value: ' NEGRO ', label: ' NEGRO ' },
      { value: 'ROJO', label: 'ROJO' },
    ]);
  });

  it('filters picked numeric values while preserving deduplicated row order', () => {
    expect(getUniqueColumnTextOptions([
      { rowNumber: 1, values: { 'input-code': '10' } },
      { rowNumber: 2, values: { 'input-code': '' } },
      { rowNumber: 3, values: { 'input-code': 'texto' } },
      { rowNumber: 4, values: { 'input-code': '10' } },
      { rowNumber: 5, values: { 'input-code': '12.5' } },
    ], 'input-code', (value) => Number.isFinite(Number(value)))).toEqual([
      { value: '10', label: '10' },
      { value: '12.5', label: '12.5' },
    ]);
  });

  it('filters text choices partially and case-insensitively without reordering them', () => {
    const options = [
      { value: 'white-black', label: 'BLANCO - NEGRO' },
      { value: 'aerosol', label: 'AEROSOL SINTEPLAST BRILLANTE' },
      { value: 'black', label: 'NEGRO' },
    ];

    expect(filterDropdownOptions(options, 'negro')).toEqual([options[0], options[2]]);
    expect(filterDropdownOptions(options, 'AeRo')).toEqual([options[1]]);
    expect(filterDropdownOptions(options, 'inexistente')).toEqual([]);
    expect(filterDropdownOptions(options, '   ')).toBe(options);
    expect(getDropdownEmptyMessage(true)).toBe('No hay coincidencias.');
  });

  it('renders searchable text selection as one primary combobox without an inner search input', () => {
    const searchableMarkup = renderToStaticMarkup(
      <ColumnTextPicker
        inputColumns={inputColumns.slice(0, 1)}
        rows={[{ rowNumber: 1, values: { 'input-code': 'NEGRO' } }]}
        value=""
        onSelect={() => undefined}
      />,
    );
    const normalMarkup = renderToStaticMarkup(
      <Dropdown
        value=""
        options={[{ value: 'one', label: 'Uno' }]}
        onChange={() => undefined}
      />,
    );

    expect(searchableMarkup.match(/dropdownSearchableInput/g)).toHaveLength(1);
    expect(searchableMarkup).toContain('role="combobox"');
    expect(searchableMarkup).not.toContain('dropdownSearchWrap');
    expect(normalMarkup).toContain('dropdownTrigger');
    expect(normalMarkup).not.toContain('role="combobox"');
  });

  it('persists a selected column text as fixed text', () => {
    expect(createFixedTextSourceFromColumnText('NEGRO')).toEqual({ type: 'fixedText', value: 'NEGRO' });

    const recipe = updateManualRangeFixedTextValue({
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 1,
        endRowNumber: 2,
        valueSource: { type: 'fixedText', value: '' },
      }],
    }, 'range', 'NEGRO');
    expect(recipe.ranges[0].valueRecipe?.source).toEqual({ type: 'fixedText', value: 'NEGRO' });
  });

  it('shows a clear empty state when a column has no available texts', () => {
    const markup = renderToStaticMarkup(
      <ColumnTextPicker
        inputColumns={inputColumns.slice(0, 1)}
        rows={[{ rowNumber: 1, values: { 'input-code': '   ' } }]}
        value=""
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain('Valores no válidos');
    expect(markup).not.toContain('Sin textos disponibles');
    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('aria-label="Aviso de compatibilidad"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('dropdownSearchableControl-disabled');
    expect(markup).not.toContain('No hay textos disponibles en esta columna.');
    expect(markup).not.toContain('textSourceHelperRow');
  });

  it('starts range concat with one unconfigured input part', () => {
    expect(createDefaultRangeValueConcatParts()).toEqual([
      expect.objectContaining({ source: { type: 'input', inputColumnId: '' } }),
    ]);
  });

  it('makes the first add-step click visible inside range concat', () => {
    const nextSteps = appendRangeValueStep([]);

    expect(nextSteps).toHaveLength(2);
    expect(nextSteps[0]).toMatchObject({ mode: 'text', type: 'noop' });
    expect(nextSteps[1]).toMatchObject({ mode: 'text', type: 'noop' });
  });

  it('renders the add-step button at the last configured step inside range concat', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [{
            id: 'pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            steps: [
              { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
              { id: 'trim', mode: 'text', type: 'trim', source: { type: 'previousResult' } },
            ],
          }],
        }],
      },
    });

    expect(markup).toContain('rangeValueOperationPanel');
    expect(markup).toContain('concatPartStepDivider');
    expect(markup).toContain('rangeValueFlatSteps');
    expect(markup).toContain('stepDetailPanel');
    expect(markup.match(/Agregar paso/g)).toHaveLength(1);
    expect(markup.match(/Eliminar paso/g)).toHaveLength(1);
    expect(markup.indexOf('rangeValueOperationPanel')).toBeLessThan(markup.indexOf('Paso 1'));
    expect(markup.indexOf('Paso 1')).toBeLessThan(markup.indexOf('concatPartStepDivider'));
    expect(markup.indexOf('Paso 2')).toBeLessThan(markup.indexOf('Agregar paso'));
  });

  it('keeps the add-step button on the only configured range concat step', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [{ id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, steps: [] }],
        }],
      },
    });

    expect(markup.match(/Agregar paso/g)).toHaveLength(1);
    expect(markup).toContain('rangeValueOperationPanel');
    expect(markup).not.toContain('concatPartStepDivider');
    expect(markup.indexOf('Paso 1')).toBeLessThan(markup.indexOf('Agregar paso'));
  });

  it('renders suffix after previous result on follow-up steps inside range concat', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [{
            id: 'pack',
            source: { type: 'input', inputColumnId: 'input-pack' },
            steps: [
              { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
              { id: 'suffix', mode: 'text', type: 'addSuffix', source: { type: 'previousResult' }, value: '!' },
            ],
          }],
        }],
      },
    });
    const secondStepMarkup = markup.slice(markup.indexOf('Paso 2'));

    expect(secondStepMarkup.indexOf('Valor base')).toBeLessThan(secondStepMarkup.indexOf('Resultado anterior'));
    expect(secondStepMarkup.indexOf('Resultado anterior')).toBeLessThan(secondStepMarkup.indexOf('Sufijo'));
  });

  it('builds concat part source options for range values without fixed text as a source', () => {
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).toEqual([
      'Resultado anterior',
      'Elegir texto desde celda',
      'Texto encontrado en el rango',
      'A',
      'D - Nombre',
      'F - Presentacion',
      'AN - Precio',
    ]);
    expect(getRangeValueConcatPartSourceDropdownOptions(inputColumns).map((option) => option.label)).not.toContain('Texto fijo');
  });

  it('updates range concat part sources without changing unrelated part fields', () => {
    const part = {
      id: 'range-part',
      source: { type: 'input' as const, inputColumnId: 'input-name' },
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };

    expect(updateRangeConcatPartPrimarySource(part, { type: 'previousResult' })).toEqual({
      ...part,
      source: { type: 'previousResult' },
    });
    expect(updateRangeConcatPartPrimarySource(part, { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' })).toEqual({
      ...part,
      source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
    });
    expect(updateRangeConcatPartPrimarySource(part, { type: 'fixedText', value: 'Texto elegido desde celda' })).toEqual({
      ...part,
      source: { type: 'fixedText', value: 'Texto elegido desde celda' },
    });
    expect(updateRangeConcatPartPrimarySource(part, { type: 'input', inputColumnId: 'input-pack' })).toEqual({
      ...part,
      source: { type: 'input', inputColumnId: 'input-pack' },
    });
  });

  it('updates range concat part source and steps together without changing separators', () => {
    const part = {
      id: 'range-part',
      source: { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
      separatorBefore: ' / ',
      steps: [{ id: 'trim', type: 'trim' as const }],
    };

    expect(updateRangeConcatPartPrimarySource(part, { type: 'input', inputColumnId: 'input-pack' }, [{ id: 'upper', type: 'uppercase' }])).toEqual({
      id: 'range-part',
      source: { type: 'input', inputColumnId: 'input-pack' },
      separatorBefore: ' / ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
  });

  it('renders range text configuration inside concat range value parts', () => {
    const markup = renderRangeValueEditor({
      id: 'range-8-9',
      startRowNumber: 8,
      endRowNumber: 9,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'range-concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'range-text-part', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
            { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
          ],
        }],
      },
    });

    expect(markup).toContain('Texto encontrado en el rango');
    expect(markup).toContain('Buscar textos en');
    expect(markup).toContain('Texto encontrado');
    expect(markup).toContain('PINCELES SERIE 304');
    expect(markup).not.toMatch(/<span id="[^"]+">Columna de entrada<\/span>/);
  });

  it('renders legacy manual range value fallbacks in the mini operation editor', () => {
    const fixedMarkup = renderRangeValueEditor({
      id: 'legacy-fixed',
      startRowNumber: 8,
      endRowNumber: 13,
      value: 'Legacy promo',
    });
    const rangeTextMarkup = renderRangeValueEditor({
      id: 'legacy-range-text',
      startRowNumber: 8,
      endRowNumber: 9,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
    });

    expect(fixedMarkup).toContain('Usar texto fijo');
    expect(fixedMarkup).toContain('Legacy promo');
    expect(rangeTextMarkup).toContain('Texto encontrado en el rango');
    expect(rangeTextMarkup).toContain('PINCELES SERIE 304');
  });

  it('switches fixed text manual ranges to input sources without contradictory fallback state', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'fixedText', value: 'Promo' }, steps: [] },
        valueSource: { type: 'fixedText', value: 'Promo' },
      }],
    };

    const next = updateManualRangeValueSourceType(recipe, 'range-8-13', 'input', inputColumns);

    expect(next.ranges[0]).toEqual({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-code' }, steps: [] },
    });
  });

  it('switches range text manual ranges to input sources without contradictory fallback state', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' }, steps: [] },
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Sinteplast' },
      }],
    };

    const next = updateManualRangeValueSourceType(recipe, 'range-8-13', 'input', inputColumns);

    expect(next.ranges[0]).toEqual({
      id: 'range-8-13',
      startRowNumber: 8,
      endRowNumber: 13,
      valueRecipe: { source: { type: 'input', inputColumnId: 'input-code' }, steps: [] },
    });
  });

  it('falls back to old manual range value sources while rendering helpers', () => {
    expect(getManualRangeFixedTextValue({
      id: 'fixed',
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'fixedText', value: 'Fallback fijo' },
    })).toBe('Fallback fijo');
    expect(getManualRangeRangeTextSource({
      id: 'range-text',
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Fallback rango' },
    })).toEqual({ type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Fallback rango' });
  });

  it('duplicates fixed text manual ranges with a new id', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
      }],
    };

    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');

    expect(duplicated.ranges).toHaveLength(2);
    expect(duplicated.ranges[1]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
    });
    expect(duplicated.ranges[1].id).not.toBe('range-8-13');
  });

  it('duplicates range text manual ranges with a new id', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
      }],
    };

    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');

    expect(duplicated.ranges[1]).toMatchObject({
      startRowNumber: 8,
      endRowNumber: 13,
      valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
    });
    expect(duplicated.ranges[1].id).not.toBe('range-8-13');
  });

  it('edits a duplicated manual range without changing the original', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'fixedText', value: 'Original' },
      }],
    };
    const duplicated = duplicateManualRangeValue(recipe, 'range-8-13');
    const duplicateId = duplicated.ranges[1].id;
    const edited = updateManualRangeFixedTextValue(duplicated, duplicateId, 'Duplicado');

    expect(getManualRangeFixedTextValue(edited.ranges[0])).toBe('Original');
    expect(getManualRangeFixedTextValue(edited.ranges[1])).toBe('Duplicado');
  });

  it('sorts manual ranges by start and then end without losing ids or sources', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'late', startRowNumber: 20, endRowNumber: 22, valueSource: { type: 'fixedText', value: 'Late' } },
        { id: 'wide', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Wide' } },
        { id: 'narrow', startRowNumber: 8, endRowNumber: 9, valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Narrow' } },
      ],
    };

    expect(sortManualRangesByStart(recipe).ranges).toEqual([
      { id: 'narrow', startRowNumber: 8, endRowNumber: 9, valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Narrow' } },
      { id: 'wide', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Wide' } },
      { id: 'late', startRowNumber: 20, endRowNumber: 22, valueSource: { type: 'fixedText', value: 'Late' } },
    ]);
  });

  it('prepends from the top action and appends from the bottom action', () => {
    const existingRange = { id: 'existing', startRowNumber: 8, endRowNumber: 9, valueSource: { type: 'fixedText' as const, value: 'Existente' } };
    const recipe = { ...createManualRangeRecipe(), ranges: [existingRange] };
    const fromTopButton = addManualRangeValue(recipe, 'start');
    const fromBottomButton = addManualRangeValue(recipe, 'end');

    expect(fromTopButton.ranges[1]).toBe(existingRange);
    expect(fromBottomButton.ranges[0]).toBe(existingRange);
    expect(fromTopButton.ranges[0]).toMatchObject({ startRowNumber: 0, endRowNumber: 0 });
    expect(fromBottomButton.ranges[1]).toMatchObject({ startRowNumber: 0, endRowNumber: 0 });
  });

  it('preserves numeric operation mode and steps when changing a range value source', () => {
    const numericStep = { id: 'numeric', mode: 'number' as const, type: 'numericOperation' as const, operation: 'add' as const, amount: 10 };
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 8,
        endRowNumber: 9,
        valueRecipe: { source: { type: 'fixedText', value: '10' }, steps: [numericStep] },
      }],
    };

    const withInput = updateManualRangeInputValue(recipe, 'range', 'input-code');
    const withRangeText = updateManualRangeValueSourceType(recipe, 'range', 'rangeText', inputColumns);
    const withFixedText = updateManualRangeFixedTextValue(recipe, 'range', '20');

    expect(withInput.ranges[0].valueRecipe?.steps).toEqual([numericStep]);
    expect(withRangeText.ranges[0].valueRecipe?.steps).toEqual([numericStep]);
    expect(withFixedText.ranges[0].valueRecipe?.steps).toEqual([numericStep]);
  });

  it('creates incomplete manual ranges with empty UI inputs and does not apply them', () => {
    const range = createDefaultManualRangeValue(99);
    const recipe = updateManualRangeFixedTextValue({ type: 'manualRange', ranges: [range] }, range.id, 'NO APLICAR');
    const outputRows = buildProcessedRows([{ rowNumber: 1, values: {} }], [{
      id: 'manual-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe,
    }]);

    expect(range).toMatchObject({ startRowNumber: 0, endRowNumber: 0 });
    expect(formatManualRangeRowInput(range.startRowNumber)).toBe('');
    expect(formatManualRangeRowInput(range.endRowNumber)).toBe('');
    expect(getManualRangeRowCount(range)).toBe('');
    expect(hasInvalidManualRange(range)).toBe(true);
    expect(outputRows[0].outputValues['manual-range']).toBe('');
  });

  it('clears stale range text after changing bounds or source column', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '20L' } },
      { rowNumber: 20, values: { 'input-name': 'LIJAS AL AGUA', 'input-pack': '230X280MM' } },
    ];
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{
        id: 'range',
        startRowNumber: 8,
        endRowNumber: 8,
        valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' }, steps: [] },
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
      }],
    };
    const moved = updateManualRangeValue(recipe, 'range', { startRowNumber: 20, endRowNumber: 20 });
    const reconciledBounds = reconcileManualRangeTextSelections(moved, 'range', rows);
    const changedColumn = updateManualRangeRangeTextValue(recipe, 'range', { inputColumnId: 'input-pack' });
    const reconciledColumn = reconcileManualRangeTextSelections(changedColumn, 'range', rows);

    expect(getManualRangeRangeTextSource(reconciledBounds.ranges[0]).selectedText).toBe('');
    expect(getManualRangeSelectedTextOptions(rows, reconciledBounds.ranges[0], getManualRangeRangeTextSource(reconciledBounds.ranges[0]))).toEqual(['LIJAS AL AGUA']);
    expect(getManualRangeRangeTextSource(reconciledColumn.ranges[0]).selectedText).toBe('');
    expect(getManualRangeSelectedTextOptions(rows, reconciledColumn.ranges[0], getManualRangeRangeTextSource(reconciledColumn.ranges[0]))).toEqual(['20L']);
  });

  it('generates manual ranges from found texts using real row numbers', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 12, values: { 'input-name': 'Fuera' } },
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 43, values: { 'input-name': '' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
      { rowNumber: 46, values: { 'input-name': 'RODILLOS PARA EPOXI' } },
      { rowNumber: 60, values: { 'input-name': 'Fuera final' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 50,
      mode: 'untilNextText',
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        suggestedFromText: 'RODILLO SIMIL LANA',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 45,
        suggestedFromText: 'RODILLO ANTIGOTA',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-3',
        startRowNumber: 46,
        endRowNumber: 50,
        suggestedFromText: 'RODILLOS PARA EPOXI',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('generates manual ranges in single row mode', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'singleRow',
      initialValueMode: 'detectedText',
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 42,
        suggestedFromText: 'RODILLO SIMIL LANA',
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO SIMIL LANA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 44,
        suggestedFromText: 'RODILLO ANTIGOTA',
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'RODILLO ANTIGOTA'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
      },
    ]);
  });

  it('adjusts generated manual range ends to the last non-empty row in the selected helper column', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-name': '', 'input-pack': 'Producto 1' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-pack': 'Producto 5' } },
      { rowNumber: 14, values: { 'input-name': '', 'input-pack': '   ' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '' } },
      { rowNumber: 16, values: { 'input-name': '', 'input-pack': 'Producto 6' } },
      { rowNumber: 20, values: { 'input-name': '', 'input-pack': '' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      validRowsColumnId: 'input-pack',
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 8,
        endRowNumber: 13,
        suggestedFromText: 'PINCELES SERIE 304',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 15,
        endRowNumber: 16,
        suggestedFromText: 'PINCELES SERIE 404',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('extends generated manual range ends with trailing rows after helper-column adjustment', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 10, values: { 'input-pack': 'GRUPO A', 'input-name': '', 'input-code': '' } },
      { rowNumber: 11, values: { 'input-pack': '', 'input-name': 'Producto A1', 'input-code': 'A-1' } },
      { rowNumber: 12, values: { 'input-pack': '', 'input-name': 'Producto A2', 'input-code': 'A-2' } },
      { rowNumber: 13, values: { 'input-pack': '', 'input-name': 'NOTA A', 'input-code': '' } },
      { rowNumber: 14, values: { 'input-pack': 'GRUPO B', 'input-name': '', 'input-code': '' } },
      { rowNumber: 15, values: { 'input-pack': '', 'input-name': 'Producto B1', 'input-code': 'B-1' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-pack',
      startRowNumber: 10,
      endRowNumber: 15,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-code', operator: 'isEmpty' },
      validRowsColumnId: 'input-code',
      trailingRowCount: 1,
      idFactory: () => `generated-${nextId++}`,
    })[0]).toEqual({
      id: 'generated-1',
      startRowNumber: 10,
      endRowNumber: 13,
      suggestedFromText: 'GRUPO A',
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    });
  });

  it('does not extend generated manual ranges past the next detected group', () => {
    const ranges = generateManualRangesFromTexts([
      { rowNumber: 10, values: { 'input-pack': 'GRUPO A', 'input-name': '', 'input-code': '' } },
      { rowNumber: 11, values: { 'input-pack': '', 'input-name': 'Producto A1', 'input-code': 'A-1' } },
      { rowNumber: 12, values: { 'input-pack': '', 'input-name': 'Producto A2', 'input-code': 'A-2' } },
      { rowNumber: 13, values: { 'input-pack': '', 'input-name': 'NOTA A', 'input-code': '' } },
      { rowNumber: 14, values: { 'input-pack': 'GRUPO B', 'input-name': '', 'input-code': '' } },
      { rowNumber: 15, values: { 'input-pack': '', 'input-name': 'Producto B1', 'input-code': 'B-1' } },
    ], {
      inputColumnId: 'input-pack',
      startRowNumber: 10,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-code', operator: 'isEmpty' },
      validRowsColumnId: 'input-code',
      trailingRowCount: 5,
      idFactory: () => 'generated-1',
    });

    expect(ranges[0].endRowNumber).toBe(13);
  });

  it('does not extend generated manual ranges past the configured end row', () => {
    const ranges = generateManualRangesFromTexts([
      { rowNumber: 10, values: { 'input-pack': 'GRUPO A', 'input-name': '', 'input-code': '' } },
      { rowNumber: 11, values: { 'input-pack': '', 'input-name': 'Producto A1', 'input-code': 'A-1' } },
      { rowNumber: 12, values: { 'input-pack': '', 'input-name': 'Producto A2', 'input-code': 'A-2' } },
      { rowNumber: 13, values: { 'input-pack': '', 'input-name': 'NOTA A', 'input-code': '' } },
    ], {
      inputColumnId: 'input-pack',
      startRowNumber: 10,
      endRowNumber: 12,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-code', operator: 'isEmpty' },
      validRowsColumnId: 'input-code',
      trailingRowCount: 1,
      idFactory: () => 'generated-1',
    });

    expect(ranges[0].endRowNumber).toBe(12);
  });

  it('uses trailing rows for generated last-value lookup when they are included in the range', () => {
    const ranges = generateManualRangesFromTexts([
      { rowNumber: 10, values: { 'input-pack': 'GRUPO A', 'input-name': '', 'input-code': '' } },
      { rowNumber: 11, values: { 'input-pack': '', 'input-name': 'Producto A1', 'input-code': 'A-1' } },
      { rowNumber: 12, values: { 'input-pack': '', 'input-name': 'Producto A2', 'input-code': 'A-2' } },
      { rowNumber: 13, values: { 'input-pack': '', 'input-name': 'NOTA A', 'input-code': '' } },
      { rowNumber: 14, values: { 'input-pack': 'GRUPO B', 'input-name': '', 'input-code': '' } },
    ], {
      inputColumnId: 'input-pack',
      startRowNumber: 10,
      endRowNumber: 14,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-code', operator: 'isEmpty' },
      validRowsColumnId: 'input-code',
      trailingRowCount: 1,
      initialValueMode: 'lastValueInColumn',
      initialValueColumnId: 'input-name',
      idFactory: () => 'generated-1',
    });

    expect(ranges[0]).toMatchObject({
      endRowNumber: 13,
      valueRecipe: expectedRangeTextValueRecipe('input-name', 'NOTA A'),
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'NOTA A' },
    });
    expect(buildProcessedRows([
      { rowNumber: 11, values: { 'input-code': 'A-1', 'input-name': 'Producto A1' } },
      { rowNumber: 13, values: { 'input-code': '', 'input-name': 'NOTA A' } },
    ], [{
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges,
        condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
      },
    }]).map((row) => row.outputValues['output-range'])).toEqual(['NOTA A', '']);
  });

  it('keeps the natural generated range end when the helper column has no useful rows', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-name': '', 'input-pack': '   ' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      validRowsColumnId: 'input-pack',
      idFactory: () => `generated-${nextId++}`,
    })[0]).toEqual({
      id: 'generated-1',
      startRowNumber: 8,
      endRowNumber: 14,
      suggestedFromText: 'PINCELES SERIE 304',
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    });
  });

  it('keeps detected text values when generated ranges use helper-column end adjustment', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-name': '', 'input-pack': 'Producto 1' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-pack': 'Producto 5' } },
      { rowNumber: 14, values: { 'input-name': '', 'input-pack': '' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      initialValueMode: 'detectedText',
      validRowsColumnId: 'input-pack',
      idFactory: () => `generated-${nextId++}`,
    })[0]).toEqual({
      id: 'generated-1',
      startRowNumber: 8,
      endRowNumber: 13,
      suggestedFromText: 'PINCELES SERIE 304',
      valueRecipe: expectedRangeTextValueRecipe('input-name', 'PINCELES SERIE 304'),
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
    });
  });

  it('uses the first non-empty value in a column for title-based ranges', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 12, values: { 'input-name': 'FORESTA ADVANCE SATINADO', 'input-code': '' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-code': 'A-1' } },
      { rowNumber: 16, values: { 'input-name': '', 'input-code': 'A-4' } },
      { rowNumber: 17, values: { 'input-name': 'FORESTA ADVANCE BRILLANTE', 'input-code': '' } },
      { rowNumber: 18, values: { 'input-name': '', 'input-code': 'B-1' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 12,
      endRowNumber: 21,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-code', operator: 'isEmpty' },
      validRowsColumnId: 'input-code',
      initialValueMode: 'firstValueInColumn',
      initialValueColumnId: 'input-name',
      idFactory: () => `generated-${nextId++}`,
    })[0]).toEqual({
      id: 'generated-1',
      startRowNumber: 12,
      endRowNumber: 16,
      suggestedFromText: 'FORESTA ADVANCE SATINADO',
      valueRecipe: expectedRangeTextValueRecipe('input-name', 'FORESTA ADVANCE SATINADO'),
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'FORESTA ADVANCE SATINADO' },
    });
  });

  it('uses an empty fixed value when the lookup column has no value inside the generated range', () => {
    const ranges = generateManualRangesFromTexts([
      { rowNumber: 12, values: { 'input-name': 'FORESTA ADVANCE SATINADO', 'input-code': '', 'input-price': '' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-code': 'A-1', 'input-price': '   ' } },
      { rowNumber: 16, values: { 'input-name': '', 'input-code': 'A-4', 'input-price': '' } },
    ], {
      inputColumnId: 'input-name',
      startRowNumber: 12,
      endRowNumber: 16,
      mode: 'untilNextText',
      validRowsColumnId: 'input-code',
      initialValueMode: 'firstValueInColumn',
      initialValueColumnId: 'input-price',
      idFactory: () => 'generated-1',
    });

    expect(ranges[0]).toMatchObject({
      valueRecipe: expectedRangeTextValueRecipe('input-price', ''),
      valueSource: { type: 'rangeText', inputColumnId: 'input-price', selectedText: '' },
    });
  });

  it('does not use helper-column values as generated manual range output values', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-name': '', 'input-pack': 'Producto 1' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-pack': 'Producto 5' } },
      { rowNumber: 14, values: { 'input-name': '', 'input-pack': '' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '' } },
    ];
    const ranges = generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      validRowsColumnId: 'input-pack',
      idFactory: () => `generated-${nextId++}`,
    });
    const processedRows = buildProcessedRows([rows[1]], [{
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges },
    }]);

    expect(processedRows[0].outputValues['output-range']).toBe('');
  });

  it('filters generated manual range starts when the helper column is empty', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 12, values: { 'input-name': 'Texto interno', 'input-pack': 'Producto 2' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '   ' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-pack', operator: 'isEmpty' },
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 8,
        endRowNumber: 14,
        suggestedFromText: 'PINCELES SERIE 304',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 15,
        endRowNumber: 20,
        suggestedFromText: 'PINCELES SERIE 404',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('filters generated manual range starts when the helper column is not empty', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'Sin producto', 'input-pack': '' } },
      { rowNumber: 12, values: { 'input-name': 'Con producto', 'input-pack': 'Producto 2' } },
      { rowNumber: 15, values: { 'input-name': 'Tambien con producto', 'input-pack': 'Producto 3' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-pack', operator: 'isNotEmpty' },
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 12,
        endRowNumber: 14,
        suggestedFromText: 'Con producto',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 15,
        endRowNumber: 20,
        suggestedFromText: 'Tambien con producto',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('ignores incomplete generated range start filters', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 12, values: { 'input-name': 'Texto interno', 'input-pack': 'Producto 2' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: '', operator: 'isEmpty' },
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 8,
        endRowNumber: 11,
        suggestedFromText: 'PINCELES SERIE 304',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 12,
        endRowNumber: 20,
        suggestedFromText: 'Texto interno',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('filters starts before adjusting generated manual range ends with the valid rows column', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '', 'input-price': '' } },
      { rowNumber: 9, values: { 'input-name': '', 'input-pack': 'Producto 1', 'input-price': '100' } },
      { rowNumber: 12, values: { 'input-name': 'Texto interno', 'input-pack': 'Producto 2', 'input-price': '200' } },
      { rowNumber: 13, values: { 'input-name': '', 'input-pack': 'Producto 3', 'input-price': '300' } },
      { rowNumber: 14, values: { 'input-name': '', 'input-pack': '', 'input-price': '' } },
      { rowNumber: 15, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': '', 'input-price': '' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-pack', operator: 'isEmpty' },
      validRowsColumnId: 'input-price',
      idFactory: () => `generated-${nextId++}`,
    })[0]).toEqual({
      id: 'generated-1',
      startRowNumber: 8,
      endRowNumber: 13,
      suggestedFromText: 'PINCELES SERIE 304',
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    });
  });

  it('keeps detected text values when generated range starts are filtered', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': '' } },
      { rowNumber: 12, values: { 'input-name': 'Texto interno', 'input-pack': 'Producto 2' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      initialValueMode: 'detectedText',
      startFilter: { inputColumnId: 'input-pack', operator: 'isEmpty' },
      idFactory: () => `generated-${nextId++}`,
    })).toEqual([
      {
        id: 'generated-1',
        startRowNumber: 8,
        endRowNumber: 20,
        suggestedFromText: 'PINCELES SERIE 304',
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'PINCELES SERIE 304'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
      },
    ]);
  });

  it('does not generate manual ranges when no found text matches the start filter', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'Producto 1' } },
      { rowNumber: 12, values: { 'input-name': 'PINCELES SERIE 404', 'input-pack': 'Producto 2' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 8,
      endRowNumber: 20,
      mode: 'untilNextText',
      startFilter: { inputColumnId: 'input-pack', operator: 'isEmpty' },
    })).toEqual([]);
  });

  it('generates suggested manual ranges from continuous data blocks', () => {
    let nextId = 1;

    expect(generateManualRangesFromDataBlocks([
      { rowNumber: 58, values: { 'input-pack': 'Producto 1' } },
      { rowNumber: 59, values: { 'input-pack': 'Producto 2' } },
      { rowNumber: 60, values: { 'input-pack': 'Producto 3' } },
      { rowNumber: 61, values: { 'input-pack': 'Producto 4' } },
      { rowNumber: 62, values: { 'input-pack': '' } },
    ], {
      dataColumnId: 'input-pack',
      startRowNumber: 58,
      endRowNumber: 62,
      idFactory: () => `block-${nextId++}`,
    })).toEqual([{
      id: 'block-1',
      startRowNumber: 58,
      endRowNumber: 61,
      valueRecipe: expectedEmptyRangeValueRecipe(),
      valueSource: { type: 'fixedText', value: '' },
    }]);
  });

  it('generates one suggested manual range per data block separated by empty rows', () => {
    let nextId = 1;

    expect(generateManualRangesFromDataBlocks([
      { rowNumber: 42, values: { 'input-pack': 'Producto 1' } },
      { rowNumber: 43, values: { 'input-pack': '' } },
      { rowNumber: 44, values: { 'input-pack': 'Producto 2' } },
      { rowNumber: 45, values: { 'input-pack': '   ' } },
      { rowNumber: 46, values: { 'input-pack': 'Producto 3' } },
    ], {
      dataColumnId: 'input-pack',
      startRowNumber: 42,
      endRowNumber: 46,
      idFactory: () => `block-${nextId++}`,
    })).toEqual([
      {
        id: 'block-1',
        startRowNumber: 42,
        endRowNumber: 42,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'block-2',
        startRowNumber: 44,
        endRowNumber: 44,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'block-3',
        startRowNumber: 46,
        endRowNumber: 46,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('extends data block ranges with trailing rows', () => {
    let nextId = 1;

    expect(generateManualRangesFromDataBlocks([
      { rowNumber: 12, values: { 'input-code': 'A-1', 'input-name': 'Producto A1' } },
      { rowNumber: 13, values: { 'input-code': 'A-2', 'input-name': 'Producto A2' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': 'COLORES A' } },
      { rowNumber: 15, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 16, values: { 'input-code': 'B-1', 'input-name': 'Producto B1' } },
      { rowNumber: 17, values: { 'input-code': 'B-2', 'input-name': 'Producto B2' } },
      { rowNumber: 18, values: { 'input-code': '', 'input-name': 'COLORES B' } },
      { rowNumber: 19, values: { 'input-code': '', 'input-name': '' } },
    ], {
      dataColumnId: 'input-code',
      startRowNumber: 12,
      endRowNumber: 19,
      trailingRowCount: 1,
      idFactory: () => `block-${nextId++}`,
    })).toEqual([
      {
        id: 'block-1',
        startRowNumber: 12,
        endRowNumber: 14,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'block-2',
        startRowNumber: 16,
        endRowNumber: 18,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('does not extend data block ranges into the next block', () => {
    const ranges = generateManualRangesFromDataBlocks([
      { rowNumber: 12, values: { 'input-code': 'A-1', 'input-name': 'Producto A1' } },
      { rowNumber: 13, values: { 'input-code': 'A-2', 'input-name': 'Producto A2' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': 'COLORES A' } },
      { rowNumber: 15, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 16, values: { 'input-code': 'B-1', 'input-name': 'Producto B1' } },
    ], {
      dataColumnId: 'input-code',
      startRowNumber: 12,
      endRowNumber: 20,
      trailingRowCount: 5,
      idFactory: () => 'block-1',
    });

    expect(ranges[0].endRowNumber).toBe(15);
  });

  it('does not extend data block ranges past the configured end row', () => {
    const ranges = generateManualRangesFromDataBlocks([
      { rowNumber: 12, values: { 'input-code': 'A-1', 'input-name': 'Producto A1' } },
      { rowNumber: 13, values: { 'input-code': 'A-2', 'input-name': 'Producto A2' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': 'COLORES A' } },
    ], {
      dataColumnId: 'input-code',
      startRowNumber: 12,
      endRowNumber: 13,
      trailingRowCount: 1,
      idFactory: () => 'block-1',
    });

    expect(ranges[0].endRowNumber).toBe(13);
  });

  it('uses trailing rows for generated last-value lookup in data block ranges', () => {
    const ranges = generateManualRangesFromDataBlocks([
      { rowNumber: 12, values: { 'input-code': 'A-1', 'input-name': 'Producto A1' } },
      { rowNumber: 13, values: { 'input-code': 'A-2', 'input-name': 'Producto A2' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': 'COLORES A' } },
      { rowNumber: 15, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 16, values: { 'input-code': 'B-1', 'input-name': 'Producto B1' } },
    ], {
      dataColumnId: 'input-code',
      startRowNumber: 12,
      endRowNumber: 16,
      trailingRowCount: 1,
      initialValueMode: 'lastValueInColumn',
      initialValueColumnId: 'input-name',
      idFactory: () => 'block-1',
    });

    expect(ranges[0]).toMatchObject({
      startRowNumber: 12,
      endRowNumber: 14,
      valueRecipe: expectedRangeTextValueRecipe('input-name', 'COLORES A'),
      valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'COLORES A' },
    });
  });

  it('uses the first non-empty value in a column for data block ranges', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'P-2', 'input-name': 'Cerda china mango amarillo' } },
      { rowNumber: 10, values: { 'input-code': 'P-3', 'input-name': '' } },
      { rowNumber: 11, values: { 'input-code': 'P-4', 'input-name': '' } },
      { rowNumber: 12, values: { 'input-code': 'P-5', 'input-name': '' } },
      { rowNumber: 13, values: { 'input-code': 'P-6', 'input-name': 'Otro detalle' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 15, values: { 'input-code': 'P-7', 'input-name': 'PINCELES SERIE 404' } },
      { rowNumber: 16, values: { 'input-code': 'P-8', 'input-name': 'Cerda china blanca mango bordeaux' } },
      { rowNumber: 17, values: { 'input-code': 'P-9', 'input-name': '' } },
      { rowNumber: 18, values: { 'input-code': 'P-10', 'input-name': '' } },
      { rowNumber: 19, values: { 'input-code': 'P-11', 'input-name': '' } },
      { rowNumber: 20, values: { 'input-code': 'P-12', 'input-name': 'Otro detalle' } },
    ];

    expect(generateManualRangesFromDataBlocks(rows, {
      dataColumnId: 'input-code',
      startRowNumber: 8,
      endRowNumber: 20,
      initialValueMode: 'firstValueInColumn',
      initialValueColumnId: 'input-name',
      idFactory: () => `block-${nextId++}`,
    })).toEqual([
      {
        id: 'block-1',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'PINCELES SERIE 304'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
      },
      {
        id: 'block-2',
        startRowNumber: 15,
        endRowNumber: 20,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'PINCELES SERIE 404'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 404' },
      },
    ]);
  });

  it('uses the last non-empty value in a column for data block ranges', () => {
    let nextId = 1;
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'P-2', 'input-name': 'Cerda china mango amarillo' } },
      { rowNumber: 10, values: { 'input-code': 'P-3', 'input-name': '' } },
      { rowNumber: 11, values: { 'input-code': 'P-4', 'input-name': '' } },
      { rowNumber: 12, values: { 'input-code': 'P-5', 'input-name': '' } },
      { rowNumber: 13, values: { 'input-code': 'P-6', 'input-name': '   ' } },
      { rowNumber: 14, values: { 'input-code': '', 'input-name': '' } },
      { rowNumber: 15, values: { 'input-code': 'P-7', 'input-name': 'PINCELES SERIE 404' } },
      { rowNumber: 16, values: { 'input-code': 'P-8', 'input-name': 'Cerda china blanca mango bordeaux' } },
      { rowNumber: 17, values: { 'input-code': 'P-9', 'input-name': '' } },
      { rowNumber: 18, values: { 'input-code': 'P-10', 'input-name': '' } },
      { rowNumber: 19, values: { 'input-code': 'P-11', 'input-name': '' } },
      { rowNumber: 20, values: { 'input-code': 'P-12', 'input-name': '' } },
    ];

    expect(generateManualRangesFromDataBlocks(rows, {
      dataColumnId: 'input-code',
      startRowNumber: 8,
      endRowNumber: 20,
      initialValueMode: 'lastValueInColumn',
      initialValueColumnId: 'input-name',
      idFactory: () => `block-${nextId++}`,
    })).toEqual([
      {
        id: 'block-1',
        startRowNumber: 8,
        endRowNumber: 13,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'Cerda china mango amarillo'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Cerda china mango amarillo' },
      },
      {
        id: 'block-2',
        startRowNumber: 15,
        endRowNumber: 20,
        valueRecipe: expectedRangeTextValueRecipe('input-name', 'Cerda china blanca mango bordeaux'),
        valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Cerda china blanca mango bordeaux' },
      },
    ]);
  });

  it('generates data block ranges only inside the requested row bounds', () => {
    let nextId = 1;

    expect(generateManualRangesFromDataBlocks([
      { rowNumber: 40, values: { 'input-pack': 'Fuera' } },
      { rowNumber: 42, values: { 'input-pack': 'Producto 1' } },
      { rowNumber: 43, values: { 'input-pack': 'Producto 2' } },
      { rowNumber: 44, values: { 'input-pack': '' } },
      { rowNumber: 46, values: { 'input-pack': 'Producto 3' } },
      { rowNumber: 50, values: { 'input-pack': 'Fuera final' } },
    ], {
      dataColumnId: 'input-pack',
      startRowNumber: 42,
      endRowNumber: 46,
      idFactory: () => `block-${nextId++}`,
    })).toEqual([
      {
        id: 'block-1',
        startRowNumber: 42,
        endRowNumber: 43,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'block-2',
        startRowNumber: 46,
        endRowNumber: 46,
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('does not generate data block ranges when no useful rows exist', () => {
    expect(generateManualRangesFromDataBlocks([
      { rowNumber: 42, values: { 'input-pack': '' } },
      { rowNumber: 43, values: { 'input-pack': '   ' } },
    ], {
      dataColumnId: 'input-pack',
      startRowNumber: 42,
      endRowNumber: 43,
    })).toEqual([]);
  });

  it('does not use data block column values as generated manual range output values', () => {
    const ranges = generateManualRangesFromDataBlocks([
      { rowNumber: 42, values: { 'input-pack': 'Producto 1' } },
    ], {
      dataColumnId: 'input-pack',
      startRowNumber: 42,
      endRowNumber: 42,
      idFactory: () => 'block-1',
    });
    const processedRows = buildProcessedRows([
      { rowNumber: 42, values: { 'input-pack': 'Producto 1' } },
    ], [{
      id: 'output-range',
      label: 'Rango',
      order: 0,
      enabled: true,
      recipe: { type: 'manualRange', ranges },
    }]);

    expect(ranges[0].suggestedFromText).toBeUndefined();
    expect(ranges[0].valueRecipe).toEqual(expectedEmptyRangeValueRecipe());
    expect(processedRows[0].outputValues['output-range']).toBe('');
  });

  it('does not generate manual ranges when no texts are found', () => {
    const rows: InputRow[] = [
      { rowNumber: 42, values: { 'input-name': '' } },
      { rowNumber: 43, values: { 'input-name': '   ' } },
      { rowNumber: 44, values: { 'input-name': 'Fuera' } },
    ];

    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-name',
      startRowNumber: 42,
      endRowNumber: 43,
      mode: 'untilNextText',
    })).toEqual([]);
  });

  it('adds generated manual ranges without deleting existing ranges', () => {
    let nextId = 1;
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'existing', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Existente' } },
      ],
    };
    const generatedRanges = generateManualRangesFromTexts([
      { rowNumber: 42, values: { 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-name': 'RODILLO ANTIGOTA' } },
    ], {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'untilNextText',
      idFactory: () => `generated-${nextId++}`,
    });
    const nextRecipe = { ...recipe, ranges: [...recipe.ranges, ...generatedRanges] };

    expect(nextRecipe.ranges).toEqual([
      { id: 'existing', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Existente' } },
      {
        id: 'generated-1',
        startRowNumber: 42,
        endRowNumber: 43,
        suggestedFromText: 'RODILLO SIMIL LANA',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
      {
        id: 'generated-2',
        startRowNumber: 44,
        endRowNumber: 50,
        suggestedFromText: 'RODILLO ANTIGOTA',
        valueRecipe: expectedEmptyRangeValueRecipe(),
        valueSource: { type: 'fixedText', value: '' },
      },
    ]);
  });

  it('generates unique ids and rangeText sources for the selected column', () => {
    let nextId = 1;
    const generatedRanges = generateManualRangesFromTexts([
      { rowNumber: 42, values: { 'input-code': 'Ignorar', 'input-name': 'RODILLO SIMIL LANA' } },
      { rowNumber: 44, values: { 'input-code': 'Ignorar', 'input-name': 'RODILLO ANTIGOTA' } },
    ], {
      inputColumnId: 'input-name',
      startRowNumber: 40,
      endRowNumber: 50,
      mode: 'singleRow',
      initialValueMode: 'detectedText',
      idFactory: () => `generated-${nextId++}`,
    });

    expect(new Set(generatedRanges.map((range) => range.id)).size).toBe(generatedRanges.length);
    expect(generatedRanges.map((range) => range.valueSource)).toEqual([
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO SIMIL LANA' },
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'RODILLO ANTIGOTA' },
    ]);
    expect(generatedRanges.map((range) => range.suggestedFromText)).toEqual([
      'RODILLO SIMIL LANA',
      'RODILLO ANTIGOTA',
    ]);
  });

  it('keeps selected Excel column identity when hidden or empty columns exist before it', () => {
    const rawRow = Array.from({ length: 12 }, () => '');
    rawRow[0] = 'AEROSOLES';
    rawRow[11] = '9058.23';
    const columns: InputColumn[] = [
      { ...inputColumns[0], id: 'input-0', columnIndex: 0, columnLetter: 'A' },
      { ...inputColumns[1], id: 'input-11', columnIndex: 11, columnLetter: 'L', active: true },
    ];
    const rows = buildInputRows([rawRow], columns, 0, [{ internalRowIndex: 0, excelRowNumber: 12 }]);

    expect(rows[0]).toEqual({
      rowNumber: 12,
      values: { 'input-0': 'AEROSOLES', 'input-11': '9058.23' },
    });
    expect(generateManualRangesFromTexts(rows, {
      inputColumnId: 'input-11',
      startRowNumber: 1,
      endRowNumber: 200,
      mode: 'singleRow',
      idFactory: () => 'range-l',
    })[0]).toMatchObject({
      id: 'range-l',
      startRowNumber: 12,
      suggestedFromText: '9058.23',
    });
  });

  it('builds manual range text options from real row numbers', () => {
    const rows: InputRow[] = [
      { rowNumber: 2, values: { 'input-name': 'Fuera' } },
      { rowNumber: 8, values: { 'input-name': '  Sinteplast  ' } },
      { rowNumber: 9, values: { 'input-name': '' } },
      { rowNumber: 10, values: { 'input-name': 'Alba' } },
      { rowNumber: 11, values: { 'input-name': 'Sinteplast' } },
      { rowNumber: 20, values: { 'input-name': 'Fuera final' } },
    ];

    expect(getManualRangeTextOptions(rows, { startRowNumber: 8, endRowNumber: 11 }, 'input-name')).toEqual([
      'Sinteplast',
      'Alba',
    ]);
  });

  it('builds the same range text options for a direct manual range step', () => {
    const rows: InputRow[] = [
      { rowNumber: 7, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'Cerda china mango amarillo' } },
      { rowNumber: 13, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 14, values: { 'input-code': 'Fuera final' } },
    ];
    const step = {
      id: 'range-step',
      type: 'manualRange' as const,
      ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13 }],
    };
    const range = manualRangeStepToRecipe(step).ranges[0];

    expect(getManualRangeTextOptions(rows, range, 'input-code')).toEqual([
      'PINCELES SERIE 304',
      'Cerda china mango amarillo',
    ]);
  });

  it('builds the same range text options for a manual range step inside a concat part', () => {
    const rows: InputRow[] = [
      { rowNumber: 7, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 9, values: { 'input-code': 'Cerda china mango amarillo' } },
      { rowNumber: 13, values: { 'input-code': 'PINCELES SERIE 304' } },
      { rowNumber: 14, values: { 'input-code': 'Fuera final' } },
    ];
    const concatPart = {
      id: 'range-part',
      source: { type: 'previousResult' as const },
      steps: [{
        id: 'nested-range-step',
        type: 'manualRange' as const,
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13 }],
      }],
    };
    const rangeStep = getVisibleConcatPartPrimaryStep(concatPart.steps);
    const range = manualRangeStepToRecipe(rangeStep).ranges[0];

    expect(getManualRangeTextOptions(rows, range, 'input-code')).toEqual([
      'PINCELES SERIE 304',
      'Cerda china mango amarillo',
    ]);
  });

  it('does not inject a stale selected range text into current options', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': 'Alba' } },
    ];
    const source = { type: 'rangeText' as const, inputColumnId: 'input-name', selectedText: 'Sinteplast' };

    expect(getManualRangeSelectedTextOptions(rows, { startRowNumber: 8, endRowNumber: 8 }, source)).toEqual(['Alba']);
  });

  it('describes missing range text setup states', () => {
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-name': '' } },
    ];

    expect(getManualRangeRangeTextHelpText(
      rows,
      { startRowNumber: 8, endRowNumber: 8 },
      { type: 'rangeText', inputColumnId: '', selectedText: '' },
    )).toBe('Elegí una columna para buscar textos.');
    expect(getManualRangeRangeTextHelpText(
      rows,
      { startRowNumber: 8, endRowNumber: 8 },
      { type: 'rangeText', inputColumnId: 'input-name', selectedText: '' },
    )).toBe('No se encontraron textos en este rango.');
  });

  it('shows legacy manual range values as fixed text when editing source type', () => {
    const legacyRecipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Legacy' },
      ],
    };
    const fixedTextRecipe = updateManualRangeValueSourceType(legacyRecipe, 'range-8-13', 'fixedText');

    expect(getManualRangeValueSourceType(legacyRecipe.ranges[0])).toBe('fixedText');
    expect(getManualRangeFixedTextValue(legacyRecipe.ranges[0])).toBe('Legacy');
    expect(fixedTextRecipe.ranges[0]).toMatchObject({
      valueSource: { type: 'fixedText', value: 'Legacy' },
    });
    expect(fixedTextRecipe.ranges[0]).not.toHaveProperty('value');
  });

  it('builds compact manual range summary labels', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
      ],
      condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
    };

    expect(getManualRangeCountLabel(recipe)).toBe('1 rango configurado');
    expect(describeManualRangeCondition(recipe, inputColumns)).toBe('A no está vacía');
    expect(describeManualRangeCondition({ type: 'manualRange', ranges: [] }, inputColumns)).toBe('Sin condición');
  });

  it('summarizes manual range steps without configured ranges', () => {
    expect(describeManualRangeStepSummary({ id: 'range-step', type: 'manualRange', ranges: [] }, inputColumns)).toBe('0 rangos');
  });

  it('summarizes manual range steps with one fixed text range', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
      ],
    }, inputColumns)).toBe('1 rango · texto fijo · 8-13');
  });

  it('summarizes manual range steps with several ranges and truncates the list', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Primero' } },
        { id: 'range-15-20', startRowNumber: 15, endRowNumber: 20, valueSource: { type: 'fixedText', value: 'Segundo' } },
        { id: 'range-22-26', startRowNumber: 22, endRowNumber: 26, valueSource: { type: 'fixedText', value: 'Tercero' } },
        { id: 'range-28-32', startRowNumber: 28, endRowNumber: 32, valueSource: { type: 'fixedText', value: 'Cuarto' } },
      ],
    }, inputColumns)).toBe('4 rangos · texto fijo · 8-13, 15-20, 22-26…');
  });

  it('summarizes manual range steps with an internal condition', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      manualRangeCondition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
      ],
    }, inputColumns)).toBe('1 rango · A no está vacía · texto fijo · 8-13');
  });

  it('summarizes manual range steps with range text source columns', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('summarizes manual range steps with input source columns', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('summarizes manual range value recipe transformations without implying plain source values', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
          },
        },
      ],
    }, inputColumns)).toBe('1 rango · valor personalizado · 8-13');
  });

  it('summarizes mixed manual range value sources safely', () => {
    expect(describeManualRangeStepSummary({
      id: 'range-step',
      type: 'manualRange',
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, valueSource: { type: 'fixedText', value: 'Promo' } },
        {
          id: 'range-15-20',
          startRowNumber: 15,
          endRowNumber: 20,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        },
      ],
    }, inputColumns)).toBe('2 rangos · valores mixtos · 8-13, 15-20');
  });

  it('handles manual range edge labels and warnings', () => {
    expect(getManualRangeCountLabel({ type: 'manualRange', ranges: [] })).toBe('0 rangos configurados');
    expect(getManualRangeRowCount({ startRowNumber: 0, endRowNumber: 8 })).toBe('');
    expect(getManualRangeRowCount({ startRowNumber: 8, endRowNumber: 7 })).toBe('');
    expect(hasInvalidManualRange({ startRowNumber: 8, endRowNumber: 7 })).toBe(true);
    expect(hasOverlappingManualRanges([
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 12, endRowNumber: 15, value: 'Segundo' },
    ])).toBe(true);
    expect(hasOverlappingManualRanges([
      { id: 'first', startRowNumber: 8, endRowNumber: 13, value: 'Primero' },
      { id: 'second', startRowNumber: 14, endRowNumber: 15, value: 'Segundo' },
      { id: 'invalid', startRowNumber: 20, endRowNumber: 19, value: 'Revisar' },
    ])).toBe(false);
  });

  it('treats manual range as a step payload for the normal custom value editor', () => {
    const step = {
      id: 'range-step',
      type: 'manualRange' as const,
      mode: 'text' as const,
      ranges: [{ id: 'range-8-9', startRowNumber: 8, endRowNumber: 9, value: 'Promo' }],
      manualRangeCondition: { inputColumnId: 'input-name', operator: 'isNotEmpty' as const },
    };

    const recipe = manualRangeStepToRecipe(step);

    expect(recipe).toEqual({
      type: 'manualRange',
      ranges: step.ranges,
      condition: step.manualRangeCondition,
    });
    expect(manualRangeRecipeToStepPatch(recipe)).toEqual({
      ranges: step.ranges,
      manualRangeCondition: step.manualRangeCondition,
    });
  });

  it('keeps manual range row inputs invalid while editing empty or invalid values', () => {
    expect(parseManualRangeRowInput('')).toBeUndefined();
    expect(parseManualRangeRowInput('abc')).toBeUndefined();
    expect(parseManualRangeRowInput('0')).toBeUndefined();
    expect(parseManualRangeRowInput('8')).toBe(8);
    expect(getManualRangeRowCountFromInputs('', '13')).toBe('');
    expect(getManualRangeRowCountFromInputs('8', '')).toBe('');
    expect(getManualRangeRowCountFromInputs('13', '8')).toBe('');
    expect(getManualRangeRowCountFromInputs('8', '13')).toBe('6');
  });

  it('configures and clears manual range conditions', () => {
    const recipe = createManualRangeRecipe();
    const withCondition = updateManualRangeCondition(recipe, {
      inputColumnId: 'input-code',
      operator: 'isNotEmpty',
    });

    expect(withCondition.condition).toEqual({
      inputColumnId: 'input-code',
      operator: 'isNotEmpty',
    });
    expect(updateManualRangeCondition(withCondition, null)).toEqual({
      type: 'manualRange',
      ranges: [],
    });
  });

  it('builds a numeric custom value with one input part and one numeric final step', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-price' }],
      steps: [{ type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    });
  });

  it('builds a text custom value with one input part and one text final step', () => {
    const recipe = buildSimpleCustomValueRecipe('text', 'input-pack', {
      id: 'suffix',
      type: 'addSuffix',
      value: 'lts',
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-pack' }],
      steps: [{ type: 'addSuffix', value: 'lts' }],
    });
  });

  it('does not show invented preview before custom value is configured', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' })).toBe('Sin valores configurados');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true)).toBe('Configurá el Paso 1 para ver la vista previa.');
  });

  it('previews a top-level manual range step using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'PINCELES SERIE 304' }],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': 'Fuera' } },
      { rowNumber: 8, values: { 'input-code': 'Dentro' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera' }, true, 'text', rows)).toBe('Fila 8: PINCELES SERIE 304');
  });

  it('previews a manual range input source using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: { source: { type: 'input', inputColumnId: 'input-name' }, steps: [] },
        }],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-name': 'Fuera' } },
      { rowNumber: 8, values: { 'input-name': 'Sinteplast' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-name': 'Fuera' }, true, 'text', rows)).toBe('Fila 8: Sinteplast');
  });

  it('previews manual range value recipe transformations over input sources', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }, { id: 'upper-step', mode: 'text', type: 'uppercase' }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, undefined, true, 'text', [
      { rowNumber: 8, values: { 'input-name': '  Sinteplast  ' } },
    ])).toBe('Fila 8: SINTEPLAST');
  });

  it('previews manual range value recipe transformations over fixed and range text sources', () => {
    const fixedRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'fixedText', value: 'Promo' },
            steps: [{ id: 'suffix-step', mode: 'text', type: 'addSuffix', value: ' OK' }],
          },
        }],
      }],
    };
    const rangeTextRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      ...fixedRecipe,
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: '  Promo  ' },
            steps: [{ id: 'trim-step', mode: 'text', type: 'trim' }],
          },
        }],
      }],
    };
    const rows = [{ rowNumber: 8, values: { 'input-name': 'Sinteplast' } }];

    expect(buildCustomValuePreview(fixedRecipe, undefined, true, 'text', rows)).toBe('Fila 8: Promo OK');
    expect(buildCustomValuePreview(rangeTextRecipe, undefined, true, 'text', rows)).toBe('Fila 8: Promo');
  });

  it('previews manual range value recipe concat transformations using previous result and row inputs', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
            steps: [{
              id: 'concat-step',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' ' },
              ],
            }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, undefined, true, 'text', [
      { rowNumber: 8, values: { 'input-pack': '12' } },
    ])).toBe('Fila 8: PINCELES SERIE 304 12');
  });

  it('previews manual range concat value recipes even when the base source is empty', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'fixedText', value: '' },
            steps: [{
              id: 'concat-step',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            }],
          },
        }],
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-name': 'Fuera', 'input-pack': 'NO' }, true, 'text', [
      { rowNumber: 1, values: { 'input-name': 'Fuera', 'input-pack': 'NO' } },
      { rowNumber: 8, values: { 'input-name': 'PINCELES SERIE 304', 'input-pack': 'VIR 1' } },
    ])).toBe('Fila 8: PINCELES SERIE 304VIR 1');
  });

  it('previews a manual range nested inside concat using a real row inside the range', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{
        id: 'concat',
        type: 'concat',
        mode: 'text',
        parts: [
          {
            id: 'range-part',
            source: { type: 'previousResult' },
            steps: [{
              id: 'range',
              type: 'manualRange',
              mode: 'text',
              ranges: [{
                id: 'range-8-13',
                startRowNumber: 8,
                endRowNumber: 13,
                valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
              }],
            }],
          },
          { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' - ' },
        ],
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': 'Fuera', 'input-pack': '99' } },
      { rowNumber: 8, values: { 'input-code': 'PINCELES SERIE 304', 'input-pack': '12' } },
    ];

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera', 'input-pack': '99' }, true, 'concat', rows)).toBe('Fila 8: PINCELES SERIE 304 - 12');
  });

  it('respects manual range internal conditions when choosing the preview row', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Con condicion' }],
        manualRangeCondition: { inputColumnId: 'input-pack', operator: 'isNotEmpty' },
      }],
    };
    const rows: InputRow[] = [
      { rowNumber: 8, values: { 'input-pack': '' } },
      { rowNumber: 9, values: { 'input-pack': '12' } },
    ];

    expect(buildManualRangeAwarePreview(recipe, rows)).toBe('Fila 9: Con condicion');
  });

  it('does not show misleading range previews when no real row matches', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [],
      separator: '',
      steps: [{
        id: 'range',
        type: 'manualRange',
        mode: 'text',
        ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'No usar' }],
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-code': 'Fuera' }, true, 'text', [
      { rowNumber: 1, values: { 'input-code': 'Fuera' } },
    ])).toBe('Sin vista previa para los rangos configurados');
  });

  it('does not preview previous result for the first step', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-code' } },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'as4350' }, 0)).toBeNull();
  });

  it('previews the value generated before a later step', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-code' } },
        {
          id: 'concat',
          mode: 'text',
          type: 'concat',
          parts: [
            { id: 'previous', source: { type: 'previousResult' } },
            { id: 'suffix', source: { type: 'fixedText', value: '-' } },
          ],
        },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'as4350' }, 1)).toBe('AS4350');
  });

  it('shows fixed previous result values when the previous chain is deterministic', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'fixed', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'asd' } },
        { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        { id: 'suffix', mode: 'text', type: 'addSuffix', source: { type: 'previousResult' }, value: '!' },
      ],
    };

    expect(isDeterministicPreviousResultRecipe({ ...recipe, steps: recipe.steps?.slice(0, 1) })).toBe(true);
    expect(getPreviousResultDisplay(recipe, undefined, [], 1)).toEqual({
      value: 'asd',
      helpText: 'Este valor viene del paso anterior.',
    });
    expect(getPreviousResultDisplay(recipe, undefined, [], 2)?.value).toBe('ASD');
  });

  it('treats legacy fixed text parts as deterministic previous results', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      parts: [{ id: 'legacy-fixed', type: 'text', value: 'asd' }],
      separator: '',
      steps: [
        { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };

    expect(getPreviousResultDisplay(recipe, undefined, [], 1)?.value).toBe('asd');
  });

  it('shows dynamic previous result copy instead of the first sample value for input columns', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'input', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
        { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };
    const display = getPreviousResultDisplay(recipe, { 'input-code': 'ACCESORIOS' }, [], 1);

    expect(display?.value).toBe('Valor dinámico');
    expect(display?.value).not.toBe('ACCESORIOS');
    expect(display?.helpText).toBe('Este valor cambia según la fila. Ejemplos:\n- ACCESORIOS');
  });

  it('shows dynamic examples from transformed previous results when available', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'input', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
        { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        { id: 'suffix', mode: 'text', type: 'addSuffix', source: { type: 'previousResult' }, value: '!' },
      ],
    };
    const rows: InputRow[] = [
      { rowNumber: 1, values: { 'input-code': 'accesorios' } },
      { rowNumber: 2, values: { 'input-code': 'pinceles' } },
      { rowNumber: 3, values: { 'input-code': 'lista de precios 57' } },
      { rowNumber: 4, values: { 'input-code': 'otro' } },
    ];
    const display = getPreviousResultDisplay(recipe, undefined, rows, 2);

    expect(display?.value).toBe('Valor dinámico');
    expect(display?.helpText).toBe('Este valor cambia según la fila. Ejemplos:\n- ACCESORIOS\n- PINCELES\n- LISTA DE PRECIOS 57');
  });

  it('treats previous steps with conditions as dynamic even when their source is fixed', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'text', value: '' }],
      separator: '',
      steps: [
        {
          id: 'fixed-conditional',
          mode: 'text',
          type: 'noop',
          source: { type: 'fixedText', value: 'asd' },
          condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty' },
        },
        { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };

    expect(getPreviousResultDisplay(recipe, undefined, [], 1)).toEqual({
      value: 'Valor dinámico',
      helpText: 'Este valor cambia según la fila.',
    });
  });

  it('renders fixed and dynamic previous result values in the readonly field', () => {
    const fixedMarkup = renderRecipeEditorMarkup({
      id: 'previous-fixed-ui',
      label: 'Anterior fijo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'text', value: '' }],
        separator: '',
        steps: [
          { id: 'fixed', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'asd' } },
          { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        ],
      },
    });
    const dynamicMarkup = renderRecipeEditorMarkup({
      id: 'previous-dynamic-ui',
      label: 'Anterior dinamico',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'input', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
          { id: 'upper', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        ],
      },
    }, { sampleInputValues: { 'input-code': 'ACCESORIOS' } });

    expect(fixedMarkup).toContain('previousResultValueField');
    expect(fixedMarkup).toContain('value="asd"');
    expect(dynamicMarkup).toContain('previousResultValueField');
    expect(dynamicMarkup).toContain('value="Valor dinámico"');
    expect(dynamicMarkup).not.toContain('value="ACCESORIOS"');
  });

  it('respects previous step conditions when previewing previous result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        {
          id: 'suffix',
          type: 'addSuffix',
          source: { type: 'input', inputColumnId: 'input-code' },
          value: '-OK',
          condition: {
            target: 'input',
            columnId: 'input-pack',
            operator: 'equals',
            value: 'aplicar',
          },
        },
        { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };

    expect(getPreviousStepPreviewValue(recipe, { 'input-code': 'AS4350', 'input-pack': 'omitir' }, 1)).toBe('AS4350');
  });

  it('does not mutate recipe when previewing previous result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [
        { id: 'suffix', type: 'addSuffix', source: { type: 'input', inputColumnId: 'input-code' }, value: '-' },
        { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
      ],
    };
    const originalSteps = recipe.steps;
    const before = JSON.stringify(recipe);

    getPreviousStepPreviewValue(recipe, { 'input-code': 'AS4350' }, 1);

    expect(JSON.stringify(recipe)).toBe(before);
    expect(recipe.steps).toBe(originalSteps);
  });

  it('keeps concat mode selected with an empty combine recipe', () => {
    const recipe = createCustomValueRecipeForMode('concat', { type: 'combine', parts: [], separator: '' });

    expect(recipe).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
    expect(buildCustomValuePreview(recipe, { 'input-price': '100' })).toBe('Agrega una parte para ver la vista previa.');
  });

  it('keeps value construction options separate from step modes', () => {
    expect(valueConstructionOptions.map((option) => option.value)).toEqual(['steps', 'concat']);
    expect(valueConstructionOptions.map((option) => option.value)).not.toContain('conversion');
    expect(stepModeOptions.map((option) => option.value)).toEqual(['text', 'number', 'conversion', 'date', 'manualRange']);
    expect(stepModeOptions.find((option) => option.value === 'date')?.label).toBe('Trabajar con fechas');
    expect(stepModeOptions.find((option) => option.value === 'manualRange')?.label).toBe('Trabajar con rangos');
    expect(stepModeOptions.map((option) => option.value)).not.toContain('concat');
  });

  it('keeps manual range available only for top-level operation modes', () => {
    expect(getStepModeOptions().map((option) => option.value)).toContain('manualRange');
    expect(getStepModeOptions({ allowManualRange: false }).map((option) => option.value)).toEqual(['text', 'number', 'conversion', 'date']);
    expect(getStepModeOptions({ allowManualRange: false }).map((option) => option.label)).toContain('Trabajar con texto');
    expect(getStepModeOptions({ allowManualRange: false }).map((option) => option.label)).not.toContain('Trabajar con rangos');
  });

  it('maps construction modes to safe combine recipes', () => {
    expect(createRecipeForConstructionMode('steps', { type: 'combine', customMode: 'concat', parts: [], separator: '' })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });

    expect(createRecipeForConstructionMode('concat', {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-name' }],
      steps: [{ id: 'noop', type: 'noop', mode: 'text' }],
    })).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
  });

  it('does not inherit a concat part column when switching from concat to steps', () => {
    expect(createRecipeForConstructionMode('steps', {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
      separator: '',
    })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });
  });

  it('infers simple mixed-step recipes as a value with steps, not concat', () => {
    expect(buildCustomValuePreview(
      {
        type: 'combine',
        parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'extract', type: 'extractNumber' },
          { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
        ],
      },
      { 'input-code': 'hay 25 personas' },
      true,
    )).toBe('35');
  });

  it('starts text and number modes with a neutral step', () => {
    const textRecipe = createCustomValueRecipeForMode('text', { type: 'combine', parts: [], separator: '' });
    const numberRecipe = createCustomValueRecipeForMode('number', { type: 'combine', parts: [], separator: '' });

    expect(textRecipe.steps).toMatchObject([{ type: 'noop' }]);
    expect(numberRecipe.steps).toMatchObject([{ type: 'noop' }]);
  });

  it('filters step options by step mode', () => {
    expect(getStepTypesForMode('text').find((stepType) => stepType.value === 'noop')?.label).toBe('Usar valor tal cual');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).toContain('addSuffix');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).not.toContain('manualRange');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).toContain('concat');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).not.toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).not.toContain('addSuffix');
    expect(getStepTypesForMode('conversion').map((stepType) => stepType.value)).toEqual(['noop', 'extractNumber', 'toNumber', 'toText']);
    expect(getStepTypesForMode('date').map((stepType) => stepType.value)).toEqual(['noop', 'formatDate']);
    expect(getStepTypesForMode('manualRange').map((stepType) => stepType.value)).toEqual(['manualRange']);
    expect(getStepTypesForMode('date').find((stepType) => stepType.value === 'formatDate')?.label).toBe('Formatear fecha');
  });

  it('shows manual range as an operation mode instead of a text action', () => {
    expect(stepModeOptions).toContainEqual({ value: 'manualRange', label: 'Trabajar con rangos' });
    expect(shouldShowStepTypeSelectForStep({ id: 'range-step', type: 'manualRange', ranges: [] })).toBe(false);
    expect(shouldShowStepTypeSelectForStep({ id: 'text-step', type: 'addSuffix', value: 'lts' })).toBe(true);
  });

  it('creates a manual range step when selecting the manual range operation mode', () => {
    expect(changeStepMode({ id: 'step-1', type: 'noop', mode: 'text' }, 'manualRange')).toMatchObject({
      id: 'step-1',
      mode: 'manualRange',
      type: 'manualRange',
      ranges: [],
    });
  });

  it('renders existing manual range steps as the manual range operation mode', () => {
    expect(getStepMode({ id: 'range-step', type: 'manualRange', ranges: [] })).toBe('manualRange');
    expect(inferStepModeFromType('manualRange')).toBe('manualRange');
  });

  it('exposes date input formats for real spreadsheet display values', () => {
    expect(dateInputFormatOptions.map((option) => option.value)).toContain('MM/DD/YY');
    expect(dateInputFormatOptions.map((option) => option.value)).toContain('M/D/YY');
    expect(dateInputFormatOptions.find((option) => option.value === 'DD/MM/YYYY')?.label).toBe('DD/MM/AAAA');
    expect(dateInputFormatOptions.find((option) => option.value === 'M/D/YYYY')?.label).toBe('M/D/AAAA');
    expect(dateInputFormatOptions.find((option) => option.value === 'MM/DD/YY')?.label).toBe('MM/DD/AA');
    expect(dateInputFormatOptions.find((option) => option.value === 'M/D/YY')?.label).toBe('M/D/AA');
    expect(dateOutputFormatOptions.map((option) => option.value)).toEqual([
      'DD/MM/YYYY',
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'YYYY/MM/DD',
    ]);
    expect(dateOutputFormatOptions.find((option) => option.value === 'YYYY-MM-DD')?.label).toBe('AAAA-MM-DD');
  });

  it('does not offer concat inside concat part transformations', () => {
    expect(getStepTypesForMode('text', { allowConcat: false }).map((stepType) => stepType.value)).toContain('uppercase');
    expect(getStepTypesForMode('text', { allowConcat: false }).map((stepType) => stepType.value)).not.toContain('concat');
  });

  it('shows a neutral integrated primary transform for concat parts without steps', () => {
    expect(getVisibleConcatPartPrimaryStep([])).toMatchObject({
      type: 'noop',
      mode: 'text',
    });
  });

  it('creates the first concat part step when editing the integrated transform', () => {
    expect(updateConcatPartPrimaryStep([], { type: 'uppercase', mode: 'text' })).toMatchObject([
      { type: 'uppercase', mode: 'text' },
    ]);
  });

  it('keeps additional concat part steps when updating the integrated transform', () => {
    expect(updateConcatPartPrimaryStep([
      { id: 'primary', type: 'trim' },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ], { type: 'uppercase', mode: 'text' })).toMatchObject([
      { id: 'primary', type: 'uppercase', mode: 'text' },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ]);
  });

  it('exposes real numeric operations without the numericOperation label for the number UI', () => {
    expect(numericOperationOptions.map((option) => option.label)).toEqual([
      'Sumar valor',
      'Restar valor',
      'Multiplicar por valor',
      'Dividir por valor',
      'Sumar %',
      'Restar %',
      'Quitar % incluido',
    ]);
    expect(numericOperationOptions.map((option) => option.label)).not.toContain('Operación numérica');
  });

  it('uses plural number mode copy and contextual numeric operand labels', () => {
    expect(stepModeOptions.find((option) => option.value === 'number')?.label).toBe('Trabajar con números');
    expect(getNumericOperandLabels('add')).toEqual({ left: 'Valor base', right: 'Valor a sumar' });
    expect(getNumericOperandLabels('subtract')).toEqual({ left: 'Valor base', right: 'Valor a restar' });
    expect(getNumericOperandLabels('multiply')).toEqual({ left: 'Valor base', right: 'Factor' });
    expect(getNumericOperandLabels('divide')).toEqual({ left: 'Valor base', right: 'Divisor' });
    expect(getNumericOperandLabels('addPercentage')).toEqual({ left: 'Valor base', right: '%' });
    expect(getNumericOperandLabels('subtractPercentage')).toEqual({ left: 'Valor base', right: '%' });
    expect(getNumericOperandLabels('removeIncludedPercentage')).toEqual({
      left: 'Valor con % incluido',
      right: '% incluido',
    });
  });

  it('filters numeric operand columns with the motor parser', () => {
    const columns: InputColumn[] = [
      { id: 'text', columnIndex: 0, columnLetter: 'A', label: 'A', active: true, sampleValues: ['ACCESORIOS', 'PINCEL'], nonEmptyCount: 2 },
      { id: 'currency', columnIndex: 1, columnLetter: 'B', label: 'B', active: true, sampleValues: ['$ 1,948.63'], nonEmptyCount: 1 },
      { id: 'mixed', columnIndex: 2, columnLetter: 'C', label: 'C', active: true, sampleValues: ['texto'], nonEmptyCount: 2 },
    ];

    expect(getNumericOperandInputColumns(columns, [
      { rowNumber: 1, values: { text: 'LISTA DE PRECIOS', mixed: '576087' } },
    ]).map((column) => column.id)).toEqual(['currency', 'mixed']);
  });

  it('filters range numeric operand columns with covered rows only', () => {
    const columns: InputColumn[] = [
      { id: 'inside', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Inside', active: true, sampleValues: [''], nonEmptyCount: 1 },
      { id: 'outside', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'Outside', active: true, sampleValues: ['999'], nonEmptyCount: 1 },
    ];
    const coveredRows = [
      { rowNumber: 1, values: { inside: '12', outside: '' } },
      { rowNumber: 2, values: { inside: '', outside: '' } },
    ];
    const markup = renderToStaticMarkup(
      <StepEditorBlock
        step={{
          id: 'range-numeric-operands',
          mode: 'number',
          type: 'numericOperation',
          operation: 'add',
          leftOperand: { type: 'input', inputColumnId: 'inside' },
          rightOperand: { type: 'fixedText', value: '10' },
        }}
        context={{ kind: 'range', stepIndex: 0 }}
        inputColumns={columns}
        manualRangeRows={[...coveredRows, { rowNumber: 8, values: { inside: '', outside: '999' } }]}
        inputCompatibilityRows={coveredRows}
        onChange={() => undefined}
        onReplace={() => undefined}
      />,
    );

    expect(getNumericOperandInputColumns(columns, coveredRows, { includeSampleValues: false }).map((column) => column.id)).toEqual(['inside']);
    expect(markup).toContain('A - Inside');
    expect(markup).not.toContain('B - Outside');
    expect(markup).not.toContain('No se muestran algunas columnas porque no contienen valores numéricos compatibles.');
  });

  it('renders the numeric formula constructor inside manual range value recipes', () => {
    const columns: InputColumn[] = [
      { id: 'price', columnIndex: 0, columnLetter: 'A', label: 'A', header: 'Precio', active: true, sampleValues: ['100'], nonEmptyCount: 1 },
      { id: 'tax', columnIndex: 1, columnLetter: 'B', label: 'B', header: 'IVA', active: true, sampleValues: ['21'], nonEmptyCount: 1 },
    ];
    const markup = renderRangeValueEditor({
      id: 'range-formula',
      startRowNumber: 1,
      endRowNumber: 1,
      valueRecipe: {
        source: { type: 'fixedText', value: '' },
        steps: [{
          id: 'formula',
          mode: 'number',
          type: 'numericFormula',
          formula: {
            version: 1,
            expression: {
              kind: 'binary',
              operator: 'add',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'price' } },
              right: { kind: 'operand', operand: { type: 'input', inputColumnId: 'tax' } },
            },
          },
          rounding: 2,
        }],
      },
    }, {
      inputColumns: columns,
      manualRangeRows: [{ rowNumber: 1, values: { price: '100', tax: '21' } }],
    });

    expect(markup).toContain('numericFormulaFields');
    expect(markup).toContain('Calcular fórmula');
    expect(markup).toContain('Editor de fórmula');
    expect(markup).toContain('Agregar valor');
    expect(markup).toContain('A - Precio + B - IVA');
    expect(markup).not.toContain('Convertir en grupo');
    expect(markup).not.toContain('Agregar operacion al resultado');
    expect(markup).not.toContain('Tipo de fórmula');
    expect(markup).not.toContain('Formula izquierda');
  });

  it('shows a clear state when numeric operands have no available columns', () => {
    const markup = renderToStaticMarkup(
      <StepEditorBlock
        step={{
          id: 'numeric-no-columns',
          mode: 'number',
          type: 'numericOperation',
          operation: 'add',
          leftOperand: { type: 'input', inputColumnId: 'input-code' },
          rightOperand: { type: 'fixedText', value: '10' },
        }}
        context={{ kind: 'normal', stepIndex: 0 }}
        inputColumns={[{ ...inputColumns[0], sampleValues: ['ACCESORIOS'] }]}
        manualRangeRows={[{ rowNumber: 1, values: { 'input-code': 'PINCEL' } }]}
        onChange={() => undefined}
        onReplace={() => undefined}
      />,
    );

    expect(markup).toContain('Sin columnas numéricas disponibles');
    expect(markup).toContain('disabled=""');
  });

  it('shows explicit numeric preview states for incomplete, invalid, and complete operands', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      separator: '',
      steps: [{
        id: 'add',
        mode: 'number',
        type: 'numericOperation',
        operation: 'add',
        leftOperand: { type: 'fixedText', value: '100' },
        rightOperand: { type: 'fixedText', value: '' },
        rounding: 0,
      }],
    };

    expect(buildCustomValuePreview(recipe, {}, true, 'number')).toBe('Completá Valor a sumar para ver la vista previa.');
    expect(buildCustomValuePreview({
      ...recipe,
      steps: [{ ...recipe.steps![0], rightOperand: { type: 'input', inputColumnId: 'text' } }],
    }, { text: 'ACCESORIOS' }, true, 'number', [
      { rowNumber: 1, values: { text: 'PINCEL' } },
    ])).toBe('No se encontraron valores numéricos para calcular la vista previa.');
    expect(buildCustomValuePreview({
      ...recipe,
      steps: [{ ...recipe.steps![0], rightOperand: { type: 'fixedText', value: '10' } }],
    }, {}, true, 'number')).toBe('110');
  });

  it('previews simple and grouped numeric formulas through the real motor', () => {
    const baseRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      separator: '',
      steps: [{
        id: 'formula',
        mode: 'number',
        type: 'numericFormula',
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'add',
            left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'a' } },
            right: { kind: 'operand', operand: { type: 'input', inputColumnId: 'b' } },
          },
        },
        rounding: 0,
      }],
    };

    expect(buildCustomValuePreview(baseRecipe, { a: '10', b: '4' }, true, 'number')).toBe('14');
    expect(buildCustomValuePreview({
      ...baseRecipe,
      steps: [{
        ...baseRecipe.steps![0],
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'subtract',
            left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'a' } },
            right: {
              kind: 'binary',
              operator: 'multiply',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'b' } },
              right: { kind: 'operand', operand: { type: 'input', inputColumnId: 'c' } },
            },
          },
        },
      }],
    }, { a: '100', b: '5', c: '4' }, true, 'number')).toBe('80');
  });

  it('previews numeric formulas after adding an operation to the result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      separator: '',
      steps: [{
        id: 'formula',
        mode: 'number',
        type: 'numericFormula',
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'add',
            left: {
              kind: 'binary',
              operator: 'subtract',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'a' } },
              right: {
                kind: 'binary',
                operator: 'multiply',
                left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'b' } },
                right: { kind: 'operand', operand: { type: 'input', inputColumnId: 'c' } },
              },
            },
            right: { kind: 'operand', operand: { type: 'input', inputColumnId: 'd' } },
          },
        },
        rounding: 0,
      }],
    };

    expect(buildCustomValuePreview(recipe, { a: '100', b: '5', c: '4', d: '3' }, true, 'number')).toBe('83');
  });

  it('keeps numeric formula preview errors consistent for zero division and text values', () => {
    const divideByZeroRecipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      separator: '',
      steps: [{
        id: 'formula',
        mode: 'number',
        type: 'numericFormula',
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'divide',
            left: { kind: 'operand', operand: { type: 'fixedText', value: '100' } },
            right: { kind: 'operand', operand: { type: 'fixedText', value: '0' } },
          },
        },
        rounding: 2,
      }],
    };

    expect(buildCustomValuePreview(divideByZeroRecipe, {}, true, 'number')).toBe('');
    expect(getNumericFormulaUiWarning(divideByZeroRecipe.steps![0].formula)).toBe('No se puede dividir por cero.');
    expect(buildCustomValuePreview({
      ...divideByZeroRecipe,
      steps: [{
        ...divideByZeroRecipe.steps![0],
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'add',
            left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'text' } },
            right: { kind: 'operand', operand: { type: 'fixedText', value: '10' } },
          },
        },
      }],
    }, { text: 'ABC' }, true, 'number', [{ rowNumber: 1, values: { text: 'ABC' } }])).toBe('No se encontraron valores numéricos para calcular la vista previa.');
  });

  it('applies numeric formula rounding only to the final result', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      separator: '',
      steps: [{
        id: 'formula',
        mode: 'number',
        type: 'numericFormula',
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'multiply',
            left: {
              kind: 'binary',
              operator: 'divide',
              left: { kind: 'operand', operand: { type: 'fixedText', value: '10' } },
              right: { kind: 'operand', operand: { type: 'fixedText', value: '3' } },
            },
            right: { kind: 'operand', operand: { type: 'fixedText', value: '3' } },
          },
        },
        rounding: 2,
      }],
    };

    expect(buildCustomValuePreview(recipe, {}, true, 'number')).toBe('10.00');
  });

  it('uses percent labels in incomplete previews and omits unconfigured zero from titles', () => {
    const emptyPercentageStep = {
      id: 'remove-percentage',
      mode: 'number' as const,
      type: 'numericOperation' as const,
      operation: 'removeIncludedPercentage' as const,
      leftOperand: { type: 'fixedText' as const, value: '120' },
      rightOperand: { type: 'fixedText' as const, value: '' },
    };
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'number',
      parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
      steps: [emptyPercentageStep],
    };

    expect(buildCustomValuePreview(recipe, {}, true, 'number')).toBe('Completá % incluido para ver la vista previa.');
    expect(getRecipeStepTitle(emptyPercentageStep)).toBe('Quitar % incluido');
    expect(getRecipeStepTitle({
      ...emptyPercentageStep,
      rightOperand: { type: 'fixedText', value: '20' },
    })).toBe('Quitar 20% incluido');
  });

  it('builds compact warnings for deterministic invalid numeric operands', () => {
    expect(getNumericOperationUiWarning(
      'add',
      { type: 'fixedText', value: 'abc' },
      { type: 'fixedText', value: '10' },
    )).toBe('No se pudo calcular: el valor no es numérico.');
    expect(getNumericOperationUiWarning(
      'divide',
      { type: 'fixedText', value: '100' },
      { type: 'fixedText', value: '0' },
    )).toBe('No se pudo calcular: división por cero.');
    expect(getNumericOperationUiWarning(
      'removeIncludedPercentage',
      { type: 'fixedText', value: '100' },
      { type: 'fixedText', value: '-100' },
    )).toBe('No se pudo calcular: división por cero.');
  });

  it('renders contextual numeric fields with a compact deterministic warning', () => {
    const markup = renderToStaticMarkup(
      <StepEditorBlock
        step={{
          id: 'divide-zero',
          mode: 'number',
          type: 'numericOperation',
          operation: 'divide',
          leftOperand: { type: 'fixedText', value: '100' },
          rightOperand: { type: 'fixedText', value: '0' },
        }}
        context={{ kind: 'normal', stepIndex: 0, defaultInputColumnId: 'input-code' }}
        inputColumns={inputColumns}
        onChange={() => undefined}
        onReplace={() => undefined}
      />,
    );

    expect(markup).toContain('Valor base');
    expect(markup).toContain('Divisor');
    expect(markup).toContain('warningTooltipTrigger');
    expect(markup).toContain('No se pudo calcular: división por cero.');
  });

  it('infers step mode from existing step type', () => {
    expect(inferStepModeFromType('addSuffix')).toBe('text');
    expect(inferStepModeFromType('numericOperation')).toBe('number');
    expect(inferStepModeFromType('extractNumber')).toBe('conversion');
    expect(inferStepModeFromType('formatDate')).toBe('date');
    expect(getStepMode({ id: 'noop', type: 'noop' }, 'number')).toBe('number');
  });

  it('keeps different modes in different steps', () => {
    const steps = normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 },
    ], 'text');

    expect(steps).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
    ]);
  });

  it('resets only the changed incompatible step to noop', () => {
    expect(changeStepMode({ id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' }, 'number')).toEqual({
      id: 'suffix',
      mode: 'number',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 }, 'text')).toEqual({
      id: 'numeric',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'text', type: 'toText', mode: 'conversion' }, 'conversion')).toEqual({ mode: 'conversion' });
    expect(changeStepMode({ id: 'date', type: 'formatDate', mode: 'date' }, 'date')).toEqual({ mode: 'date' });
  });

  it('creates clean whole steps when changing operation mode', () => {
    const dateToText = replaceWholeStepForMode({
      id: 'date',
      mode: 'date',
      type: 'formatDate',
      source: { type: 'fixedText', value: '2026-06-28' },
      dateInputFormat: 'YYYY-MM-DD',
      dateOutputFormat: 'DD/MM/YYYY',
      dateInvalidFallback: 'fixedText',
      dateInvalidFallbackText: 'Sin fecha',
      condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty' },
    }, 'text');
    expect(dateToText).toEqual({
      id: 'date',
      mode: 'text',
      type: 'noop',
      condition: { target: 'input', columnId: 'input-code', operator: 'isNotEmpty' },
      applyToEmptyValues: false,
    });
    expect(dateToText).not.toHaveProperty('source');
    expect(dateToText).not.toHaveProperty('dateInputFormat');
    expect(dateToText).not.toHaveProperty('dateInvalidFallback');

    const numberToText = replaceWholeStepForMode({
      id: 'number',
      mode: 'number',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
      leftOperand: { type: 'previousResult' },
      rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
    }, 'text');
    expect(numberToText).toEqual({
      id: 'number',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(numberToText).not.toHaveProperty('operation');
    expect(numberToText).not.toHaveProperty('amount');
    expect(numberToText).not.toHaveProperty('rounding');
    expect(numberToText).not.toHaveProperty('leftOperand');

    const textToRange = replaceWholeStepForMode({
      id: 'text',
      mode: 'text',
      type: 'replaceText',
      source: { type: 'fixedText', value: 'Base' },
      searchValue: 'A',
      replaceValue: 'B',
    }, 'manualRange');
    expect(textToRange).toMatchObject({
      id: 'text',
      mode: 'manualRange',
      type: 'manualRange',
      ranges: [],
      applyToEmptyValues: false,
    });
    expect(textToRange).not.toHaveProperty('source');
    expect(textToRange).not.toHaveProperty('searchValue');
  });

  it('creates clean whole steps when changing the main action', () => {
    const textToDate = replaceWholeStepForAction({
      id: 'replace',
      mode: 'text',
      type: 'replaceText',
      source: { type: 'fixedText', value: 'Base' },
      value: 'legacy',
      searchValue: 'A',
      replaceValue: 'B',
    }, 'formatDate', 'date');
    expect(textToDate).toMatchObject({
      id: 'replace',
      mode: 'date',
      type: 'formatDate',
      dateInputFormat: 'DD/MM/YYYY',
      dateOutputFormat: 'YYYY-MM-DD',
      dateInvalidFallback: 'original',
      dateInvalidFallbackText: '',
      applyToEmptyValues: false,
    });
    expect(textToDate).not.toHaveProperty('source');
    expect(textToDate).not.toHaveProperty('searchValue');
    expect(textToDate).not.toHaveProperty('replaceValue');

    const dateToFixedText = {
      ...replaceWholeStepForAction({
        id: 'date',
        mode: 'date',
        type: 'formatDate',
        source: { type: 'fixedText', value: '2026-06-28' },
        dateInputFormat: 'YYYY-MM-DD',
      }, 'noop', 'text'),
      source: { type: 'fixedText' as const, value: '' },
    };
    expect(dateToFixedText).toEqual({
      id: 'date',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
      source: { type: 'fixedText', value: '' },
    });

    expect(replaceWholeStepForAction({
      id: 'direct-date',
      mode: 'text',
      type: 'replaceText',
      source: { type: 'input', inputColumnId: 'input-code' },
      searchValue: 'A',
      replaceValue: 'B',
    }, 'noop', 'date')).toEqual({
      id: 'direct-date',
      mode: 'date',
      type: 'noop',
      applyToEmptyValues: false,
      source: { type: 'fixedText', value: '' },
    });
    expect(replaceWholeStepForAction({
      id: 'direct-number',
      mode: 'date',
      type: 'formatDate',
      dateInputFormat: 'YYYY-MM-DD',
      dateOutputFormat: 'DD/MM/YYYY',
    }, 'noop', 'number')).toEqual({
      id: 'direct-number',
      mode: 'number',
      type: 'noop',
      applyToEmptyValues: false,
      source: { type: 'fixedText', value: '' },
    });
  });

  it('infers missing modes without forcing all steps to recipe mode', () => {
    expect(normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 },
      { id: 'convert', type: 'toText' },
    ], 'text')).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
      { id: 'convert', type: 'toText', mode: 'conversion' },
    ]);
  });

  it('shows a neutral first step directly for an empty custom value recipe', () => {
    expect(getVisibleRecipeSteps({ type: 'combine', parts: [], separator: '' })).toMatchObject([
      { type: 'noop', mode: 'text' },
    ]);
  });

  it('adapts old concat recipes to a visible concat step without losing parts', () => {
    const steps = getVisibleRecipeSteps({
      type: 'combine',
      customMode: 'concat',
      parts: [
        {
          id: 'name',
          type: 'input',
          inputColumnId: 'input-name',
          separatorAfter: ' - ',
          steps: [{ id: 'trim', type: 'trim' }],
        },
        { id: 'fixed', type: 'text', value: 'OK' },
      ],
      separator: '',
      steps: [{ id: 'suffix', type: 'addSuffix', value: '!' }],
    });

    expect(steps).toMatchObject([
      {
        type: 'concat',
        mode: 'text',
        parts: [
          {
            id: 'name',
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{ id: 'trim', type: 'trim' }],
          },
          {
            id: 'fixed',
            source: { type: 'fixedText', value: 'OK' },
            separatorBefore: ' - ',
          },
        ],
      },
      { id: 'suffix', type: 'addSuffix', value: '!' },
    ]);
  });

  it('creates safe default concat parts without separators on the first part', () => {
    const firstPart = createDefaultConcatPart(0);
    const secondPart = createDefaultConcatPart(1);
    const laterStepPart = createDefaultConcatPart(0, true);

    expect(firstPart).toMatchObject({
      source: { type: 'input', inputColumnId: '' },
    });
    expect(firstPart).not.toHaveProperty('separatorBefore');
    expect(secondPart).toMatchObject({
      source: { type: 'input', inputColumnId: '' },
      separatorBefore: '',
    });
    expect(laterStepPart).toMatchObject({
      source: { type: 'previousResult' },
    });
    expect(laterStepPart).not.toHaveProperty('separatorBefore');
  });

  it('keeps a valid selected concat part after add/remove flows', () => {
    const parts = [
      { id: 'first', source: { type: 'input' as const, inputColumnId: 'input-name' } },
      { id: 'second', source: { type: 'fixedText' as const, value: ' - ' }, separatorBefore: '' },
      { id: 'third', source: { type: 'input' as const, inputColumnId: 'input-pack' }, separatorBefore: '' },
    ];

    expect(getSafeSelectedConcatPartId(parts, 'second')).toBe('second');
    expect(getSafeSelectedConcatPartId(parts, 'missing')).toBe('first');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'second', 'second')).toBe('third');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'third', 'third')).toBe('second');
    expect(getNextSelectedConcatPartIdAfterRemove(parts, 'first', 'third')).toBe('third');
    expect(getNextSelectedConcatPartIdAfterRemove([{ id: 'only', source: { type: 'previousResult' as const } }], 'only', 'only')).toBeNull();
  });

  it('updates concat parts in a list without changing order or unrelated parts', () => {
    const parts = [
      { id: 'first', source: { type: 'input' as const, inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' as const }] },
      { id: 'second', source: { type: 'fixedText' as const, value: 'OK' }, separatorBefore: ' - ' },
    ];

    expect(updateConcatPartInList(parts, 'first', { source: { type: 'input', inputColumnId: 'input-pack' } })).toEqual([
      { id: 'first', source: { type: 'input', inputColumnId: 'input-pack' }, steps: [{ id: 'trim', type: 'trim' }] },
      parts[1],
    ]);
    expect(updateConcatPartInList(parts, 'missing', { separatorBefore: ' / ' })).toEqual(parts);
  });

  it('adds and removes concat parts without changing remaining part content', () => {
    const parts = [
      { id: 'first', source: { type: 'input' as const, inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' as const }] },
      { id: 'second', source: { type: 'fixedText' as const, value: 'OK' }, separatorBefore: ' - ' },
    ];
    const nextPart = { id: 'third', source: { type: 'input' as const, inputColumnId: '' } };

    expect(addConcatPartToList(parts, nextPart)).toEqual([...parts, nextPart]);
    expect(removeConcatPartFromList([...parts, nextPart], 'second')).toEqual([parts[0], nextPart]);
    expect(removeConcatPartFromList([parts[0]], 'first', { keepAtLeastOne: true })).toEqual([parts[0]]);
  });

  it('reorders concat parts by id while preserving separators and steps', () => {
    const parts = [
      { id: 'first', source: { type: 'input' as const, inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' as const }] },
      { id: 'second', source: { type: 'fixedText' as const, value: 'OK' }, separatorBefore: ' - ' },
      { id: 'third', source: { type: 'input' as const, inputColumnId: 'input-pack' }, separatorBefore: ' / ' },
    ];

    expect(reorderConcatParts(parts, ['third', 'first'])).toEqual([parts[2], parts[0], parts[1]]);
  });

  it('converts legacy recipe parts to concat parts preserving source, separators and steps', () => {
    expect(getConcatPartsFromRecipeParts([
      { id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'trim', type: 'trim' }], separatorAfter: ' - ' },
      { id: 'fixed', type: 'text', value: 'OK' },
      { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
    ], ' / ')).toEqual([
      { id: 'name', source: { type: 'input', inputColumnId: 'input-name' }, steps: [{ id: 'trim', type: 'trim' }] },
      { id: 'fixed', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
      { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' }, separatorBefore: ' / ' },
    ]);
  });

  it('converts concat parts back to recipe parts using current legacy fallback behavior', () => {
    expect(getRecipePartFromConcatPart({
      id: 'name',
      source: { type: 'input', inputColumnId: 'input-name' },
      separatorBefore: ' - ',
      steps: [{ id: 'trim', type: 'trim' }],
    })).toEqual({
      id: 'name',
      type: 'input',
      inputColumnId: 'input-name',
      steps: [{ id: 'trim', type: 'trim' }],
    });
    expect(getRecipePartFromConcatPart({ id: 'fixed', source: { type: 'fixedText', value: 'OK' } })).toEqual({
      id: 'fixed',
      type: 'text',
      value: 'OK',
    });
    expect(getRecipePartFromConcatPart({ id: 'range', source: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'Found' } })).toMatchObject({
      id: 'range',
      type: 'text',
      value: 'Found',
      steps: [{ type: 'noop' }],
    });
    expect(getRecipePartFromConcatPart({ id: 'previous', source: { type: 'previousResult' } })).toMatchObject({
      id: 'previous',
      type: 'text',
      value: '',
      steps: [{ type: 'noop' }],
    });
  });

  it('converts one legacy recipe part to a concat part without separator context', () => {
    expect(getConcatPartFromRecipePart({
      id: 'fixed',
      type: 'text',
      value: 'OK',
      steps: [{ id: 'upper', type: 'uppercase' }],
    })).toEqual({
      id: 'fixed',
      source: { type: 'fixedText', value: 'OK' },
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
  });

  it('summarizes concat parts for the lateral list', () => {
    expect(describeConcatPartSource({ id: 'name', source: { type: 'input', inputColumnId: 'input-name' } }, inputColumns)).toBe('Columna D (Nombre)');
    expect(describeConcatPartSource({ id: 'fixed', source: { type: 'fixedText', value: ' - ' } }, inputColumns)).toBe('Texto fijo " - "');
    expect(describeConcatPartSource({ id: 'previous', source: { type: 'previousResult' } }, inputColumns)).toBe('Resultado del paso anterior');
  });

  it('summarizes manual range steps inside concat parts', () => {
    expect(describeConcatPartSource({
      id: 'range-part',
      source: { type: 'previousResult' },
      steps: [
        {
          id: 'range-step',
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              valueSource: { type: 'rangeText', inputColumnId: 'input-name', selectedText: 'PINCELES SERIE 304' },
            },
          ],
        },
      ],
    }, inputColumns)).toBe('1 rango · valores desde D - Nombre · 8-13');
  });

  it('preserves concat part steps when editing source-like fields', () => {
    const part = {
      id: 'name',
      source: { type: 'input' as const, inputColumnId: 'input-name' },
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };

    expect(updateConcatPartPrimarySource(part, { type: 'fixedText', value: 'Nombre' })).toMatchObject({
      separatorBefore: ' - ',
      source: { type: 'fixedText', value: 'Nombre' },
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
    expect({ ...part, separatorBefore: ' / ' }).toMatchObject({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
  });

  it('updates concat part primary source and optional steps without changing other part fields', () => {
    const part = {
      id: 'name',
      source: { type: 'fixedText' as const, value: 'Manual' },
      separatorBefore: ' / ',
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };

    expect(updateConcatPartPrimarySource(part, { type: 'input', inputColumnId: 'input-name' })).toEqual({
      ...part,
      source: { type: 'input', inputColumnId: 'input-name' },
    });
    expect(updateConcatPartPrimarySource(part, { type: 'fixedText', value: 'Celda elegida' }, [{ id: 'trim', type: 'trim' }])).toEqual({
      ...part,
      source: { type: 'fixedText', value: 'Celda elegida' },
      steps: [{ id: 'trim', type: 'trim' }],
    });
  });

  it('keeps concat part source previews stable for column, fixed text and picked cell text', () => {
    const recipeForPart = (part: ReturnType<typeof updateConcatPartPrimarySource>): Extract<OutputRecipe, { type: 'combine' }> => ({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{ id: 'concat', mode: 'text', type: 'concat', parts: [part] }],
    });
    const basePart = { id: 'part', source: { type: 'input' as const, inputColumnId: 'input-name' } };

    expect(buildCustomValuePreview(recipeForPart(updateConcatPartPrimarySource(basePart, { type: 'input', inputColumnId: 'input-name' })), { 'input-name': 'Pincel' })).toBe('Pincel');
    expect(buildCustomValuePreview(recipeForPart(updateConcatPartPrimarySource(basePart, { type: 'fixedText', value: 'Manual' })), { 'input-name': 'Pincel' })).toBe('Manual');
    expect(buildCustomValuePreview(recipeForPart(updateConcatPartPrimarySource(basePart, { type: 'fixedText', value: 'Celda elegida' })), { 'input-name': 'Pincel' })).toBe('Celda elegida');
  });

  it('keeps concat part internal steps evaluation when source changes', () => {
    const part = updateConcatPartPrimarySource(
      { id: 'part', source: { type: 'fixedText' as const, value: '' } },
      { type: 'input', inputColumnId: 'input-name' },
      [{ id: 'upper', type: 'uppercase' }],
    );

    expect(buildCustomValuePreview({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [{ id: 'concat', mode: 'text', type: 'concat', parts: [part] }],
    }, { 'input-name': 'pincel' })).toBe('PINCEL');
  });

  it('does not invent a transformation for a neutral first step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-name': 'latex iberia' },
      ),
    ).toBe('latex iberia');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-price': '100' },
      ),
    ).toBe('100');
  });

  it('shows numeric preview states without treating text as success', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-code', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-code': 'ABC123' })).toBe('No se pudo calcular: valor no numérico.');
  });

  it('calculates numeric preview when sample value is currency', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-price': '$ 43,138.09' })).toBe('47451.90');
  });

  it('previews text steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'upper', type: 'uppercase' },
            { id: 'suffix', type: 'addSuffix', value: ' MATE' },
          ],
        },
        { 'input-name': ' latex iberia ' },
      ),
    ).toBe('LATEX IBERIA MATE');
  });

  it('labels text source fields by operation', () => {
    expect(shouldShowTextSourceFields('uppercase')).toBe(true);
    expect(shouldShowTextSourceFields('addSuffix')).toBe(true);
    expect(shouldShowTextSourceFields('replaceText')).toBe(true);
    expect(shouldShowTextSourceFields('formatDate')).toBe(true);
    expect(shouldShowTextSourceFields('numericOperation')).toBe(false);
    expect(shouldShowTextSourceFields('concat')).toBe(false);
    expect(getTextStepSourceLabel('uppercase')).toBe('Valor a convertir');
    expect(getTextStepSourceLabel('addSuffix')).toBe('Valor base');
    expect(getTextStepSourceLabel('replaceText')).toBe('Valor base');
    expect(getTextStepSourceLabel('formatDate')).toBe('Fecha a formatear');
  });

  it('previews date formatting using the processing engine', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
          separator: '',
          steps: [{
            id: 'format-date',
            mode: 'date',
            type: 'formatDate',
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
        { 'input-date': '01/06/2024' },
      ),
    ).toBe('2024-06-01');
  });

  it('previews real spreadsheet date display values with two digit years', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
          separator: '',
          steps: [{
            id: 'format-date',
            mode: 'date',
            type: 'formatDate',
            dateInputFormat: 'MM/DD/YY',
            dateOutputFormat: 'YYYY-MM-DD',
            dateInvalidFallback: 'fixedText',
            dateInvalidFallbackText: 'Esta bonito',
          }],
        },
        { 'input-date': '6/1/24' },
      ),
    ).toBe('2024-06-01');
  });

  it('updates date preview when output format changes', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'MM/DD/YY',
        dateOutputFormat: 'YYYY-MM-DD',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '6/1/24' })).toBe('2024-06-01');
    expect(buildCustomValuePreview({
      ...recipe,
      steps: [{ ...recipe.steps![0], dateOutputFormat: 'DD/MM/YYYY' }],
    }, { 'input-date': '6/1/24' })).toBe('01/06/2024');
  });

  it('previews the first non-empty current column value for a date used as-is', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'date-as-is',
        mode: 'date',
        type: 'noop',
        source: { type: 'input', inputColumnId: 'input-date' },
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': '' } },
      { rowNumber: 2, values: { 'input-date': '31/12/2025' } },
    ])).toBe('31/12/2025');
  });

  it('previews the first parseable current column date using current formats', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        source: { type: 'input', inputColumnId: 'input-date' },
        dateInputFormat: 'DD/MM/YYYY',
        dateOutputFormat: 'YYYY-MM-DD',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': 'sin fecha' } },
      { rowNumber: 2, values: { 'input-date': '31/12/2025' } },
    ])).toBe('2025-12-31');
  });

  it('does not invent an old fixed date when the current column has no parseable dates', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        source: { type: 'input', inputColumnId: 'input-date' },
        dateInputFormat: 'DD/MM/YYYY',
        dateOutputFormat: 'YYYY-MM-DD',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': 'sin fecha' } },
    ])).toBe('sin fecha');
    expect(buildCustomValuePreview(recipe, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': 'sin fecha' } },
    ])).not.toContain('2026-07-01');
    const emptyFallbackRecipe = {
      ...recipe,
      steps: [{ ...recipe.steps![0], dateInvalidFallback: 'empty' as const }],
    };
    expect(buildCustomValuePreview(emptyFallbackRecipe, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': 'sin fecha' } },
    ])).toBe('');
    expect(buildCustomValuePreview({
      ...emptyFallbackRecipe,
      steps: [{ ...emptyFallbackRecipe.steps[0], dateOutputFormat: 'DD/MM/YYYY' }],
    }, { 'input-date': '' }, true, 'text', [
      { rowNumber: 1, values: { 'input-date': 'sin fecha' } },
    ])).toBe('');
  });

  it('applies fixed date fallback only when preview value is invalid', () => {
    const recipe: Extract<OutputRecipe, { type: 'combine' }> = {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'date', type: 'input', inputColumnId: 'input-date' }],
      separator: '',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'MM/DD/YY',
        dateOutputFormat: 'YYYY-MM-DD',
        dateInvalidFallback: 'fixedText',
        dateInvalidFallbackText: 'Esta bonito',
      }],
    };

    expect(buildCustomValuePreview(recipe, { 'input-date': '6/1/24' })).toBe('2024-06-01');
    expect(buildCustomValuePreview(recipe, { 'input-date': '31/02/24' })).toBe('Esta bonito');
  });

  it('previews uppercase with an explicit input source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-name' } },
          ],
        },
        { 'input-code': 'abc', 'input-name': 'latex iberia' },
      ),
    ).toBe('LATEX IBERIA');
  });

  it('previews addSuffix with previous result source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'suffix', type: 'addSuffix', source: { type: 'previousResult' }, value: ' MATE' },
          ],
        },
        { 'input-name': ' latex iberia ' },
      ),
    ).toBe('latex iberia MATE');
  });

  it('previews replaceText with an explicit input source', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            {
              id: 'replace',
              type: 'replaceText',
              source: { type: 'input', inputColumnId: 'input-name' },
              searchValue: 'LATEX',
              replaceValue: 'LÁTEX',
            },
          ],
        },
        { 'input-code': 'abc', 'input-name': 'PINTURA LATEX' },
      ),
    ).toBe('PINTURA LÁTEX');
  });

  it('previews numeric steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 2 },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('132.00');
  });

  it('maps old amount-based numeric steps to visible fixed right operands', () => {
    const step = {
      id: 'add',
      type: 'numericOperation' as const,
      operation: 'add' as const,
      amount: 10,
    };

    expect(getVisibleLeftOperand(step, { type: 'input', inputColumnId: 'input-price' })).toEqual({
      type: 'input',
      inputColumnId: 'input-price',
    });
    expect(getVisibleRightOperand(step)).toEqual({
      type: 'fixedText',
      value: '10',
      numericFallback: 10,
    });
  });

  it('keeps configured numeric operands visible', () => {
    const step = {
      id: 'subtract',
      type: 'numericOperation' as const,
      leftOperand: { type: 'input' as const, inputColumnId: 'input-price' },
      rightOperand: { type: 'previousResult' as const },
      amount: 10,
    };

    expect(getVisibleLeftOperand(step, { type: 'previousResult' })).toEqual({ type: 'input', inputColumnId: 'input-price' });
    expect(getVisibleRightOperand(step)).toEqual({ type: 'previousResult' });
  });

  it('previews numeric operands preserving subtraction order', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'previous-minus-input',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'previousResult' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('75');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'input-minus-previous',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'input', inputColumnId: 'input-code' },
              rightOperand: { type: 'previousResult' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('-75');
  });

  it('previews numeric operands with input plus input and division order', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('125');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'divide',
              type: 'numericOperation',
              operation: 'divide',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'input', inputColumnId: 'input-code' },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100', 'input-code': '25' },
      ),
    ).toBe('4');
  });

  it('previews numeric operands without requiring a legacy base column', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 2,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('110.00');
  });

  it('previews numeric operands even when a stale customMode says text', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'add',
              mode: 'number',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 2,
            },
          ],
        },
        { 'input-price': '100' },
        true,
        'text',
      ),
    ).toBe('110.00');
  });

  it('previews numeric input minus fixed value', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'empty-base', type: 'input', inputColumnId: '' }],
          separator: '',
          steps: [
            {
              id: 'subtract',
              type: 'numericOperation',
              operation: 'subtract',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('90');
  });

  it('previews numeric previous result plus fixed value from a later step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'noop', type: 'noop' },
            {
              id: 'add',
              type: 'numericOperation',
              operation: 'add',
              leftOperand: { type: 'previousResult' },
              rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              rounding: 0,
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('110');
  });

  it('skips a conditioned step and applies the next step to the previous value', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'skipped',
              type: 'numericOperation',
              operation: 'add',
              amount: 10,
              rounding: 2,
              condition: { target: 'input', columnId: 'input-code', operator: 'equals', value: 'APPLY' },
            },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100', 'input-code': 'SKIP' },
      ),
    ).toBe('120.00');
  });

  it('previews extraction before numeric operation', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            { id: 'extract', type: 'extractNumber' },
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
          ],
        },
        { 'input-code': 'hay 25 personas' },
      ),
    ).toBe('35');
  });

  it('previews text after numeric operation when converting explicitly to text', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
            { id: 'text', type: 'toText' },
            { id: 'suffix', type: 'addSuffix', value: ' personas' },
          ],
        },
        { 'input-price': '25' },
      ),
    ).toBe('35 personas');
  });

  it('shows concat empty state when concat mode is selected without parts', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true, 'concat')).toBe('Agrega una parte para ver la vista previa.');
  });

  it('previews concat when parts are configured', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          parts: [
            { id: 'text', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
          ],
          separator: '',
        },
        { 'input-code': '3074' },
        true,
        'concat',
      ),
    ).toBe('PC3074');
  });

  it('previews concat step with input and fixed text parts', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'name', source: { type: 'input', inputColumnId: 'input-name' } },
                { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('Nombre - Envase');
  });

  it('previews concat step using the reordered parts order and preserving part fields', () => {
    const namePart = {
      id: 'name',
      source: { type: 'input' as const, inputColumnId: 'input-name' },
      steps: [{ id: 'upper', type: 'uppercase' as const }],
    };
    const packPart = {
      id: 'pack',
      source: { type: 'input' as const, inputColumnId: 'input-pack' },
      separatorBefore: ' - ',
    };
    const reorderedParts = normalizeConcatPartsAfterReorder([packPart, namePart]);

    expect(reorderedParts[0]).toMatchObject({
      id: 'pack',
      source: { type: 'input', inputColumnId: 'input-pack' },
    });
    expect(reorderedParts[0]).not.toHaveProperty('separatorBefore');
    expect(reorderedParts[1]).toMatchObject({
      id: 'name',
      separatorBefore: ' - ',
      steps: [{ id: 'upper', type: 'uppercase' }],
    });
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: reorderedParts,
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('Envase - NOMBRE');
  });

  it('passes concat step result to the next step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'name', source: { type: 'input', inputColumnId: 'input-name' } },
                { id: 'fixed', source: { type: 'fixedText', value: ' mate' } },
              ],
            },
            { id: 'upper', type: 'uppercase', source: { type: 'previousResult' } },
          ],
        },
        { 'input-name': 'latex' },
      ),
    ).toBe('LATEX MATE');
  });

  it('previews concat step with previous result in later steps', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            { id: 'upper', type: 'uppercase', source: { type: 'input', inputColumnId: 'input-name' } },
            {
              id: 'concat',
              mode: 'text',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'separator', source: { type: 'fixedText', value: ' - ' } },
                { id: 'pack', source: { type: 'input', inputColumnId: 'input-pack' } },
              ],
            },
          ],
        },
        { 'input-name': 'nombre', 'input-pack': 'Envase' },
      ),
    ).toBe('NOMBRE - Envase');
  });

  it('keeps concat input and fixed text parts working without steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
            { id: 'fixed', type: 'text', value: 'OK' },
          ],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex - OK');
  });

  it('applies concat part steps in order before joining parts', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            {
              id: 'name',
              type: 'input',
              inputColumnId: 'input-name',
              separatorAfter: ' ',
              steps: [
                { id: 'trim', type: 'trim' },
                { id: 'upper', type: 'uppercase' },
              ],
            },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
          separator: '',
        },
        { 'input-name': ' latex ', 'input-pack': '20L' },
      ),
    ).toBe('LATEX 20L');
  });

  it('previews concat part text transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                {
                  id: 'name',
                  source: { type: 'input', inputColumnId: 'input-name' },
                  steps: [{ id: 'upper', type: 'uppercase' }],
                },
                {
                  id: 'pack',
                  source: { type: 'input', inputColumnId: 'input-pack' },
                  separatorBefore: ' - ',
                  steps: [{ id: 'lower', type: 'lowercase' }],
                },
              ],
            },
          ],
        },
        { 'input-name': 'Nombre', 'input-pack': 'ENVASE' },
      ),
    ).toBe('NOMBRE - envase');
  });

  it('previews concat part conversion transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                {
                  id: 'code',
                  source: { type: 'input', inputColumnId: 'input-code' },
                  steps: [
                    { id: 'extract', type: 'extractNumber' },
                    { id: 'text', type: 'toText' },
                    { id: 'prefix', type: 'addPrefix', value: 'N-' },
                  ],
                },
              ],
            },
          ],
        },
        { 'input-code': 'ABC123' },
      ),
    ).toBe('N-123');
  });

  it('previews concat part numeric transformations', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                { id: 'prefix', source: { type: 'fixedText', value: '$ ' } },
                {
                  id: 'price',
                  source: { type: 'input', inputColumnId: 'input-price' },
                  steps: [
                    { id: 'number', type: 'toNumber' },
                    { id: 'add', type: 'numericOperation', operation: 'addPercentage', amount: 10, rounding: 2 },
                    { id: 'text', type: 'toText' },
                  ],
                },
              ],
            },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('$ 110.00');
  });

  it('keeps noop concat part steps neutral', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'noop', type: 'noop' }] }],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex');
  });

  it('applies numeric concat part steps before joining', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'prefix', type: 'text', value: '$ ' },
            {
              id: 'price',
              type: 'input',
              inputColumnId: 'input-price',
              steps: [
                { id: 'number', type: 'toNumber' },
                { id: 'add', type: 'numericOperation', operation: 'addPercentage', amount: 10, rounding: 2 },
                { id: 'text', type: 'toText' },
              ],
            },
          ],
          separator: '',
        },
        { 'input-price': '100' },
      ),
    ).toBe('$ 110.00');
  });

  it('shows specific empty states for simple number and text modes', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'numeric', type: 'numericOperation' }] }, {}, true, 'number')).toBe('Seleccioná una columna numérica.');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }] }, {}, true, 'text')).toBe('Seleccioná una columna de texto.');
  });

  it('builds a readable summary for combine parts', () => {
    expect(
      describeCombineParts(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Texto: "PC" | Columna A | Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('labels a single constructor part as base', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
        },
        inputColumns,
      ),
    ).toBe('Base: Columna AN (Precio)');
  });

  it('labels multiple constructor parts as parts', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Partes: Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('builds display labels for custom value parts', () => {
    expect(getCustomValuePartsDisplayLabel({ type: 'combine', parts: [], separator: '' })).toBe('');
    expect(getCustomValuePartsDisplaySummary({ type: 'combine', parts: [], separator: '' }, inputColumns)).toBe('Sin partes configuradas');

    expect(
      getCustomValuePartsDisplayLabel({
        type: 'combine',
        parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      }),
    ).toBe('');
    expect(
      getCustomValuePartsDisplaySummary({
        type: 'combine',
        parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      }, inputColumns),
    ).toBe('Columna AN (Precio)');
  });

  it('describes a configured noop step without a false missing-operation warning', () => {
    const labels = getConstructorAdjustmentLabels({
      type: 'combine',
      parts: [{ id: 'base', type: 'text', value: 'Base' }],
      steps: [{ id: 'noop', type: 'noop', source: { type: 'fixedText', value: 'Listo' } }],
    }, inputColumns);

    expect(labels).toContain('Usar texto fijo');
    expect(labels).not.toContain('Sin operación seleccionada');
  });

  it('summarizes numeric operation adjustments', () => {
    expect(
      getConstructorAdjustmentsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          steps: [{
            id: 'numeric',
            type: 'numericOperation',
            operation: 'addPercentage',
            amount: 10,
            rounding: 2,
          }],
        },
        inputColumns,
      ),
    ).toBe('sumar 10% · 2 decimales');
  });

  it('builds readable display labels for constructor adjustments', () => {
    expect(
      getConstructorAdjustmentLabels(
        {
          type: 'combine',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'upper', type: 'uppercase' }] }],
          steps: [{ id: 'trim', type: 'trim' }],
        },
        inputColumns,
      ),
    ).toEqual(['Mayúsculas en Columna D (Nombre)', 'Limpiar espacios']);
  });

  it('builds a preview using sample input values and part steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              separatorAfter: ' - ',
              steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
            },
            { id: 'units', type: 'text', value: '4 unidades' },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('PC3074lts - 4 unidades');
  });

  it('applies prefix and suffix text adjustments to concat preview', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              steps: [
                { id: 'prefix', type: 'addPrefix', value: 'SKU-' },
                { id: 'suffix', type: 'addSuffix', value: '-OK' },
              ],
            },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('SKU-3074-OK');
  });

  it('keeps one prefix and suffix adjustment when updating text steps', () => {
    const withPrefix = setSimpleStep([], 'addPrefix', 'PC');
    const updatedPrefix = setSimpleStep(withPrefix, 'addPrefix', 'SKU-');
    const withSuffix = setSimpleStep(updatedPrefix, 'addSuffix', 'lts');

    expect(getSimpleStepValue(withSuffix, 'addPrefix')).toBe('SKU-');
    expect(getSimpleStepValue(withSuffix, 'addSuffix')).toBe('lts');
    expect(withSuffix.filter((step) => step.type === 'addPrefix')).toHaveLength(1);
    expect(withSuffix.filter((step) => step.type === 'addSuffix')).toHaveLength(1);
  });
});
