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
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, NumericOperation, StepSource, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';

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
  const valueSourceType = getManualRangeValueSourceType(range);
  const inputSource = getManualRangeInputSource(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const selectedTextOptions = getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource);
  const rangeTextHelpText = getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource);
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: 'Sin columnas activas' }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));

  const steps = range.valueRecipe?.steps ?? [];

  return (
    <div className="manualRangeValueFields">
      <Dropdown<ManualRangeValueSourceType>
        className="compact"
        label="Valor"
        value={valueSourceType}
        options={manualRangeValueSourceOptions}
        scrollStrategy="close"
        onChange={onValueSourceTypeChange}
      />
      {valueSourceType === 'input' ? (
        <Dropdown
          className="compact"
          label="Columna de entrada"
          value={inputSource.inputColumnId}
          options={inputColumnOptions}
          scrollStrategy="close"
          onChange={onInputColumnChange}
        />
      ) : valueSourceType === 'rangeText' ? (
        <>
          <Dropdown
            className="compact"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onRangeTextChange({ inputColumnId })}
          />
          <Dropdown
            className="compact"
            label="Texto encontrado"
            value={rangeTextSource.selectedText}
            options={selectedTextOptions.length === 0
              ? [{ value: '', label: 'Sin textos encontrados', disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={selectedTextOptions.length === 0}
            scrollStrategy="close"
            onChange={(selectedText) => onRangeTextChange({ selectedText })}
          />
          {rangeTextHelpText ? <p className="manualRangeValueHelp">{rangeTextHelpText}</p> : null}
        </>
      ) : (
        <label className="field compact">
          <span>Texto fijo</span>
          <input
            value={getManualRangeFixedTextValue(range)}
            onChange={(event) => onFixedTextChange(event.target.value)}
          />
        </label>
      )}
      <RangeValueStepsEditor steps={steps} inputColumns={inputColumns} onChange={onStepsChange} />
    </div>
  );
}

function RangeValueStepsEditor({
  steps,
  inputColumns,
  allowConcat = true,
  onChange,
}: {
  steps: TransformStep[];
  inputColumns: InputColumn[];
  allowConcat?: boolean;
  onChange: (steps: TransformStep[]) => void;
}) {
  const safeSteps = steps
    .filter((step) => step.type !== 'manualRange' && (allowConcat || step.type !== 'concat'))
    .map((step) => normalizeRangeValueStep(step, allowConcat));
  const addStep = () => onChange([...safeSteps, createRangeValueStep()]);
  const updateStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange(safeSteps.map((step) => (step.id === stepId ? normalizeRangeValueStep({ ...step, ...patch }, allowConcat) : step)));
  };
  const deleteStep = (stepId: string) => onChange(safeSteps.filter((step) => step.id !== stepId));

  return (
    <div className="rangeValueTransforms">
      <div className="sectionHeader compact">
        <div>
          <strong>Transformaciones del valor</strong>
          <p className="muted">{safeSteps.length === 0 ? 'Sin transformaciones configuradas.' : `${safeSteps.length} configurada${safeSteps.length === 1 ? '' : 's'}.`}</p>
        </div>
        <button type="button" className="secondary" onClick={addStep}>
          Agregar transformación
        </button>
      </div>

      {safeSteps.length > 0 ? (
        <div className="concatPartTransformList">
          {safeSteps.map((step, index) => (
            <RangeValueStepEditor
              key={step.id}
              step={step}
              index={index}
              inputColumns={inputColumns}
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

function RangeValueStepEditor({
  step,
  index,
  inputColumns,
  allowConcat,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
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
        <strong>Transformación {index + 1}</strong>
        <DeleteButton title="Eliminar transformación" onClick={onDelete} />
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
        <RangeValueStepFields step={{ ...step, type: safeType }} inputColumns={inputColumns} onChange={onChange} />
      </div>
    </div>
  );
}

function RangeValueStepFields({
  step,
  inputColumns,
  onChange,
}: {
  step: TransformStep;
  inputColumns: InputColumn[];
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
        onChange={(parts) => onChange({ parts })}
      />
    );
  }

  return <p className="manualRangeValueHelp">Usa el valor tal cual.</p>;
}

function RangeValueConcatEditor({
  parts,
  inputColumns,
  onChange,
}: {
  parts: ConcatPart[];
  inputColumns: InputColumn[];
  onChange: (parts: ConcatPart[]) => void;
}) {
  const safeParts = parts.length > 0 ? parts : createDefaultRangeValueConcatParts();
  const updatePart = (partId: string, patch: Partial<ConcatPart>) => {
    onChange(safeParts.map((part) => (part.id === partId ? { ...part, ...patch } : part)));
  };
  const addPart = () => {
    onChange([
      ...safeParts,
      { id: crypto.randomUUID(), source: { type: 'input', inputColumnId: inputColumns[0]?.id ?? '' }, separatorBefore: '' },
    ]);
  };
  const deletePart = (partId: string) => {
    onChange(safeParts.length <= 1 ? safeParts : safeParts.filter((part) => part.id !== partId));
  };

  return (
    <div className="concatPartStepsBlock">
      {safeParts.map((part, index) => (
        <div className="concatPartDetailPanel" key={part.id}>
          <div className="concatPartHeader">
            <strong>Parte {index + 1}</strong>
            {safeParts.length > 1 ? <DeleteButton title="Eliminar parte" onClick={() => deletePart(part.id)} /> : null}
          </div>
          <div className="concatPartFields">
            {index > 0 ? (
              <label className="field compact">
                <span>Separador antes</span>
                <input value={part.separatorBefore ?? ''} onChange={(event) => updatePart(part.id, { separatorBefore: event.target.value })} />
              </label>
            ) : null}
            <RangeValueConcatPartSourceField
              source={part.source}
              inputColumns={inputColumns}
              onChange={(source) => updatePart(part.id, { source })}
            />
          </div>
          <RangeValueStepsEditor
            steps={part.steps ?? []}
            inputColumns={inputColumns}
            allowConcat={false}
            onChange={(steps) => updatePart(part.id, { steps })}
          />
        </div>
      ))}
      <button type="button" className="secondary concatAddPartButton" onClick={addPart}>
        Agregar parte
      </button>
    </div>
  );
}

function RangeValueConcatPartSourceField({
  source,
  inputColumns,
  onChange,
}: {
  source: StepSource;
  inputColumns: InputColumn[];
  onChange: (source: StepSource) => void;
}) {
  const sourceValue = getConcatPartSourceDropdownValue(source);

  return (
    <>
      <Dropdown
        className="compact"
        label="Fuente"
        value={sourceValue}
        options={[
          { value: 'previousResult', label: 'Resultado anterior' },
          { value: 'fixedText', label: 'Texto fijo' },
          ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}`, label: getInputColumnLabel(inputColumn) })),
        ]}
        scrollStrategy="close"
        onChange={(value) => onChange(getConcatPartSourceFromDropdownValue(value, source))}
      />
      {source.type === 'fixedText' ? (
        <label className="field compact">
          <span>Texto fijo</span>
          <input value={source.value} onChange={(event) => onChange({ type: 'fixedText', value: event.target.value })} />
        </label>
      ) : null}
    </>
  );
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

function createDefaultRangeValueConcatParts(): ConcatPart[] {
  return [
    { id: crypto.randomUUID(), source: { type: 'previousResult' } },
    { id: crypto.randomUUID(), source: { type: 'input', inputColumnId: '' }, separatorBefore: ' ' },
  ];
}

function getConcatPartSourceDropdownValue(source: StepSource) {
  if (source.type === 'previousResult') {
    return 'previousResult';
  }

  if (source.type === 'fixedText') {
    return 'fixedText';
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
