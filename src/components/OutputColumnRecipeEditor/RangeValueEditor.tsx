import { defaultDateInputFormat, defaultDateOutputFormat, supportedDateInputFormats, supportedDateOutputFormats } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import {
  getManualRangeFixedTextValue,
  getManualRangeInputSource,
  getManualRangeRangeTextHelpText,
  getManualRangeRangeTextSource,
  getManualRangeSelectedTextOptions,
  getManualRangeValueSourceType,
  manualRangeValueSourceOptions,
  type ManualRangeValueSourceType,
} from '../../domain/import/manualRangeModel';
import { useState, type ReactNode } from 'react';
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, NumericOperation, StepSource, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { ColumnTextPicker, createFixedTextSourceFromColumnText } from './ColumnTextPicker';

type RangeValueEditorProps = {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onValueSourceTypeChange: (type: ManualRangeValueSourceType) => void;
  onFixedTextChange: (value: string) => void;
  onInputColumnChange: (inputColumnId: string) => void;
  onRangeTextChange: (patch: { inputColumnId?: string; selectedText?: string }) => void;
  onStepsChange: (steps: TransformStep[]) => void;
};

export type RangeValueSourceDropdownValue = ManualRangeValueSourceType | 'columnTextPicker' | `input:${string}`;
export type RangeValueConcatPartSourceDropdownValue = 'previousResult' | 'fixedText' | 'rangeText' | 'columnTextPicker' | `input:${string}`;

export type RangeValueSourceSelection =
  | { type: 'valueSourceType'; value: ManualRangeValueSourceType }
  | { type: 'inputColumn'; inputColumnId: string };

export const rangeValueModeOptions: Array<{ value: Exclude<TransformStepMode, 'manualRange'>; label: string }> = [
  { value: 'text', label: 'Trabajar con texto' },
  { value: 'number', label: 'Trabajar con número' },
  { value: 'conversion', label: 'Conversión' },
  { value: 'date', label: 'Trabajar con fechas' },
];

export const rangeValueStepTypes: Record<Exclude<TransformStepMode, 'manualRange'>, Array<{ value: TransformStepType; label: string }>> = {
  text: [
    { value: 'noop', label: 'Usar valor tal cual' },
    { value: 'trim', label: 'Limpiar espacios' },
    { value: 'uppercase', label: 'Convertir a mayúsculas' },
    { value: 'lowercase', label: 'Convertir a minúsculas' },
    { value: 'addPrefix', label: 'Agregar prefijo' },
    { value: 'addSuffix', label: 'Agregar sufijo' },
    { value: 'removeText', label: 'Quitar texto' },
    { value: 'replaceText', label: 'Reemplazar texto' },
    { value: 'concat', label: 'Concatenar' },
  ],
  number: [
    { value: 'noop', label: 'Usar valor tal cual' },
    { value: 'numericOperation', label: 'Operación numérica' },
  ],
  conversion: [
    { value: 'noop', label: 'Usar valor tal cual' },
    { value: 'extractNumber', label: 'Extraer número del texto' },
    { value: 'toNumber', label: 'Convertir a número' },
    { value: 'toText', label: 'Convertir a texto' },
  ],
  date: [
    { value: 'noop', label: 'Usar valor tal cual' },
    { value: 'formatDate', label: 'Formatear fecha' },
  ],
};

const numericOperationOptions: Array<{ value: NumericOperation; label: string }> = [
  { value: 'add', label: 'Sumar valor' },
  { value: 'subtract', label: 'Restar valor' },
  { value: 'multiply', label: 'Multiplicar por' },
  { value: 'divide', label: 'Dividir por' },
  { value: 'addPercentage', label: 'Sumar porcentaje' },
  { value: 'subtractPercentage', label: 'Restar porcentaje' },
  { value: 'removeIncludedPercentage', label: 'Quitar porcentaje incluido' },
];

const rangeValuePrimaryStepId = 'range-value-primary-step';

export function RangeValueEditor({
  range,
  inputColumns,
  manualRangeRows,
  onValueSourceTypeChange,
  onFixedTextChange,
  onInputColumnChange,
  onRangeTextChange,
  onStepsChange,
}: RangeValueEditorProps) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const valueSourceType = getManualRangeValueSourceType(range);
  const inputSource = getManualRangeInputSource(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const selectedTextOptions = getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource);
  const rangeTextHelpText = getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource);
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: 'Sin columnas activas' }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));
  const sourceDropdownValue = isColumnTextPickerOpen
    ? 'columnTextPicker' as const
    : valueSourceType === 'input' && inputSource.inputColumnId
      ? `input:${inputSource.inputColumnId}` as const
      : valueSourceType;
  const sourceDropdownOptions = getRangeValueSourceDropdownOptions(inputColumns);
  const hasSourceDetails = isColumnTextPickerOpen || valueSourceType !== 'input';

  const steps = range.valueRecipe?.steps ?? [];

  const sourceFields = (
    <>
      <Dropdown<RangeValueSourceDropdownValue>
        className="compact manualRangeValueSourceField"
        label="Desde donde toma el valor"
        value={sourceDropdownValue}
        options={sourceDropdownOptions}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === 'columnTextPicker') {
            setIsColumnTextPickerOpen(true);
            return;
          }

          setIsColumnTextPickerOpen(false);
          const selection = getRangeValueSourceSelection(value);
          if (selection.type === 'inputColumn') {
            onInputColumnChange(selection.inputColumnId);
            return;
          }

          onValueSourceTypeChange(selection.value);
        }}
      />
      {isColumnTextPickerOpen ? (
        <ColumnTextPicker
          inputColumns={inputColumns}
          rows={manualRangeRows}
          value={getManualRangeFixedTextValue(range)}
          onSelect={onFixedTextChange}
        />
      ) : valueSourceType === 'rangeText' ? (
        <>
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onRangeTextChange({ inputColumnId })}
          />
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Texto encontrado"
            value={rangeTextSource.selectedText}
            options={selectedTextOptions.length === 0
              ? [{ value: '', label: 'Sin textos en el rango', disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={selectedTextOptions.length === 0}
            searchable
            searchPlaceholder="Buscar texto"
            scrollStrategy="close"
            onChange={(selectedText) => onRangeTextChange({ selectedText })}
          />
          {rangeTextHelpText && rangeTextHelpText !== 'No se encontraron textos en este rango.' ? (
            <div className="textSourceHelperRow">
              <p className="manualRangeValueHelp">{rangeTextHelpText}</p>
            </div>
          ) : null}
        </>
      ) : valueSourceType === 'fixedText' ? (
        <label className="field compact manualRangeValueDetailField">
          <span>Texto</span>
          <input
            value={getManualRangeFixedTextValue(range)}
            onChange={(event) => onFixedTextChange(event.target.value)}
          />
        </label>
      ) : null}
    </>
  );

  return (
    <div className="manualRangeValueFields">
      <RangeValueStepsEditor
        steps={steps}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        range={range}
        sourceFields={sourceFields}
        hasSourceDetails={hasSourceDetails}
        onChange={onStepsChange}
      />
    </div>
  );
}

export function getRangeValueSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    ...manualRangeValueSourceOptions.filter((option) => option.value !== 'input'),
    { value: 'columnTextPicker' as const, label: 'Elegir texto desde columna' },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getRangeValueSourceSelection(value: Exclude<RangeValueSourceDropdownValue, 'columnTextPicker'>): RangeValueSourceSelection {
  if (value === 'fixedText' || value === 'rangeText' || value === 'input') {
    return { type: 'valueSourceType', value };
  }

  return { type: 'inputColumn', inputColumnId: value.slice('input:'.length) };
}

function RangeValueStepsEditor({
  steps,
  inputColumns,
  manualRangeRows,
  range,
  sourceFields,
  hasSourceDetails = false,
  allowConcat = true,
  showAdditionalStepsHeader = true,
  onChange,
}: {
  steps: TransformStep[];
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  sourceFields?: ReactNode;
  hasSourceDetails?: boolean;
  allowConcat?: boolean;
  showAdditionalStepsHeader?: boolean;
  onChange: (steps: TransformStep[]) => void;
}) {
  const safeSteps = steps
    .filter((step) => step.type !== 'manualRange' && (allowConcat || step.type !== 'concat'))
    .map((step) => normalizeRangeValueStep(step, allowConcat));
  const primaryStep = safeSteps[0] ?? { id: rangeValuePrimaryStepId, mode: 'text' as const, type: 'noop' as const };
  const additionalSteps = safeSteps.slice(1);
  const updatePrimaryStep = (step: TransformStep) => {
    const normalizedStep = normalizeRangeValueStep(step, allowConcat);
    const shouldKeepImplicitNoop = safeSteps.length === 0 && normalizedStep.mode === 'text' && normalizedStep.type === 'noop';

    onChange(shouldKeepImplicitNoop ? [] : [normalizedStep, ...additionalSteps]);
  };
  const addStep = () => onChange(appendRangeValueStep(safeSteps));
  const updateStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange(safeSteps.map((step) => (step.id === stepId ? normalizeRangeValueStep({ ...step, ...patch }, allowConcat) : step)));
  };
  const deleteStep = (stepId: string) => onChange(safeSteps.filter((step) => step.id !== stepId));
  const isPrimaryConcat = primaryStep.type === 'concat';

  return (
    <div className="rangeValueTransforms">
      <div className={`rangeValueOperationPanel${hasSourceDetails && !isPrimaryConcat ? ' hasSourceDetails' : ''}`}>
        <div className="rangeValuePrimaryLayout">
          <div className="rangeValuePrimaryControls">
            <RangeValueStepControls
              step={primaryStep}
              allowConcat={allowConcat}
              onChange={updatePrimaryStep}
            />
          </div>
          {isPrimaryConcat ? null : (
            <div className="rangeValueSourceControls">
              {sourceFields}
            </div>
          )}
          <div className="rangeValuePrimaryStepFields">
            <RangeValueStepFields
              step={primaryStep}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              range={range}
              onChange={(patch) => updatePrimaryStep({ ...primaryStep, ...patch })}
            />
          </div>
        </div>
      </div>

      {showAdditionalStepsHeader ? (
        <div className="sectionHeader compact rangeValueAdditionalHeader">
          <div>
            <strong>Pasos adicionales</strong>
            <p className="muted">{additionalSteps.length === 0 ? 'Sin pasos adicionales.' : `${additionalSteps.length} configurado${additionalSteps.length === 1 ? '' : 's'}.`}</p>
          </div>
          <ActionButton action="add" variant="secondary" onClick={addStep}>Agregar paso</ActionButton>
        </div>
      ) : (
        <div className="concatPartStepsActions">
          <ActionButton action="add" variant="secondary" onClick={addStep}>Agregar paso</ActionButton>
        </div>
      )}

      {additionalSteps.length > 0 ? (
        <div className="concatPartTransformList">
          {additionalSteps.map((step, index) => (
            <RangeValueStepEditor
              key={step.id}
              step={step}
              index={index}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              range={range}
              allowConcat={allowConcat}
              onChange={(patch) => updateStep(step.id, patch)}
              onDelete={() => deleteStep(step.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RangeValueStepControls({
  step,
  allowConcat,
  onChange,
}: {
  step: TransformStep;
  allowConcat: boolean;
  onChange: (step: TransformStep) => void;
}) {
  const mode = getRangeValueStepMode(step);
  const stepTypeOptions = allowConcat ? rangeValueStepTypes[mode] : rangeValueStepTypes[mode].filter((option) => option.value !== 'concat');
  const safeType = stepTypeOptions.some((option) => option.value === step.type) ? step.type : stepTypeOptions[0].value;

  return (
    <>
      <Dropdown<Exclude<TransformStepMode, 'manualRange'>>
        className="compact"
        label="Tipo de operación"
        value={mode}
        options={rangeValueModeOptions}
        scrollStrategy="close"
        onChange={(nextMode) => onChange(createRangeValueStep(nextMode, step.id === rangeValuePrimaryStepId ? crypto.randomUUID() : step.id))}
      />
      <Dropdown<TransformStepType>
        className="compact"
        label="Qué quiero hacer"
        value={safeType}
        options={stepTypeOptions}
        scrollStrategy="close"
        onChange={(type) => onChange(createRangeValueStep(mode, step.id === rangeValuePrimaryStepId ? crypto.randomUUID() : step.id, type))}
      />
    </>
  );
}

function RangeValueStepEditor({
  step,
  index,
  inputColumns,
  manualRangeRows,
  range,
  allowConcat,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  allowConcat: boolean;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const mode = getRangeValueStepMode(step);
  const stepTypeOptions = allowConcat ? rangeValueStepTypes[mode] : rangeValueStepTypes[mode].filter((option) => option.value !== 'concat');
  const safeType = stepTypeOptions.some((option) => option.value === step.type) ? step.type : stepTypeOptions[0].value;

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>Paso adicional {index + 1}</strong>
        <DeleteButton title="Eliminar paso" onClick={onDelete} />
      </div>
      <div className="simpleCustomValueGrid">
        <Dropdown<Exclude<TransformStepMode, 'manualRange'>>
          className="compact"
          label="Tipo de operación"
          value={mode}
          options={rangeValueModeOptions}
          scrollStrategy="close"
          onChange={(nextMode) => onChange(createRangeValueStep(nextMode, step.id))}
        />
        <Dropdown<TransformStepType>
          className="compact"
          label="Qué quiero hacer"
          value={safeType}
          options={stepTypeOptions}
          scrollStrategy="close"
          onChange={(type) => onChange(createRangeValueStep(mode, step.id, type))}
        />
        <RangeValueStepFields
          step={{ ...step, type: safeType }}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          range={range}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function RangeValueStepFields({
  step,
  inputColumns,
  manualRangeRows = [],
  range,
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  if (step.type === 'addPrefix' || step.type === 'addSuffix' || step.type === 'removeText') {
    return (
      <label className="field compact">
        <span>{step.type === 'addPrefix' ? 'Prefijo' : step.type === 'addSuffix' ? 'Sufijo' : 'Texto a quitar'}</span>
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
        <Dropdown<NumericOperation>
          className="compact"
          label="Operación"
          value={step.operation ?? 'add'}
          options={numericOperationOptions}
          scrollStrategy="close"
          onChange={(operation) => onChange({ operation })}
        />
        <label className="field compact">
          <span>Valor</span>
          <input type="number" step="any" value={step.amount ?? 0} onChange={(event) => onChange({ amount: Number(event.target.value) })} />
        </label>
      </>
    );
  }

  if (step.type === 'formatDate') {
    return (
      <>
        <Dropdown
          className="compact"
          label="Formato de entrada"
          value={step.dateInputFormat ?? defaultDateInputFormat}
          options={supportedDateInputFormats.map((format) => ({ value: format, label: format }))}
          scrollStrategy="close"
          onChange={(dateInputFormat) => onChange({ dateInputFormat })}
        />
        <Dropdown
          className="compact"
          label="Formato de salida"
          value={step.dateOutputFormat ?? defaultDateOutputFormat}
          options={supportedDateOutputFormats.map((format) => ({ value: format, label: format }))}
          scrollStrategy="close"
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
      </>
    );
  }

  if (step.type === 'concat') {
    return (
      <RangeValueConcatEditor
        parts={step.parts ?? createDefaultRangeValueConcatParts()}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        range={range}
        onChange={(parts) => onChange({ parts })}
      />
    );
  }

  return <p className="manualRangeValueHelp">Usa el valor tal cual.</p>;
}

function RangeValueConcatEditor({
  parts,
  inputColumns,
  manualRangeRows,
  range,
  onChange,
}: {
  parts: ConcatPart[];
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  onChange: (parts: ConcatPart[]) => void;
}) {
  const safeParts = parts.length > 0 ? parts : createDefaultRangeValueConcatParts();
  const [selectedPartId, setSelectedPartId] = useState(safeParts[0]?.id ?? '');
  const safeSelectedPartId = safeParts.some((part) => part.id === selectedPartId) ? selectedPartId : safeParts[0]?.id ?? '';
  const selectedPart = safeParts.find((part) => part.id === safeSelectedPartId);
  const selectedPartIndex = selectedPart ? safeParts.findIndex((part) => part.id === selectedPart.id) : -1;
  const updatePart = (partId: string, patch: Partial<ConcatPart>) => {
    onChange(safeParts.map((part) => (part.id === partId ? { ...part, ...patch } : part)));
  };
  const addPart = () => {
    const nextPart = { id: crypto.randomUUID(), source: { type: 'input' as const, inputColumnId: inputColumns[0]?.id ?? '' }, separatorBefore: '' };
    setSelectedPartId(nextPart.id);
    onChange([
      ...safeParts,
      nextPart,
    ]);
  };
  const deletePart = (partId: string) => {
    if (safeParts.length <= 1) {
      return;
    }

    const nextParts = safeParts.filter((part) => part.id !== partId);
    setSelectedPartId(nextParts[Math.max(0, safeParts.findIndex((part) => part.id === partId) - 1)]?.id ?? nextParts[0]?.id ?? '');
    onChange(nextParts);
  };

  return (
    <div className="concatPartsWorkspace rangeValueConcatWorkspace">
      <div className="concatPartsSidebar">
        {safeParts.map((part, index) => (
          <div className={`concatPartListItem${part.id === safeSelectedPartId ? ' selected' : ''}`} key={part.id}>
            <button
              type="button"
              className="concatPartSelectButton"
              onClick={() => setSelectedPartId(part.id)}
            >
              <strong>Parte {index + 1}</strong>
              <span>{describeRangeValueConcatPartSource(part, inputColumns)}</span>
            </button>
          </div>
        ))}
        <button type="button" className="secondary concatAddPartButton" onClick={addPart}>
          Agregar parte
        </button>
      </div>
      {selectedPart ? (
        <div className="concatPartDetailPanel">
          <div className="concatPartHeader">
            <strong>Parte {selectedPartIndex + 1}</strong>
            {safeParts.length > 1 ? <DeleteButton title="Eliminar parte" onClick={() => deletePart(selectedPart.id)} /> : null}
          </div>
          {selectedPartIndex > 0 ? (
            <div className="concatPartFields">
              <label className="field compact">
                <span>Separador antes de esta parte</span>
                <input value={selectedPart.separatorBefore ?? ''} onChange={(event) => updatePart(selectedPart.id, { separatorBefore: event.target.value })} />
              </label>
            </div>
          ) : null}
          <RangeValueStepsEditor
            steps={selectedPart.steps ?? []}
            inputColumns={inputColumns}
            manualRangeRows={manualRangeRows}
            range={range}
            sourceFields={(
              <RangeValueConcatPartSourceFields
                source={selectedPart.source}
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                range={range}
                onChange={(source) => updatePart(selectedPart.id, { source })}
              />
            )}
            allowConcat={false}
            showAdditionalStepsHeader={false}
            onChange={(steps) => updatePart(selectedPart.id, { steps })}
          />
        </div>
      ) : null}
    </div>
  );
}

function RangeValueConcatPartSourceFields({
  source,
  inputColumns,
  manualRangeRows,
  range,
  onChange,
}: {
  source: StepSource;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  range?: Pick<ManualRangeValue, 'startRowNumber' | 'endRowNumber'>;
  onChange: (source: StepSource) => void;
}) {
  const [isColumnTextPickerOpen, setIsColumnTextPickerOpen] = useState(false);
  const sourceValue = isColumnTextPickerOpen ? 'columnTextPicker' : getConcatPartSourceDropdownValue(source);
  const rangeTextSource = getRangeValueConcatPartRangeTextSource(source, inputColumns);
  const selectedTextOptions = range
    ? getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource)
    : [];
  const rangeTextHelpText = range
    ? getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource)
    : '';
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: 'Sin columnas activas' }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));

  return (
    <>
      <Dropdown<RangeValueConcatPartSourceDropdownValue>
        className="compact manualRangeValueSourceField"
        label="Desde donde toma el valor"
        value={sourceValue}
        options={getRangeValueConcatPartSourceDropdownOptions(inputColumns)}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === 'columnTextPicker') {
            setIsColumnTextPickerOpen(true);
            return;
          }

          setIsColumnTextPickerOpen(false);
          onChange(getConcatPartSourceFromDropdownValue(value, source));
        }}
      />
      {isColumnTextPickerOpen ? (
        <ColumnTextPicker
          inputColumns={inputColumns}
          rows={manualRangeRows}
          value={source.type === 'fixedText' ? source.value : ''}
          onSelect={(value) => onChange(createFixedTextSourceFromColumnText(value))}
        />
      ) : source.type === 'fixedText' ? (
        <label className="field compact manualRangeValueDetailField">
          <span>Texto</span>
          <input value={source.value} onChange={(event) => onChange({ type: 'fixedText', value: event.target.value })} />
        </label>
      ) : null}
      {source.type === 'rangeText' ? (
        <>
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onChange({ ...rangeTextSource, inputColumnId })}
          />
          <Dropdown
            className="compact manualRangeValueDetailField"
            label="Texto encontrado"
            value={rangeTextSource.selectedText}
            options={selectedTextOptions.length === 0
              ? [{ value: '', label: 'Sin textos en el rango', disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={selectedTextOptions.length === 0}
            searchable
            searchPlaceholder="Buscar texto"
            scrollStrategy="close"
            onChange={(selectedText) => onChange({ ...rangeTextSource, selectedText })}
          />
          {rangeTextHelpText && rangeTextHelpText !== 'No se encontraron textos en este rango.' ? (
            <div className="textSourceHelperRow">
              <p className="manualRangeValueHelp">{rangeTextHelpText}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function getRangeValueConcatPartSourceDropdownOptions(inputColumns: InputColumn[]) {
  return [
    { value: 'previousResult' as const, label: 'Resultado anterior' },
    { value: 'fixedText' as const, label: 'Texto fijo' },
    { value: 'columnTextPicker' as const, label: 'Elegir texto desde columna' },
    { value: 'rangeText' as const, label: 'Texto encontrado en el rango' },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}` as const, label: getInputColumnLabel(inputColumn) })),
  ];
}

function getRangeValueConcatPartRangeTextSource(source: StepSource, inputColumns: InputColumn[]): Extract<StepSource, { type: 'rangeText' }> {
  return source.type === 'rangeText'
    ? source
    : { type: 'rangeText', inputColumnId: inputColumns[0]?.id ?? '', selectedText: '' };
}

function describeRangeValueConcatPartSource(part: ConcatPart, inputColumns: InputColumn[]) {
  const { source } = part;

  if (source.type === 'previousResult') {
    return 'Resultado anterior';
  }

  if (source.type === 'fixedText') {
    return `Texto fijo "${source.value || ''}"`;
  }

  if (source.type === 'rangeText') {
    return source.selectedText ? `Texto encontrado "${source.selectedText}"` : 'Texto encontrado en el rango';
  }

  const inputColumn = inputColumns.find((column) => column.id === source.inputColumnId);
  return inputColumn ? getInputColumnLabel(inputColumn) : 'Columna de entrada';
}

function createRangeValueStep(
  mode: Exclude<TransformStepMode, 'manualRange'> = 'text',
  id: string = crypto.randomUUID(),
  type: TransformStepType = rangeValueStepTypes[mode][0].value,
): TransformStep {
  if (type === 'concat') {
    return {
      id,
      mode: 'text',
      type: 'concat',
      parts: createDefaultRangeValueConcatParts(),
    };
  }

  return normalizeRangeValueStep({
    id,
    mode,
    type,
  });
}

function normalizeRangeValueStep(step: TransformStep, allowConcat = true): TransformStep {
  const mode = getRangeValueStepMode(step);
  if (step.type === 'manualRange' || (!allowConcat && step.type === 'concat') || !rangeValueStepTypes[mode].some((option) => option.value === step.type)) {
    return createRangeValueStep(mode, step.id);
  }

  if (step.type === 'concat') {
    return {
      ...step,
      mode: 'text',
      parts: (step.parts?.length ? step.parts : createDefaultRangeValueConcatParts()).map((part) => ({
        ...part,
        steps: (part.steps ?? []).filter((partStep) => partStep.type !== 'manualRange' && partStep.type !== 'concat'),
      })),
    };
  }

  if (step.type === 'numericOperation') {
    return {
      ...step,
      mode,
      operation: step.operation ?? 'add',
      amount: step.amount ?? 0,
      rounding: step.rounding ?? 2,
    };
  }

  if (step.type === 'formatDate') {
    return {
      ...step,
      mode,
      dateInputFormat: step.dateInputFormat ?? defaultDateInputFormat,
      dateOutputFormat: step.dateOutputFormat ?? defaultDateOutputFormat,
    };
  }

  return { ...step, mode };
}

export function createDefaultRangeValueConcatParts(): ConcatPart[] {
  return [
    { id: crypto.randomUUID(), source: { type: 'previousResult' } },
  ];
}

export function appendRangeValueStep(steps: TransformStep[]): TransformStep[] {
  return steps.length === 0
    ? [createRangeValueStep(), createRangeValueStep()]
    : [...steps, createRangeValueStep()];
}

function getConcatPartSourceDropdownValue(source: StepSource): RangeValueConcatPartSourceDropdownValue | '' {
  if (source.type === 'previousResult') {
    return 'previousResult';
  }

  if (source.type === 'fixedText') {
    return 'fixedText';
  }

  if (source.type === 'rangeText') {
    return 'rangeText';
  }

  return source.inputColumnId ? `input:${source.inputColumnId}` : '';
}

function getConcatPartSourceFromDropdownValue(value: string, currentSource: StepSource): StepSource {
  if (value === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (value === 'fixedText') {
    return { type: 'fixedText', value: currentSource.type === 'fixedText' ? currentSource.value : '' };
  }

  if (value === 'rangeText') {
    return currentSource.type === 'rangeText'
      ? currentSource
      : { type: 'rangeText', inputColumnId: '', selectedText: '' };
  }

  if (value.startsWith('input:')) {
    return { type: 'input', inputColumnId: value.slice('input:'.length) };
  }

  return currentSource;
}

function getRangeValueStepMode(step: TransformStep): Exclude<TransformStepMode, 'manualRange'> {
  if (step.mode && step.mode !== 'manualRange') {
    return step.mode;
  }

  if (step.type === 'numericOperation') {
    return 'number';
  }

  if (step.type === 'extractNumber' || step.type === 'toNumber' || step.type === 'toText') {
    return 'conversion';
  }

  if (step.type === 'formatDate') {
    return 'date';
  }

  return 'text';
}
