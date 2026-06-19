import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defaultDateInputFormat, defaultDateInvalidFallback, defaultDateOutputFormat, formatDateValue, parseDateValue, supportedDateInputFormats, supportedDateOutputFormats } from '../../domain/import/dateOperations';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { addManualRangeValue, createManualRangeRecipe, describeManualRangeCondition, describeManualRangeStepSummary, duplicateManualRangeValue, generateManualRangesFromTexts, getManualRangeCountLabel, getManualRangeRangeTextSource, getManualRangeRowCountFromInputs, hasOverlappingManualRanges, manualRangeRecipeToStepPatch, manualRangeStepToRecipe, parseManualRangeRowInput, removeManualRangeValue, sortManualRangesByStart, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueRecipeSteps, updateManualRangeValueSourceType, type ManualRangeInitialValueMode, type ManualRangeStartFilter } from '../../domain/import/manualRangeModel';
import { normalizeNumberInputWhileTyping, parseOptionalNumberInput } from '../../domain/import/numberInput';
import { parseNumericValue } from '../../domain/import/numericOperations';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConcatPart, ConditionOperator, DateInputFormat, DateInvalidFallback, DateOutputFormat, InputColumn, InputRow, ManualRangeCondition, ManualRangeValue, OutputColumn, OutputRecipe, RangeValueSource, CustomValueMode as PersistedCustomValueMode, RecipePart, StepOperand, StepSource, TransformCondition, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown, type DropdownOption } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { RangeValueEditor } from './RangeValueEditor';

type OutputColumnRecipeEditorProps = {
  column: OutputColumn;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  sampleInputValues?: Record<string, string>;
  onChange: (column: OutputColumn) => void;
};

type CombineRecipe = Extract<OutputRecipe, { type: 'combine' }>;
type EditableCustomRecipe = Extract<OutputRecipe, { type: 'combine' }> | Extract<OutputRecipe, { type: 'manualRange' }>;

export const outputRecipeTypeOptions: Array<{ value: OutputRecipe['type']; label: string }> = [
  { value: 'direct', label: 'Directa desde entrada' },
  { value: 'empty', label: 'Columna vacia' },
  { value: 'fixedText', label: 'Texto fijo' },
  { value: 'combine', label: 'Crear valor personalizado' },
];

export const recipeEditorModalPendingApplyText = 'Los cambios se aplican al confirmar.';
export const recipeEditorModalCancelLabel = 'Cancelar';
export const recipeEditorModalApplyLabel = 'Aplicar';
export const recipeEditorDiscardChangesTitle = 'Descartar';
export const recipeEditorDiscardChangesMessage = 'Hay cambios sin aplicar en esta receta. Si cerrás el editor, se perderán.';
export const recipeEditorDiscardChangesCancelLabel = 'Seguir editando';
export const recipeEditorDiscardChangesConfirmLabel = 'Descartar cambios';
export const recipeEditorAdditionalStepLabel = 'Agregar paso';
export const recipeEditorPreviousResultHelpText = 'Toma el valor que salió del paso anterior, no de la parte anterior.';

const manualRangeInitialValueModeOptions: Array<{ value: ManualRangeInitialValueMode; label: string }> = [
  { value: 'empty', label: 'Sin valor (recomendado)' },
  { value: 'detectedText', label: 'Usar texto detectado como valor' },
];

const manualRangeStartFilterOperatorOptions: Array<{ value: ManualRangeStartFilter['operator']; label: string }> = [
  { value: 'isEmpty', label: 'está vacía' },
  { value: 'isNotEmpty', label: 'no está vacía' },
];

export function getRecipeEditorModalRecipe(recipe: OutputRecipe, draftRecipe: EditableCustomRecipe | null) {
  return recipe.type === 'combine' || recipe.type === 'manualRange' ? draftRecipe ?? recipe : null;
}

export function applyRecipeEditorDraft(column: OutputColumn, draftRecipe: EditableCustomRecipe | null): OutputColumn {
  return draftRecipe ? { ...column, recipe: draftRecipe } : column;
}

export function hasRecipeEditorDraftChanges(originalRecipe: EditableCustomRecipe, draftRecipe: EditableCustomRecipe | null) {
  return Boolean(draftRecipe) && JSON.stringify(originalRecipe) !== JSON.stringify(draftRecipe);
}

export function getOutputRecipeTypeSelectorValue(recipe: OutputRecipe): Exclude<OutputRecipe['type'], 'manualRange'> {
  return recipe.type === 'manualRange' ? 'combine' : recipe.type;
}

export function OutputColumnRecipeEditor({ column, inputColumns, manualRangeRows = [], sampleInputValues, onChange }: OutputColumnRecipeEditorProps) {
  const activeInputColumns = inputColumns.filter((inputColumn) => inputColumn.active);
  const [isConstructorOpen, setIsConstructorOpen] = useState(false);
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false);
  const [draftRecipe, setDraftRecipe] = useState<EditableCustomRecipe | null>(null);
  const [customValueMode, setCustomValueMode] = useState<CustomValueMode>('');
  const isApplyingConstructorRef = useRef(false);
  const modalRecipe = getRecipeEditorModalRecipe(column.recipe, draftRecipe);
  const modalCombineRecipe = modalRecipe?.type === 'combine' ? modalRecipe : null;
  const modalManualRangeRecipe = modalRecipe?.type === 'manualRange' ? modalRecipe : null;
  const hasDraftChanges = column.recipe.type === 'combine' || column.recipe.type === 'manualRange'
    ? hasRecipeEditorDraftChanges(column.recipe, draftRecipe)
    : false;
  const effectiveCustomValueMode = column.recipe.type === 'combine'
    ? getCustomValueMode(column.recipe) || customValueMode
    : '';
  const effectiveModalCustomValueMode = modalCombineRecipe
    ? getCustomValueMode(modalCombineRecipe) || customValueMode
    : '';
  const customValuePreview = column.recipe.type === 'combine'
    ? buildCustomValuePreview(column.recipe, sampleInputValues, false, effectiveCustomValueMode, manualRangeRows)
    : '';
  const customValuePartsLabel = column.recipe.type === 'combine'
    ? getCustomValuePartsDisplayLabel(column.recipe)
    : '';
  const customValuePartsSummary = column.recipe.type === 'combine'
    ? getCustomValuePartsDisplaySummary(column.recipe, activeInputColumns)
    : '';
  const customValueAdjustments = column.recipe.type === 'combine'
    ? getConstructorAdjustmentLabels(column.recipe, activeInputColumns)
    : [];
  const customValueAllAdjustments = column.recipe.type === 'combine'
    ? getConstructorAdjustmentLabels(column.recipe, activeInputColumns, Number.POSITIVE_INFINITY)
    : [];

  const updateRecipe = (recipe: OutputRecipe) => {
    onChange({ ...column, recipe });
  };
  const openConstructor = (recipe: EditableCustomRecipe) => {
    isApplyingConstructorRef.current = false;
    setDraftRecipe(recipe);
    setIsConstructorOpen(true);
  };
  const closeConstructor = () => {
    isApplyingConstructorRef.current = false;
    setIsDiscardConfirmationOpen(false);
    setDraftRecipe(null);
    setIsConstructorOpen(false);
  };
  const requestCancelConstructor = () => {
    if (isApplyingConstructorRef.current) {
      closeConstructor();
      return;
    }

    if (!hasDraftChanges) {
      closeConstructor();
      return;
    }

    setIsDiscardConfirmationOpen(true);
  };
  const cancelDiscardConstructor = () => {
    setIsDiscardConfirmationOpen(false);
  };
  const confirmDiscardConstructor = () => {
    setIsDiscardConfirmationOpen(false);
    closeConstructor();
  };
  const applyConstructor = () => {
    if (draftRecipe) {
      isApplyingConstructorRef.current = true;
      onChange(applyRecipeEditorDraft(column, draftRecipe));
    }

    setIsDiscardConfirmationOpen(false);
    setDraftRecipe(null);
    setIsConstructorOpen(false);
  };

  return (
    <div className="recipeEditor">
      <div className="recipeMainFields">
        <Dropdown<OutputRecipe['type']>
          className="compact"
          label="Tipo de operación"
          labelInfo={<InfoTooltip content="Define como se va a llenar esta columna." />}
          scrollStrategy="close"
          value={getOutputRecipeTypeSelectorValue(column.recipe)}
          options={outputRecipeTypeOptions}
          onChange={(nextType) => {
            if (nextType === 'combine') {
              setCustomValueMode('');
            }
            updateRecipe(buildRecipeForSelectedType(nextType, column, activeInputColumns));
          }}
        />

        {column.recipe.type === 'direct' ? (
          <Dropdown
            className="compact"
            label="Columna de entrada"
            labelInfo={<InfoTooltip content="Elegi la columna del Excel que contiene este dato." />}
            value={column.recipe.inputColumnId}
            options={activeInputColumns.length === 0
              ? [{ value: '', label: 'Sin columnas activas' }]
              : activeInputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
            scrollStrategy="close"
            onChange={(inputColumnId) => updateRecipe({ type: 'direct', inputColumnId })}
          />
        ) : null}

        {column.recipe.type === 'fixedText' ? (
          <label className="field compact">
            <span className="labelWithInfo">
              <span>Texto fijo</span>
              <InfoTooltip content="Usa el mismo texto en todas las filas." />
            </span>
            <input value={column.recipe.value} onChange={(event) => updateRecipe({ type: 'fixedText', value: event.target.value })} />
          </label>
        ) : null}
      </div>

      {column.recipe.type === 'combine' ? (
        <>
          <div className="recipeSubBlock constructorSummary">
            <div>
              <strong className="headingWithInfo">
                <span>Crear valor personalizado</span>
                <InfoTooltip content="Combina datos y transformaciones para crear este valor." />
              </strong>
              <dl className="customValueSummaryList">
                <div>
                  <dt>Vista previa</dt>
                  <dd>{customValuePreview}</dd>
                </div>
                <div>
                  <dt>{customValuePartsLabel}</dt>
                  <dd>{customValuePartsSummary}</dd>
                </div>
                <div>
                  <dt>Transformaciones</dt>
                  <dd>
                    {customValueAdjustments.length > 0 ? (
                      <span className="summaryPillList">
                        {customValueAdjustments.map((adjustment, index) => (
                          <span key={`${adjustment}-${index}`} className="summaryPill">{adjustment}</span>
                        ))}
                      </span>
                    ) : (
                      'Sin transformaciones'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              onClick={() => {
                if (column.recipe.type === 'combine') {
                  openConstructor(column.recipe);
                }
              }}
            >
              Editar valor personalizado
            </button>
          </div>
          <Modal
            open={isConstructorOpen}
            title={`Crear valor personalizado${column.label ? `: ${column.label}` : ''}`}
            titleInfo="Configura como se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <div className="constructorModalHeaderPreview">
                <strong>Vista previa:</strong>
                <span>{modalCombineRecipe ? buildCustomValuePreview(modalCombineRecipe, sampleInputValues, true, effectiveModalCustomValueMode, manualRangeRows) : customValuePreview}</span>
              </div>
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <p>{recipeEditorModalPendingApplyText}</p>
                <div className="constructorModalFooterActions">
                  <ActionButton action="close" variant="secondary" onClick={requestCancelConstructor}>
                    {recipeEditorModalCancelLabel}
                  </ActionButton>
                  <ActionButton action="done" onClick={applyConstructor}>
                    {recipeEditorModalApplyLabel}
                  </ActionButton>
                </div>
              </div>
            )}
          >
            <div className="constructorModalContent">
              {modalCombineRecipe ? (
                <CustomValueEditor
                  recipe={modalCombineRecipe}
                  inputColumns={activeInputColumns}
                  manualRangeRows={manualRangeRows}
                  sampleInputValues={sampleInputValues}
                  mode={effectiveModalCustomValueMode}
                  onChange={setDraftRecipe}
                />
              ) : null}
            </div>
          </Modal>
          <ConfirmDialog
            open={isDiscardConfirmationOpen}
            title={recipeEditorDiscardChangesTitle}
            message={recipeEditorDiscardChangesMessage}
            cancelLabel={recipeEditorDiscardChangesCancelLabel}
            confirmLabel={recipeEditorDiscardChangesConfirmLabel}
            variant="danger"
            onCancel={cancelDiscardConstructor}
            onConfirm={confirmDiscardConstructor}
          />
        </>
      ) : null}

      {column.recipe.type === 'manualRange' ? (
        <>
          <ManualRangeSummary
            recipe={column.recipe}
            inputColumns={activeInputColumns}
            onEdit={() => {
              if (column.recipe.type === 'manualRange') {
                openConstructor(column.recipe);
              }
            }}
          />
          <Modal
            open={isConstructorOpen}
            title={`Crear valor personalizado${column.label ? `: ${column.label}` : ''}`}
            titleInfo="Configura como se arma este valor antes de aplicarlo."
            size="xl"
            onClose={requestCancelConstructor}
            headerDetails={(
              <div className="constructorModalHeaderPreview">
                <strong>Vista previa:</strong>
                <span>{modalManualRangeRecipe ? buildManualRangeRecipePreview(modalManualRangeRecipe, manualRangeRows, sampleInputValues) ?? 'Sin vista previa para los rangos configurados' : 'Sin vista previa para los rangos configurados'}</span>
              </div>
            )}
            footer={(
              <div className="constructorModalFooterContent">
                <p>{recipeEditorModalPendingApplyText}</p>
                <div className="constructorModalFooterActions">
                  <ActionButton action="close" variant="secondary" onClick={requestCancelConstructor}>
                    {recipeEditorModalCancelLabel}
                  </ActionButton>
                  <ActionButton action="done" onClick={applyConstructor}>
                    {recipeEditorModalApplyLabel}
                  </ActionButton>
                </div>
              </div>
            )}
          >
            <div className="constructorModalContent">
              {modalManualRangeRecipe ? (
                <ManualRangeRecipeEditor
                  recipe={modalManualRangeRecipe}
                  inputColumns={activeInputColumns}
                  manualRangeRows={manualRangeRows}
                  onChange={setDraftRecipe}
                />
              ) : null}
            </div>
          </Modal>
          <ConfirmDialog
            open={isDiscardConfirmationOpen}
            title={recipeEditorDiscardChangesTitle}
            message={recipeEditorDiscardChangesMessage}
            cancelLabel="Cancelar"
            confirmLabel="Descartar"
            variant="danger"
            onCancel={cancelDiscardConstructor}
            onConfirm={confirmDiscardConstructor}
          />
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

  if (type === 'manualRange') {
    return createManualRangeRecipe();
  }

  return { type: 'empty' };
}

function ManualRangeSummary({
  recipe,
  inputColumns,
  onEdit,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  onEdit: () => void;
}) {
  return (
    <div className="recipeSubBlock constructorSummary manualRangeSummary">
      <div>
        <strong className="headingWithInfo">
          <span>Trabajar con rangos</span>
          <InfoTooltip content="Asigna valores segun rangos de filas reales del Excel." />
        </strong>
        <dl className="customValueSummaryList">
          <div>
            <dt>Tipo</dt>
            <dd>Trabajar con rangos</dd>
          </div>
          <div>
            <dt>Rangos</dt>
            <dd>{getManualRangeCountLabel(recipe)}</dd>
          </div>
          <div>
            <dt>Condición</dt>
            <dd>{describeManualRangeCondition(recipe, inputColumns)}</dd>
          </div>
        </dl>
      </div>
      <button type="button" onClick={onEdit}>
        Editar valor personalizado
      </button>
    </div>
  );
}

function ManualRangeRecipeEditor({
  recipe,
  inputColumns,
  manualRangeRows,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const [showGenerator, setShowGenerator] = useState(false);
  const hasOverlappingRanges = hasOverlappingManualRanges(recipe.ranges);

  return (
    <div className="recipeSubBlock manualRangeEditor">
      <div className="sectionHeader">
        <div>
          <strong>Valores por rangos</strong>
          <p className="muted">Asigná un valor distinto según el rango de filas reales del Excel.</p>
        </div>
        <div className="manualRangeHeaderActions">
          <ActionButton action="add" variant="secondary" onClick={() => onChange(addManualRangeValue(recipe))}>
            Agregar rango
          </ActionButton>
          <button type="button" className="secondary" onClick={() => onChange(sortManualRangesByStart(recipe))}>
            Ordenar por inicio
          </button>
          <button type="button" className="secondary" onClick={() => setShowGenerator((current) => !current)}>
            Generar rangos sugeridos
          </button>
        </div>
      </div>

      {showGenerator ? (
        <ManualRangeTextGenerator
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={onChange}
        />
      ) : null}

      {recipe.condition ? (
        <p className="manualRangeWarning">
          Esta configuración conserva una condición interna heredada: {describeManualRangeCondition(recipe, inputColumns)}. Para nuevas condiciones usá la condición general del paso.
        </p>
      ) : null}

      {recipe.ranges.length === 0 ? (
        <p className="muted">No hay rangos configurados.</p>
      ) : (
        <>
          {hasOverlappingRanges ? (
            <p className="manualRangeWarning">Hay rangos superpuestos. En filas repetidas se usará el primer rango configurado.</p>
          ) : null}
          <div className="manualRangeList">
            {recipe.ranges.map((range) => (
              <ManualRangeTableRow
                key={range.id}
                recipe={recipe}
                range={range}
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                onChange={onChange}
              />
            ))}
          </div>
          <div className="manualRangeFooterActions">
            <ActionButton action="add" variant="secondary" onClick={() => onChange(addManualRangeValue(recipe))}>
              Agregar rango
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}

export function ManualRangeTextGenerator({
  recipe,
  inputColumns,
  manualRangeRows,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const [inputColumnId, setInputColumnId] = useState(inputColumns[0]?.id ?? '');
  const [startRowInput, setStartRowInput] = useState('');
  const [endRowInput, setEndRowInput] = useState('');
  const [initialValueMode, setInitialValueMode] = useState<ManualRangeInitialValueMode>('empty');
  const [validRowsColumnId, setValidRowsColumnId] = useState('none');
  const [startFilterColumnId, setStartFilterColumnId] = useState('none');
  const [startFilterOperator, setStartFilterOperator] = useState<ManualRangeStartFilter['operator']>('isEmpty');
  const effectiveValidRowsColumnId = validRowsColumnId === 'none' ? undefined : validRowsColumnId;
  const startFilter = startFilterColumnId === 'none'
    ? undefined
    : { inputColumnId: startFilterColumnId, operator: startFilterOperator };
  const startRowNumber = parseManualRangeRowInput(startRowInput);
  const endRowNumber = parseManualRangeRowInput(endRowInput);
  const canPreview = Boolean(inputColumnId && startRowNumber !== undefined && endRowNumber !== undefined && endRowNumber >= startRowNumber);
  const generatedPreviewRanges = canPreview
    ? generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'untilNextText',
      initialValueMode: 'detectedText',
      validRowsColumnId: effectiveValidRowsColumnId,
      startFilter,
    })
    : [];
  const previewMessage = !inputColumnId
    ? 'Elegí una columna para buscar textos.'
    : !canPreview
      ? 'Definí un rango de filas válido.'
      : generatedPreviewRanges.length === 0
        ? 'No se encontraron textos en la zona definida.'
        : '';

  const confirmGeneratedRanges = () => {
    if (!canPreview) {
      return;
    }

    const nextRanges = generateManualRangesFromTexts(manualRangeRows, {
      inputColumnId,
      startRowNumber: startRowNumber!,
      endRowNumber: endRowNumber!,
      mode: 'untilNextText',
      initialValueMode,
      validRowsColumnId: effectiveValidRowsColumnId,
      startFilter,
    });

    if (nextRanges.length === 0) {
      return;
    }

    onChange({
      ...recipe,
      ranges: [...recipe.ranges, ...nextRanges],
    });
  };

  return (
    <div className="manualRangeGenerator">
      <div className="manualRangeGeneratorHeader">
        <div>
          <strong>Generar rangos sugeridos</strong>
          <p className="muted">Pandora puede sugerir rangos a partir de textos encontrados en una columna. Después podés revisar, eliminar o definir el valor de cada rango.</p>
          <p className="muted">El texto detectado ayuda a identificar el bloque, pero no se usa como valor salvo que lo elijas.</p>
        </div>
        <ActionButton
          action="add"
          variant="secondary"
          disabled={generatedPreviewRanges.length === 0}
          onClick={confirmGeneratedRanges}
        >
          Agregar rangos sugeridos
        </ActionButton>
      </div>
      <div className="manualRangeGeneratorControls">
        <Dropdown
          className="compact"
          label="Columna base"
          value={inputColumnId}
          options={inputColumns.length === 0
            ? [{ value: '', label: 'Sin columnas activas' }]
            : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
          scrollStrategy="close"
          onChange={setInputColumnId}
        />
        <label className="field compact">
          <span>Desde fila</span>
          <input
            type="number"
            min="1"
            placeholder="42"
            value={startRowInput}
            onChange={(event) => setStartRowInput(event.target.value)}
          />
        </label>
        <label className="field compact">
          <span>Hasta fila</span>
          <input
            type="number"
            min="1"
            placeholder="50"
            value={endRowInput}
            onChange={(event) => setEndRowInput(event.target.value)}
          />
        </label>
        <Dropdown
          className="compact"
          label="Detectar"
          value="nonEmptyTexts"
          options={[{ value: 'nonEmptyTexts', label: 'Textos no vacíos' }]}
          scrollStrategy="close"
          onChange={() => undefined}
        />
        <Dropdown
          className="compact"
          label="Sólo iniciar rango si"
          value={startFilterColumnId}
          options={[
            { value: 'none', label: 'Sin filtro' },
            ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
          ]}
          scrollStrategy="close"
          onChange={setStartFilterColumnId}
        />
        <Dropdown<ManualRangeStartFilter['operator']>
          className="compact"
          label="Condición"
          value={startFilterOperator}
          options={manualRangeStartFilterOperatorOptions}
          disabled={startFilterColumnId === 'none'}
          scrollStrategy="close"
          onChange={setStartFilterOperator}
        />
        <Dropdown<ManualRangeInitialValueMode>
          className="compact"
          label="Valor inicial"
          value={initialValueMode}
          options={manualRangeInitialValueModeOptions}
          scrollStrategy="close"
          onChange={setInitialValueMode}
        />
        <Dropdown
          className="compact"
          label="Ajustar fin usando columna"
          value={validRowsColumnId}
          options={[
            { value: 'none', label: 'Sin ajuste' },
            ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
          ]}
          scrollStrategy="close"
          onChange={setValidRowsColumnId}
        />
      </div>
      <p className="manualRangeValueHelp">Usá este filtro para evitar que textos internos inicien rangos. Por ejemplo: iniciar sólo cuando la columna de productos está vacía.</p>
      <p className="manualRangeValueHelp">Si elegís una columna, Pandora recorta cada rango hasta la última fila no vacía de esa columna dentro del bloque sugerido.</p>
      {previewMessage ? (
        <p className="manualRangeValueHelp">{previewMessage}</p>
      ) : (
        <div className="manualRangeGeneratorPreview" aria-label="Vista previa de rangos sugeridos">
          {generatedPreviewRanges.slice(0, 6).map((range, index) => (
            <span key={`${range.startRowNumber}-${range.endRowNumber}-${index}`}>
              {range.startRowNumber}-{range.endRowNumber}: {getManualRangeRangeTextSource(range).selectedText}
            </span>
          ))}
          {generatedPreviewRanges.length > 6 ? <span>{generatedPreviewRanges.length - 6} rangos más…</span> : null}
        </div>
      )}
    </div>
  );
}

export function ManualRangeTableRow({
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const [startRowInput, setStartRowInput] = useState(String(range.startRowNumber));
  const [endRowInput, setEndRowInput] = useState(String(range.endRowNumber));
  const rowCount = getManualRangeRowCountFromInputs(startRowInput, endRowInput);
  const suggestedFromText = range.suggestedFromText?.trim();

  useEffect(() => {
    setStartRowInput(String(range.startRowNumber));
  }, [range.id, range.startRowNumber]);

  useEffect(() => {
    setEndRowInput(String(range.endRowNumber));
  }, [range.id, range.endRowNumber]);

  const updateStartRowInput = (value: string) => {
    setStartRowInput(value);
    const startRowNumber = parseManualRangeRowInput(value);
    if (startRowNumber !== undefined) {
      onChange(updateManualRangeValue(recipe, range.id, { startRowNumber }));
    }
  };

  const updateEndRowInput = (value: string) => {
    setEndRowInput(value);
    const endRowNumber = parseManualRangeRowInput(value);
    if (endRowNumber !== undefined) {
      onChange(updateManualRangeValue(recipe, range.id, { endRowNumber }));
    }
  };

  return (
    <div className={`manualRangeRangeItem${suggestedFromText ? ' hasSuggestedReference' : ''}`}>
      <label className="field compact manualRangeCellField">
        <span>Inicio</span>
        <input
          aria-label="Inicio"
          type="number"
          min="1"
          value={startRowInput}
          onChange={(event) => updateStartRowInput(event.target.value)}
        />
      </label>
      <label className="field compact manualRangeCellField">
        <span>Fin</span>
        <input
          aria-label="Fin"
          type="number"
          min="1"
          value={endRowInput}
          onChange={(event) => updateEndRowInput(event.target.value)}
        />
      </label>
      <div className="field compact manualRangeCellField manualRangeRowCountField">
        <span>Filas</span>
        <strong>{rowCount || '-'}</strong>
      </div>
      {suggestedFromText ? (
        <div className="field compact manualRangeReferenceField">
          <span>Referencia</span>
          <strong>{suggestedFromText}</strong>
        </div>
      ) : null}
      <RangeValueEditor
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onValueSourceTypeChange={(type) => onChange(updateManualRangeValueSourceType(recipe, range.id, type, inputColumns))}
        onFixedTextChange={(value) => onChange(updateManualRangeFixedTextValue(recipe, range.id, value))}
        onInputColumnChange={(inputColumnId) => onChange(updateManualRangeInputValue(recipe, range.id, inputColumnId))}
        onRangeTextChange={(patch) => onChange(updateManualRangeRangeTextValue(recipe, range.id, patch))}
        onStepsChange={(steps) => onChange(updateManualRangeValueRecipeSteps(recipe, range.id, steps))}
      />
      <div className="manualRangeActionsField">
        <span>Acciones</span>
        <div className="manualRangeRowActions">
          <ActionButton
            action="duplicate"
            variant="secondary"
            size="sm"
            title="Duplicar rango"
            aria-label="Duplicar rango"
            onClick={() => onChange(duplicateManualRangeValue(recipe, range.id))}
          />
          <DeleteButton title="Eliminar rango" onClick={() => onChange(removeManualRangeValue(recipe, range.id))} />
        </div>
      </div>
    </div>
  );
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
    return 'Todavía no se eligió cómo crear este valor.';
  }

  return getConstructorPartsSummary(recipe, inputColumns);
}

export function getCustomValuePartsDisplayLabel(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const concatStep = getConfiguredConcatStep(recipe);

  if (!concatStep && recipe.parts.length === 1) {
    return 'Origen/base';
  }

  return 'Partes configuradas';
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

function getConfiguredConcatStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
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
  const stepAdjustments = describeStepAdjustments(part.steps ?? [], inputColumns).map((adjustment) => `${adjustment} en ${partLabel}`);
  const separatorAdjustment = part.separatorAfter ? [`separador "${part.separatorAfter}" en ${partLabel}`] : [];

  return [...stepAdjustments, ...separatorAdjustment];
}

function describeStepAdjustments(steps: TransformStep[], inputColumns: InputColumn[] = []) {
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
    return ['sin operación seleccionada'];
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

function getStepSummary(step: TransformStep, inputColumns: InputColumn[] = []) {
  if (step.type === 'numericOperation') {
    return describeNumericOperation(step);
  }

  const [summary] = describeSimpleStep(step, inputColumns);
  return summary;
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
    return modal ? 'Configura el Paso 1 para ver la vista previa.' : 'Sin valores configurados';
  }

  const hasNumericOperands = hasConfiguredNumericStepOperands(recipe);
  const effectiveMode = hasNumericOperands ? 'number' : mode;

  if (effectiveMode === 'number' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasNumericOperands) {
    return 'Selecciona una columna numérica.';
  }

  if (effectiveMode === 'text' && !getSimpleInputPart(recipe).inputColumnId && !getFirstStepSource(recipe) && !hasConfiguredManualRangeStep(recipe)) {
    return 'Selecciona una columna de texto.';
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

export function getPreviousStepPreviewValue(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  sampleInputValues: Record<string, string> | undefined,
  stepIndex: number,
) {
  if (stepIndex <= 0 || !sampleInputValues) {
    return null;
  }

  const previousSteps = getVisibleRecipeSteps(recipe).slice(0, stepIndex);
  return buildCombinePreview({ ...recipe, steps: previousSteps }, sampleInputValues);
}

export type CustomValueMode = '' | PersistedCustomValueMode;

type ValueConstructionMode = '' | 'steps' | 'concat';

export const valueConstructionOptions: Array<{ value: Exclude<ValueConstructionMode, ''>; label: string }> = [
  { value: 'steps', label: 'Un valor con pasos' },
  { value: 'concat', label: 'Concatenar / unir partes' },
];

export const stepModeOptions: Array<{ value: TransformStepMode; label: string }> = [
  { value: 'text', label: 'Trabajar con texto' },
  { value: 'number', label: 'Trabajar con número' },
  { value: 'conversion', label: 'Conversión' },
  { value: 'date', label: 'Trabajar con fechas' },
  { value: 'manualRange', label: 'Trabajar con rangos' },
];

function CustomValueEditor({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  mode,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  mode: CustomValueMode;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const baseInputPart = getSimpleInputPart(recipe);
  const visibleSteps = getVisibleRecipeSteps(recipe, mode);
  const defaultStepMode = getDefaultStepModeForRecipe(recipe, mode);
  const updateBaseInputColumn = (inputColumnId: string) => {
    const nextMode = defaultStepMode === 'number' ? 'number' : 'text';
    onChange(buildSimpleCustomValueRecipeWithSteps(nextMode, inputColumnId, visibleSteps, recipe));
  };
  const updateSteps = (steps: TransformStep[]) => {
    onChange(buildStepBasedCustomValueRecipe(recipe, steps, defaultStepMode));
  };

  return (
    <div className="recipeSubBlock customValueEditor">
      <StepBlocksEditor
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        defaultStepMode={defaultStepMode}
        baseInputColumnId={baseInputPart.inputColumnId}
        steps={visibleSteps}
        requireAtLeastOne
        getPreviousStepPreviewValue={(stepIndex) => getPreviousStepPreviewValue(recipe, sampleInputValues, stepIndex)}
        onBaseInputColumnChange={updateBaseInputColumn}
        onStepsChange={updateSteps}
      />
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
  manualRangeRows = [],
  defaultStepMode,
  baseInputColumnId,
  steps,
  requireAtLeastOne = false,
  getPreviousStepPreviewValue,
  onBaseInputColumnChange,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  steps: TransformStep[];
  requireAtLeastOne?: boolean;
  getPreviousStepPreviewValue?: (stepIndex: number) => string | null;
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
              manualRangeRows={manualRangeRows}
              defaultStepMode={defaultStepMode}
              baseInputColumnId={baseInputColumnId}
              canDelete={!requireAtLeastOne || steps.length > 1}
              previousResultPreviewValue={getPreviousStepPreviewValue?.(index) ?? null}
              onBaseInputColumnChange={onBaseInputColumnChange}
              onChange={(patch) => onStepsChange(updateStep(steps, step.id, patch))}
              onDelete={() => deleteStep(index)}
            />
          ))}
        </div>
      )}
      <div className="stepsBlockActions">
        <InfoTooltip content="Agrega una transformacion nueva al valor.">
          <button type="button" className="secondary constructorAddStepButton" onClick={addStep}>Agregar paso</button>
        </InfoTooltip>
      </div>
    </div>
  );
}

function SimpleStepBlock({
  step,
  index,
  inputColumns,
  manualRangeRows,
  defaultStepMode,
  baseInputColumnId,
  canDelete,
  previousResultPreviewValue,
  onBaseInputColumnChange,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  defaultStepMode: TransformStepMode;
  baseInputColumnId: string;
  canDelete: boolean;
  previousResultPreviewValue?: string | null;
  onBaseInputColumnChange: (inputColumnId: string) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const summary = getStepSummary(step, inputColumns);
  const stepMode = getStepMode(step, defaultStepMode);
  const isManualRangeStep = step.type === 'manualRange';
  const showStepTypeSelect = shouldShowStepTypeSelectForStep(step);
  const stepSource = getVisibleStepSource(step, index, baseInputColumnId);
  const updateStepSource = (source: StepSource) => {
    if (index === 0 && source.type === 'input') {
      onBaseInputColumnChange(source.inputColumnId);
    }

    onChange({ source });
  };

  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className={`simpleCustomValueGrid${isManualRangeStep ? ' manualRangeStepGrid' : ''}`}>
        {step.type === 'concat' || isManualRangeStep ? (
          <div className="concatStepTopRow">
            <div className="concatStepTopControls">
              <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
              {showStepTypeSelect ? (
                <StepTypeSelect
                  step={step}
                  mode={stepMode}
                  onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
            <StepTypeSelect
              step={step}
              mode={stepMode}
              onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
            />
          </>
        )}
        <StepFields
          step={step}
          stepIndex={index}
          stepSource={stepSource}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          labels="workflow"
          previousResultPreviewValue={previousResultPreviewValue}
          onSourceChange={updateStepSource}
          onChange={onChange}
        />
        {step.type === 'concat' ? (
          <div className="concatStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
          </div>
        ) : isManualRangeStep ? (
          <div className="manualRangeStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
          </div>
        ) : (
          <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function StepsWorkspace({
  inputColumns,
  manualRangeRows = [],
  steps,
  requireAtLeastOne = false,
  onStepsChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
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
            <strong className="headingWithInfo">
              <span>Pasos</span>
              <InfoTooltip content="Cada paso transforma el resultado anterior." />
            </strong>
            <InfoTooltip content="Agrega una transformacion nueva al valor.">
              <button type="button" className="secondary constructorAddStepButton" onClick={addStep}>Agregar paso</button>
            </InfoTooltip>
          </div>
          {steps.length === 0 ? (
            <p className="muted">Sin pasos configurados.</p>
          ) : (
            <div className="stepsList">
              {steps.map((step, index) => {
                const summary = getStepSummary(step, inputColumns);

                return (
                  <button
                    type="button"
                    key={step.id}
                    className={`stepListItem${index === safeSelectedStepIndex ? ' selected' : ''}`}
                    onClick={() => setSelectedStepIndex(index)}
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
            manualRangeRows={manualRangeRows}
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
  manualRangeRows = [],
  canDelete,
  allowConcat = true,
  stepSource = step.source ?? { type: 'previousResult' },
  allowPreviousResultSource,
  previousResultPreviewValue,
  onSourceChange,
  onChange,
  onDelete,
}: {
  step: TransformStep;
  index: number;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  canDelete: boolean;
  allowConcat?: boolean;
  stepSource?: StepSource;
  allowPreviousResultSource?: boolean;
  previousResultPreviewValue?: string | null;
  onSourceChange?: (source: StepSource) => void;
  onChange: (patch: Partial<TransformStep>) => void;
  onDelete: () => void;
}) {
  const summary = getStepSummary(step, inputColumns);
  const stepMode = getStepMode(step);
  const isManualRangeStep = step.type === 'manualRange';
  const showStepTypeSelect = shouldShowStepTypeSelectForStep(step);
  return (
    <div className="stepDetailPanel">
      <div className="stepCardHeader">
        <strong>
          Paso {index + 1}{summary ? ` · ${summary}` : ''}
        </strong>
        {canDelete ? <DeleteButton title="Eliminar paso" onClick={onDelete} /> : <span aria-hidden="true" />}
      </div>
      <div className={`simpleCustomValueGrid${isManualRangeStep ? ' manualRangeStepGrid' : ''}`}>
        {step.type === 'concat' || isManualRangeStep ? (
          <div className="concatStepTopRow">
            <div className="concatStepTopControls">
              <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
              {showStepTypeSelect ? (
                <StepTypeSelect
                  step={step}
                  mode={stepMode}
                  allowConcat={allowConcat}
                  onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <StepModeSelect mode={stepMode} onChange={(mode) => onChange(changeStepMode(step, mode))} />
            <StepTypeSelect
              step={step}
              mode={stepMode}
              allowConcat={allowConcat}
              onChange={(type, operation) => onChange(replaceStepType(step, type, stepMode, operation, index))}
            />
          </>
        )}
        <StepFields
          step={step}
          stepIndex={index}
          stepSource={stepSource}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          labels="workflow"
          allowPreviousResultSource={allowPreviousResultSource}
          previousResultPreviewValue={previousResultPreviewValue}
          onSourceChange={onSourceChange ?? ((source) => onChange({ source }))}
          onChange={onChange}
        />
        {step.type === 'concat' ? (
          <div className="concatStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
          </div>
        ) : isManualRangeStep ? (
          <div className="manualRangeStepCondition">
            <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
          </div>
        ) : (
          <StepConditionFields step={step} inputColumns={inputColumns} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function StepTypeSelect({
  step,
  mode,
  allowConcat = true,
  action,
  onChange,
}: {
  step: TransformStep;
  mode?: TransformStepMode;
  allowConcat?: boolean;
  action?: ReactNode;
  onChange: (type: TransformStepType, operation?: NonNullable<TransformStep['operation']>) => void;
}) {
  if (mode === 'number') {
    return (
      <Dropdown<NonNullable<TransformStep['operation']> | ''>
        className="compact"
        label="Que quiero hacer"
        labelInfo={<InfoTooltip content="Define como se va a transformar esta informacion." />}
        value={step.type === 'numericOperation' ? step.operation ?? 'add' : ''}
        options={[
          { value: '', label: 'Usar valor tal cual' },
          ...numericOperationOptions,
        ]}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === '') {
            return;
          }

          onChange('numericOperation', value);
        }}
      />
    );
  }

  const options = mode ? getStepTypesForMode(mode, { allowConcat }) : getStepTypeOptions({ allowConcat });

  return (
    <div className="stepTypeFieldGroup">
      <Dropdown<TransformStepType>
        className="compact"
        label="Que quiero hacer"
        labelInfo={<InfoTooltip content="Define como se va a transformar esta informacion." />}
        value={step.type}
        options={options}
        scrollStrategy="close"
        onChange={(type) => onChange(type)}
      />
      {action}
    </div>
  );
}

export function shouldShowStepTypeSelectForStep(step: TransformStep) {
  return step.type !== 'manualRange';
}

function StepModeSelect({ mode, onChange }: { mode: TransformStepMode; onChange: (mode: TransformStepMode) => void }) {
  return (
    <Dropdown<TransformStepMode>
      className="compact"
      label="Tipo de operación"
      labelInfo={<InfoTooltip content="Agrupa las acciones segun el tipo de dato." />}
      value={mode}
      options={stepModeOptions}
      scrollStrategy="close"
      onChange={onChange}
    />
  );
}

function StepSourceFields({
  label = 'Desde donde toma el valor',
  source,
  inputColumns,
  allowPreviousResult,
  previousResultPreviewValue,
  fixedTextInputType = 'text',
  fixedTextDateInputFormat = defaultDateInputFormat,
  onChange,
}: {
  label?: string;
  source: StepSource;
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  previousResultPreviewValue?: string | null;
  fixedTextInputType?: 'text' | 'date';
  fixedTextDateInputFormat?: DateInputFormat;
  onChange: (source: StepSource) => void;
}) {
  const safeSource = !allowPreviousResult && source.type === 'previousResult'
    ? { type: 'input' as const, inputColumnId: '' }
    : source;
  const showPreviousResultHelp = shouldShowPreviousResultSourceHelp(safeSource);
  const showPreviousResultPreview = showPreviousResultHelp && previousResultPreviewValue !== null && previousResultPreviewValue !== undefined && previousResultPreviewValue !== '';
  const sourceValue = getStepSourceDropdownValue(safeSource);

  return (
    <>
      <Dropdown
        className="compact"
        label={label}
        labelInfo={<InfoTooltip content="Indica de donde sale el valor de este paso." />}
        value={sourceValue}
        options={getStepSourceDropdownOptions(inputColumns, allowPreviousResult)}
        placeholder="Seleccionar fuente"
        scrollStrategy="close"
        onChange={(value) => onChange(getStepSourceFromDropdownValue(value, safeSource))}
      />

      {showPreviousResultHelp ? (
        <div className="muted sourceHelpText">
          <p>{recipeEditorPreviousResultHelpText}</p>
          {showPreviousResultPreview ? (
            <p>Valor disponible: <strong>{previousResultPreviewValue}</strong></p>
          ) : null}
        </div>
      ) : null}

      {safeSource.type === 'fixedText' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>{fixedTextInputType === 'date' ? 'Fecha fija' : 'Texto fijo'}</span>
            <InfoTooltip content={fixedTextInputType === 'date' ? 'Fecha manual usada en este paso.' : 'Valor manual usado en este paso.'} />
          </span>
          <input
            type={fixedTextInputType}
            value={fixedTextInputType === 'date' ? getDatePickerValue(safeSource.value, fixedTextDateInputFormat) : safeSource.value}
            onChange={(event) => onChange({ type: 'fixedText', value: event.target.value })}
          />
        </label>
      ) : null}
    </>
  );
}

export function getDatePickerValue(value: string, inputFormat: DateInputFormat = defaultDateInputFormat) {
  const parsedAsIso = parseDateValue(value, 'YYYY-MM-DD');
  if (parsedAsIso) {
    return formatDateValue(parsedAsIso, 'YYYY-MM-DD');
  }

  const parsedWithInputFormat = parseDateValue(value, inputFormat);
  return parsedWithInputFormat ? formatDateValue(parsedWithInputFormat, 'YYYY-MM-DD') : '';
}

export function getStepSourceDropdownValue(source: StepSource) {
  if (source.type === 'previousResult') {
    return 'previousResult';
  }

  if (source.type === 'fixedText') {
    return 'fixedText';
  }

  return source.inputColumnId ? `input:${source.inputColumnId}` : '';
}

export function getStepSourceDropdownOptions(inputColumns: InputColumn[], allowPreviousResult: boolean): DropdownOption[] {
  return [
    ...(allowPreviousResult ? [{ value: 'previousResult', label: 'Resultado del paso anterior' }] : []),
    { value: 'fixedText', label: 'Texto fijo' },
    ...inputColumns.map((inputColumn) => ({ value: `input:${inputColumn.id}`, label: getInputColumnLabel(inputColumn) })),
  ];
}

export function getStepSourceFromDropdownValue(value: string, currentSource: StepSource): StepSource {
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

export function shouldShowPreviousResultSourceHelp(source: StepSource) {
  return source.type === 'previousResult';
}

function StepOperandFields({
  label,
  operand,
  inputColumns,
  allowPreviousResult,
  onChange,
}: {
  label: string;
  operand: StepOperand;
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  onChange: (operand: StepOperand) => void;
}) {
  const safeOperand = !allowPreviousResult && operand.type === 'previousResult'
    ? { type: 'fixedText' as const, value: '0', numericFallback: 0 }
    : operand;

  return (
    <>
      <Dropdown<StepOperand['type']>
        className="compact"
        label={label}
        labelInfo={<InfoTooltip content="Elige si el valor viene de una columna, un numero fijo o un paso previo." />}
        value={safeOperand.type}
        options={[
          ...(allowPreviousResult ? [{ value: 'previousResult' as const, label: 'Resultado del paso anterior' }] : []),
          { value: 'input', label: 'Columna de entrada' },
          { value: 'fixedText', label: 'Valor fijo' },
        ]}
        scrollStrategy="close"
        onChange={(type) => {
          if (type === 'previousResult') {
            onChange({ type: 'previousResult' });
            return;
          }

          if (type === 'input') {
            onChange({ type: 'input', inputColumnId: inputColumns[0]?.id ?? '' });
            return;
          }

          onChange({ type: 'fixedText', value: '0', numericFallback: 0 });
        }}
      />

      {safeOperand.type === 'input' ? (
        <InputColumnSelect
          label={`${label}: columna`}
          value={safeOperand.inputColumnId}
          inputColumns={inputColumns}
          onChange={(inputColumnId) => onChange({ type: 'input', inputColumnId })}
        />
      ) : null}

      {safeOperand.type === 'fixedText' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>{label}: valor fijo</span>
            <InfoTooltip content="Numero manual para usar en la operacion." />
          </span>
          <input
            type="number"
            step="any"
            value={safeOperand.value}
            onChange={(event) => {
              const value = normalizeNumberInputWhileTyping(safeOperand.value, event.target.value);
              const numericFallback = parseOptionalNumberInput(value);
              onChange({
                type: 'fixedText',
                value,
                ...(numericFallback === undefined ? {} : { numericFallback }),
              });
            }}
          />
        </label>
      ) : null}
    </>
  );
}

function InputColumnSelect({
  value,
  inputColumns,
  label = 'Columna de entrada',
  onChange,
}: {
  value: string;
  inputColumns: InputColumn[];
  label?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Dropdown
      className="compact"
      label={label}
      labelInfo={<InfoTooltip content="Elegi la columna del Excel que contiene este dato." />}
      value={value}
      options={[
        { value: '', label: 'Seleccionar columna' },
        ...inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) })),
      ]}
      scrollStrategy="close"
      onChange={onChange}
    />
  );
}

function CombineRecipeFields({
  recipe,
  inputColumns,
  manualRangeRows = [],
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
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
        <p className="headingWithInfo">
          <span>Partes del valor</span>
          <InfoTooltip content="Cada parte aporta un dato o texto al valor final." />
        </p>
        <InfoTooltip content="Agrega otro dato o texto a combinar.">
          <button type="button" className="secondary constructorAddPartButton" onClick={addPart}>
            Agregar parte
          </button>
        </InfoTooltip>
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
                      <span>{summary}</span>
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
                manualRangeRows={manualRangeRows}
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
          <span className="labelWithInfo">
            <span>Separador antes de esta parte</span>
            <InfoTooltip content="Texto que separa esta parte de la anterior." />
          </span>
          <input
            value={separatorBefore}
            onChange={(event) => onSeparatorBeforeChange(event.target.value)}
            placeholder={globalSeparator || 'Sin separador'}
          />
        </label>
      ) : null}

      <Dropdown<RecipePart['type']>
        className="compact"
        label="Tipo de parte"
        labelInfo={<InfoTooltip content="Elige si la parte viene de una columna o de texto fijo." />}
        value={part.type}
        options={[
          { value: 'input', label: 'Columna de entrada' },
          { value: 'text', label: 'Texto fijo' },
        ]}
        scrollStrategy="close"
        onChange={updateOrigin}
      />

      {part.type === 'text' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>Texto</span>
            <InfoTooltip content="Texto manual para sumar al valor." />
          </span>
          <input value={part.type === 'text' ? part.value : ''} onChange={(event) => onChange({ ...part, value: event.target.value })} />
        </label>
      ) : (
        <InputColumnSelect value={part.type === 'input' ? part.inputColumnId : ''} inputColumns={inputColumns} label="Columna" onChange={updateInputColumn} />
      )}
    </>
  );
}

function ConcatStepFields({
  parts,
  inputColumns,
  manualRangeRows,
  allowPreviousResult,
  previousResultPreviewValue,
  onChange,
}: {
  parts: ConcatPart[];
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  allowPreviousResult: boolean;
  previousResultPreviewValue?: string | null;
  onChange: (parts: ConcatPart[]) => void;
}) {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(parts[0]?.id ?? null);
  const previousPartCountRef = useRef(parts.length);
  const safeSelectedPartId = getSafeSelectedConcatPartId(parts, selectedPartId);
  const selectedPart = parts.find((part) => part.id === safeSelectedPartId);
  const selectedPartIndex = selectedPart ? parts.findIndex((part) => part.id === selectedPart.id) : -1;

  useEffect(() => {
    if (parts.length > previousPartCountRef.current) {
      setSelectedPartId(parts[parts.length - 1]?.id ?? null);
    }

    previousPartCountRef.current = parts.length;
  }, [parts]);

  const updatePart = (partId: string, nextPart: ConcatPart) => {
    onChange(parts.map((part) => (part.id === partId ? nextPart : part)));
  };
  const addPart = () => {
    onChange([
      ...parts,
      createDefaultConcatPart(parts.length, allowPreviousResult),
    ]);
  };
  const removePart = (partId: string) => {
    setSelectedPartId(getNextSelectedConcatPartIdAfterRemove(parts, partId, safeSelectedPartId));
    onChange(parts.filter((part) => part.id !== partId));
  };

  return (
    <div className="concatStepFields">
      {parts.length === 0 ? (
        <div className="concatPartsEmptyState">
          <p className="muted">Agrega una parte para construir el valor.</p>
          <InfoTooltip content="Agrega otro dato o texto a combinar.">
            <button type="button" className="secondary concatAddPartButton" onClick={addPart}>Agregar parte</button>
          </InfoTooltip>
        </div>
      ) : null}
      {parts.length > 0 ? (
        <div className="concatPartsWorkspace">
          <div className="concatPartsSidebar">
            <SortableList
              items={parts}
              onChange={(nextParts) => onChange(normalizeConcatPartsAfterReorder(nextParts))}
              renderItem={(part, handle) => {
                const index = parts.findIndex((item) => item.id === part.id);

                return (
                  <div className={`concatPartListItem${part.id === safeSelectedPartId ? ' selected' : ''}`}>
                    {handle}
                    <button
                      type="button"
                      className="concatPartSelectButton"
                      onClick={() => setSelectedPartId(part.id)}
                    >
                      <strong>Parte {index + 1}</strong>
                      <span>{describeConcatPartSource(part, inputColumns)}</span>
                    </button>
                  </div>
                );
              }}
            />
            <InfoTooltip content="Agrega otro dato o texto a combinar.">
              <button type="button" className="secondary concatAddPartButton" onClick={addPart}>Agregar parte</button>
            </InfoTooltip>
          </div>
          {selectedPart ? (
            <div className="concatPartDetailPanel">
              <div className="concatPartHeader">
                <strong className="headingWithInfo">
                  <span>Parte {selectedPartIndex + 1}</span>
                  <InfoTooltip content="Configura el dato o texto de esta parte." />
                </strong>
                <DeleteButton title="Eliminar parte" onClick={() => removePart(selectedPart.id)} />
              </div>
              <ConcatPartStepsEditor
                inputColumns={inputColumns}
                manualRangeRows={manualRangeRows}
                steps={selectedPart.steps ?? []}
                baseSource={selectedPart.source}
                separatorFields={selectedPartIndex > 0 ? (
                  <div className="concatPartFields">
                    <label className="field compact">
                      <span className="labelWithInfo">
                        <span>Separador antes de esta parte</span>
                        <InfoTooltip content="Texto que separa esta parte de la anterior." />
                      </span>
                      <input
                        value={selectedPart.separatorBefore ?? ''}
                        onChange={(event) => updatePart(selectedPart.id, { ...selectedPart, separatorBefore: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
                previousResultPreviewValue={previousResultPreviewValue}
                onBaseSourceChange={(source, nextSteps) => updatePart(
                  selectedPart.id,
                  {
                    ...selectedPart,
                    source,
                    ...(nextSteps ? { steps: nextSteps } : {}),
                  },
                )}
                onChange={(steps) => onChange(updateConcatPartSteps(parts, selectedPart.id, steps))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConcatPartStepsEditor({
  inputColumns,
  manualRangeRows,
  steps,
  baseSource,
  separatorFields,
  previousResultPreviewValue,
  onBaseSourceChange,
  onChange,
}: {
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  steps: TransformStep[];
  baseSource: StepSource;
  separatorFields?: ReactNode;
  previousResultPreviewValue?: string | null;
  onBaseSourceChange: (source: StepSource, nextSteps?: TransformStep[]) => void;
  onChange: (steps: TransformStep[]) => void;
}) {
  const primaryStep = getVisibleConcatPartPrimaryStep(steps);
  const additionalSteps = steps.slice(1);
  const updatePrimaryStep = (patch: Partial<TransformStep>) => {
    onChange(updateConcatPartPrimaryStep(steps, patch));
  };
  const updatePrimaryStepSource = (source: StepSource) => {
    onBaseSourceChange(source, primaryStep.source ? clearPrimaryStepSource(steps) : undefined);
  };
  const addAdditionalStep = () => {
    onChange([...steps, createNoopStep('text')]);
  };
  const updateAdditionalStep = (stepId: string, patch: Partial<TransformStep>) => {
    onChange([
      primaryStep,
      ...additionalSteps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    ]);
  };
  const deleteAdditionalStep = (stepId: string) => {
    onChange([primaryStep, ...additionalSteps.filter((step) => step.id !== stepId)]);
  };

  return (
    <div className="concatPartStepsEditor">
      {separatorFields ? (
        <div className="concatPartSeparatorBlock">
          {separatorFields}
        </div>
      ) : null}

      <StepDetailPanel
        step={primaryStep}
        index={0}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        canDelete={false}
        allowConcat={false}
        stepSource={primaryStep.source ?? baseSource}
        allowPreviousResultSource
        previousResultPreviewValue={baseSource.type === 'previousResult' ? previousResultPreviewValue : null}
        onSourceChange={updatePrimaryStepSource}
        onChange={updatePrimaryStep}
        onDelete={() => undefined}
      />

      <div className="concatPartStepsBlock">
        {additionalSteps.length > 0 ? (
          <div className="concatPartTransformList">
            {additionalSteps.map((step, index) => {
              const transformIndex = index + 1;

              return (
                <StepDetailPanel
                  key={step.id}
                  step={step}
                  index={transformIndex}
                  inputColumns={inputColumns}
                  manualRangeRows={manualRangeRows}
                  canDelete
                  allowConcat={false}
                  allowPreviousResultSource
                  previousResultPreviewValue={previousResultPreviewValue}
                  onChange={(patch) => updateAdditionalStep(step.id, patch)}
                  onDelete={() => deleteAdditionalStep(step.id)}
                />
              );
            })}
          </div>
        ) : null}
        <div className="concatPartStepsActions">
          <InfoTooltip content="Agrega una transformacion adicional a esta parte.">
            <button type="button" className="secondary concatAddAdjustmentButton" onClick={addAdditionalStep}>{recipeEditorAdditionalStepLabel}</button>
          </InfoTooltip>
        </div>
      </div>
    </div>
  );
}

function clearPrimaryStepSource(steps: TransformStep[]) {
  if (steps.length === 0) {
    return steps;
  }

  const [{ source: _source, ...primaryStep }, ...additionalSteps] = steps;
  return [primaryStep, ...additionalSteps];
}

const stepTypes: Array<{ value: TransformStepType; label: string }> = [
  { value: 'noop', label: 'Usar valor tal cual' },
  { value: 'trim', label: 'Limpiar espacios' },
  { value: 'uppercase', label: 'Convertir a mayúsculas' },
  { value: 'lowercase', label: 'Convertir a minúsculas' },
  { value: 'addPrefix', label: 'Agregar prefijo' },
  { value: 'addSuffix', label: 'Agregar sufijo' },
  { value: 'removeText', label: 'Quitar texto' },
  { value: 'replaceText', label: 'Reemplazar texto' },
  { value: 'manualRange', label: 'Trabajar con rangos' },
  { value: 'concat', label: 'Concatenar' },
  { value: 'extractNumber', label: 'Extraer número del texto' },
  { value: 'toNumber', label: 'Convertir a número' },
  { value: 'toText', label: 'Convertir a texto' },
  { value: 'formatDate', label: 'Formatear fecha' },
  { value: 'numericOperation', label: 'Operación numérica' },
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
  'concat',
].includes(stepType.value));

const dateStepTypes = stepTypes.filter((stepType) => [
  'noop',
  'formatDate',
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

function getStepTypeOptions({ allowConcat = true }: { allowConcat?: boolean } = {}) {
  return allowConcat ? stepTypes : stepTypes.filter((stepType) => stepType.value !== 'concat');
}

export function getStepTypesForMode(mode: TransformStepMode, { allowConcat = true }: { allowConcat?: boolean } = {}) {
  if (mode === 'manualRange') {
    return stepTypes.filter((stepType) => stepType.value === 'manualRange');
  }

  if (mode === 'number') {
    return numberStepTypes;
  }

  if (mode === 'conversion') {
    return conversionStepTypes;
  }

  if (mode === 'date') {
    return dateStepTypes;
  }

  return allowConcat ? textStepTypes : textStepTypes.filter((stepType) => stepType.value !== 'concat');
}

type StepFieldLabels = 'default' | 'workflow';

function StepFields({
  step,
  stepIndex = 0,
  stepSource,
  inputColumns,
  manualRangeRows = [],
  labels = 'default',
  showSourceFields = true,
  allowPreviousResultSource,
  previousResultPreviewValue,
  onSourceChange,
  onChange,
}: {
  step: TransformStep;
  stepIndex?: number;
  stepSource: StepSource;
  inputColumns: InputColumn[];
  manualRangeRows?: InputRow[];
  labels?: StepFieldLabels;
  showSourceFields?: boolean;
  allowPreviousResultSource?: boolean;
  previousResultPreviewValue?: string | null;
  onSourceChange: (source: StepSource) => void;
  onChange: (patch: Partial<TransformStep>) => void;
}) {
  const canUsePreviousResultSource = allowPreviousResultSource ?? stepIndex > 0;
  const usesFixedDateSource = step.type === 'formatDate' && stepSource.type === 'fixedText';
  const updateSource = (source: StepSource) => {
    if (step.type === 'formatDate' && source.type === 'fixedText') {
      onChange({
        source: { type: 'fixedText', value: getDatePickerValue(source.value, step.dateInputFormat ?? defaultDateInputFormat) },
        dateInputFormat: 'YYYY-MM-DD',
      });
      return;
    }

    onSourceChange(source);
  };
  const sourceFields = showSourceFields && shouldShowTextSourceFields(step.type) ? (
    <StepSourceFields
      label="Desde donde toma el valor"
      source={stepSource}
      inputColumns={inputColumns}
      allowPreviousResult={canUsePreviousResultSource}
      previousResultPreviewValue={previousResultPreviewValue}
      fixedTextInputType={step.type === 'formatDate' ? 'date' : 'text'}
      fixedTextDateInputFormat={step.dateInputFormat ?? defaultDateInputFormat}
      onChange={updateSource}
    />
  ) : null;

  if (step.type === 'noop') {
    return sourceFields;
  }

  if (step.type === 'manualRange') {
    return (
      <div className="manualRangeStepFields">
        <ManualRangeRecipeEditor
          recipe={manualRangeStepToRecipe(step)}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={(recipe) => onChange(manualRangeRecipeToStepPatch(recipe))}
        />
      </div>
    );
  }

  if (step.type === 'addPrefix') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Prefijo' : 'Texto al inicio'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'addSuffix') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Sufijo' : 'Texto al final'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'removeText') {
    return (
      <>
        {sourceFields}
        <label className="field compact">
          <span>{labels === 'workflow' ? 'Texto a quitar' : 'Texto a quitar'}</span>
          <input value={step.value ?? ''} onChange={(event) => onChange({ value: event.target.value })} />
        </label>
      </>
    );
  }

  if (step.type === 'replaceText') {
    return (
      <>
        {sourceFields}
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
    const leftOperand = getVisibleLeftOperand(step, stepSource);
    const rightOperand = getVisibleRightOperand(step);

    return (
      <div className="numericOperationFields">
        <StepOperandFields
          label="Primer valor"
          operand={leftOperand}
          inputColumns={inputColumns}
          allowPreviousResult={canUsePreviousResultSource}
          onChange={(leftOperand) => onChange({ leftOperand })}
        />
        <StepOperandFields
          label="Segundo valor"
          operand={rightOperand}
          inputColumns={inputColumns}
          allowPreviousResult={canUsePreviousResultSource}
          onChange={(rightOperand) => onChange({
            rightOperand,
            ...(rightOperand.type === 'fixedText' ? { amount: parseOptionalNumberInput(rightOperand.value) } : {}),
          })}
        />
        <Dropdown
          className="compact"
          label={labels === 'workflow' ? 'Decimales / redondeo' : 'Redondeo'}
          labelInfo={<InfoTooltip content="Define como mostrar los numeros del resultado." />}
          value={String(step.rounding ?? 2)}
          options={[
            { value: 'none', label: 'Sin redondeo' },
            { value: '0', label: '0 decimales' },
            { value: '2', label: '2 decimales' },
            { value: '4', label: '4 decimales' },
          ]}
          scrollStrategy="close"
          onChange={(value) => onChange({ rounding: parseRounding(value) })}
        />
      </div>
    );
  }

  if (step.type === 'concat') {
    return (
      <ConcatStepFields
        parts={step.parts ?? []}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        allowPreviousResult={canUsePreviousResultSource}
        previousResultPreviewValue={previousResultPreviewValue}
        onChange={(parts) => onChange({ parts })}
      />
    );
  }

  if (step.type === 'formatDate') {
    return (
      <>
        {sourceFields}
        {usesFixedDateSource ? null : (
          <Dropdown<DateInputFormat>
            className="compact"
            label="Formato de entrada"
            value={step.dateInputFormat ?? defaultDateInputFormat}
            options={dateInputFormatOptions}
            scrollStrategy="close"
            onChange={(dateInputFormat) => onChange({ dateInputFormat })}
          />
        )}
        <Dropdown<DateOutputFormat>
          className="compact"
          label="Formato de salida"
          value={step.dateOutputFormat ?? defaultDateOutputFormat}
          options={dateOutputFormatOptions}
          scrollStrategy="close"
          onChange={(dateOutputFormat) => onChange({ dateOutputFormat })}
        />
        <Dropdown<DateInvalidFallback>
          className="compact"
          label="Si no es una fecha válida"
          value={step.dateInvalidFallback ?? defaultDateInvalidFallback}
          options={dateInvalidFallbackOptions}
          scrollStrategy="close"
          onChange={(dateInvalidFallback) => onChange({ dateInvalidFallback })}
        />
        {(step.dateInvalidFallback ?? defaultDateInvalidFallback) === 'fixedText' ? (
          <label className="field compact">
            <span>Texto fallback</span>
            <input value={step.dateInvalidFallbackText ?? ''} onChange={(event) => onChange({ dateInvalidFallbackText: event.target.value })} />
          </label>
        ) : null}
      </>
    );
  }

  if (step.type === 'extractNumber') {
    return sourceFields;
  }

  if (step.type === 'toNumber') {
    return sourceFields;
  }

  if (step.type === 'toText') {
    return sourceFields;
  }

  return sourceFields;
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
    <div className="transformConditionBlock conditionFieldsRow">
      <Dropdown<'always' | 'conditional'>
        className="compact"
        label="Condición"
        labelInfo={<InfoTooltip content="Elige si este paso se aplica siempre o solo en algunos casos." />}
        value={condition ? 'conditional' : 'always'}
        options={[
          { value: 'always', label: 'Aplicar siempre' },
          { value: 'conditional', label: 'Aplicar solo si...' },
        ]}
        scrollStrategy="close"
        onChange={(value) => {
          if (value === 'always') {
            onChange({ condition: undefined });
            return;
          }

          onChange({ condition: createDefaultCondition(inputColumns) });
        }}
      />

      {condition ? (
        <Dropdown
          className="compact"
          label="Columna"
          labelInfo={<InfoTooltip content="Columna que se revisa para decidir si aplicar el paso." />}
          value={inputCondition?.columnId ?? ''}
          options={conditionColumns.length === 0
            ? [{ value: '', label: 'Sin columnas' }]
            : conditionColumns.map((item) => ({ value: item.id, label: getInputColumnLabel(item) }))}
          scrollStrategy="close"
          onChange={(columnId) => onChange({ condition: { ...(inputCondition ?? createDefaultCondition(inputColumns)), columnId } })}
        />
      ) : null}
      {condition ? (
        <Dropdown<ConditionOperator>
          className="compact"
          label="Operador"
          labelInfo={<InfoTooltip content="Regla que compara la columna elegida." />}
          value={inputCondition?.operator ?? 'isNotEmpty'}
          options={conditionOperators}
          scrollStrategy="close"
          onChange={(operator) => {
            onChange({
              condition: {
                ...(inputCondition ?? createDefaultCondition(inputColumns)),
                operator,
                valueType: isNumericConditionOperator(operator) ? 'number' : 'text',
              },
            });
          }}
        />
      ) : null}
      {inputCondition && conditionNeedsValue(inputCondition.operator) ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>Valor condición</span>
            <InfoTooltip content="Valor que debe coincidir para aplicar el paso." />
          </span>
          <input value={inputCondition.value ?? ''} onChange={(event) => onChange({ condition: { ...inputCondition, value: event.target.value } })} />
        </label>
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
  { value: 'numericEquals', label: 'igual numérico' },
  { value: 'numericNotEquals', label: 'distinto numérico' },
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

export const numericOperationOptions = Object.entries(numericOperationLabels).map(([value, label]) => ({
  value: value as NonNullable<TransformStep['operation']>,
  label,
}));

export const dateInputFormatOptions: Array<{ value: DateInputFormat; label: string }> = supportedDateInputFormats.map((format) => ({
  value: format,
  label: getDateInputFormatLabel(format),
}));

export const dateOutputFormatOptions: Array<{ value: DateOutputFormat; label: string }> = supportedDateOutputFormats.map((format) => ({
  value: format,
  label: getDateOutputFormatLabel(format),
}));

const dateInvalidFallbackOptions: Array<{ value: DateInvalidFallback; label: string }> = [
  { value: 'empty', label: 'Dejar vacío' },
  { value: 'original', label: 'Mantener valor original' },
  { value: 'fixedText', label: 'Usar texto fijo' },
];

function getDateInputFormatLabel(format: DateInputFormat) {
  const labels: Record<DateInputFormat, string> = {
    'DD/MM/YYYY': 'DD/MM/AAAA',
    'D/M/YYYY': 'D/M/AAAA',
    'YYYY-MM-DD': 'AAAA-MM-DD',
    'MM/DD/YYYY': 'MM/DD/AAAA',
    'M/D/YYYY': 'M/D/AAAA',
    'DD-MM-YYYY': 'DD-MM-AAAA',
    'YYYY/MM/DD': 'AAAA/MM/DD',
    'DD/MM/YY': 'DD/MM/AA',
    'D/M/YY': 'D/M/AA',
    'MM/DD/YY': 'MM/DD/AA',
    'M/D/YY': 'M/D/AA',
  };

  return labels[format];
}

function getDateOutputFormatLabel(format: DateOutputFormat) {
  const labels: Record<DateOutputFormat, string> = {
    'DD/MM/YYYY': 'DD/MM/AAAA',
    'YYYY-MM-DD': 'AAAA-MM-DD',
    'MM/DD/YYYY': 'MM/DD/AAAA',
    'DD-MM-YYYY': 'DD-MM-AAAA',
    'YYYY/MM/DD': 'AAAA/MM/DD',
  };

  return labels[format];
}

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

export function updateStep(steps: TransformStep[], id: string, patch: Partial<TransformStep>) {
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
    const hasBaseSource = Boolean(getSimpleInputPart(recipe).inputColumnId || getFirstStepSource(recipe) || hasConfiguredManualRangeStep(recipe));
    return Boolean(recipe.steps?.[0] && (hasBaseSource || (mode === 'number' && hasConfiguredNumericStepOperands(recipe))));
  }

  return (
    recipe.parts.length > 0 &&
    recipe.parts.every((part) => part.type === 'text' || Boolean(part.inputColumnId))
  ) || hasConfiguredConcatStep(recipe);
}

function getFirstStepSource(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.steps?.[0]?.source;
}

function hasConfiguredConcatStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'concat' && (step.parts ?? []).length > 0);
}

function hasConfiguredNumericStepOperands(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'numericOperation' && (step.leftOperand || step.rightOperand));
}

function hasConfiguredManualRangeStep(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).some((step) => step.type === 'manualRange' && (step.ranges ?? []).length > 0);
}

function canPreviewNumericValue(recipe: Extract<OutputRecipe, { type: 'combine' }>, sampleInputValues?: Record<string, string>) {
  const part = getSimpleInputPart(recipe);
  const firstStepSource = getFirstStepSource(recipe);
  if ((recipe.steps ?? []).some((step) => step.type === 'numericOperation' && (step.leftOperand || step.rightOperand))) {
    return true;
  }

  if (!sampleInputValues || (!part.inputColumnId && !firstStepSource)) {
    return true;
  }

  const firstStep = recipe.steps?.[0];
  if (firstStep?.type === 'noop' || firstStep?.type === 'extractNumber' || firstStep?.type === 'toText' || (firstStep && isTextStepType(firstStep.type))) {
    return true;
  }

  if (firstStepSource?.type === 'fixedText') {
    return parseNumericValue(firstStepSource.value) !== null;
  }

  const inputColumnId = firstStepSource?.type === 'input' ? firstStepSource.inputColumnId : part.inputColumnId;
  return parseNumericValue(sampleInputValues[inputColumnId]) !== null;
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

export function getVisibleRecipeSteps(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode): TransformStep[] {
  const mode = modeOverride ?? getCustomValueMode(recipe);

  if (isStepBasedConcatRecipe(recipe)) {
    return ensureAtLeastOneStep(recipe.steps ?? [], 'text');
  }

  if (mode === 'concat') {
    return ensureAtLeastOneStep([
      createConcatStepFromLegacyRecipe(recipe),
      ...(recipe.steps ?? []),
    ], 'text');
  }

  return ensureAtLeastOneStep(recipe.steps ?? [], getDefaultStepModeForRecipe(recipe, mode));
}

function ensureAtLeastOneStep(steps: TransformStep[], fallbackMode: TransformStepMode) {
  return steps.length > 0 ? steps : [createNoopStep(fallbackMode)];
}

function getDefaultStepModeForRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>, modeOverride?: CustomValueMode): TransformStepMode {
  const mode = modeOverride ?? getCustomValueMode(recipe);
  if (mode === 'number') {
    return 'number';
  }

  return 'text';
}

function isStepBasedConcatRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return recipe.parts.length === 0 && (recipe.steps ?? []).some((step) => step.type === 'concat');
}

function createConcatStepFromLegacyRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>): TransformStep {
  return {
    id: recipe.parts[0]?.id ? `concat-${recipe.parts[0].id}` : crypto.randomUUID(),
    mode: 'text',
    type: 'concat',
    parts: recipePartsToConcatParts(recipe.parts, recipe.separator),
    applyToEmptyValues: false,
  };
}

function recipePartsToConcatParts(parts: RecipePart[], globalSeparator?: string): ConcatPart[] {
  return parts.map((part, index) => {
    const previousPart = parts[index - 1];
    return {
      id: part.id,
      source: recipePartToStepSource(part),
      ...(index > 0 ? { separatorBefore: previousPart?.separatorAfter ?? globalSeparator ?? '' } : {}),
      ...(part.steps ? { steps: part.steps } : {}),
    };
  });
}

function recipePartToStepSource(part: RecipePart): StepSource {
  if (part.type === 'input') {
    return { type: 'input', inputColumnId: part.inputColumnId };
  }

  return { type: 'fixedText', value: part.value };
}

export function getSafeSelectedConcatPartId(parts: ConcatPart[], selectedPartId: string | null) {
  if (parts.some((part) => part.id === selectedPartId)) {
    return selectedPartId;
  }

  return parts[0]?.id ?? null;
}

export function getNextSelectedConcatPartIdAfterRemove(
  parts: ConcatPart[],
  removedPartId: string,
  selectedPartId: string | null,
) {
  if (selectedPartId !== removedPartId) {
    return getSafeSelectedConcatPartId(parts.filter((part) => part.id !== removedPartId), selectedPartId);
  }

  const removedIndex = parts.findIndex((part) => part.id === removedPartId);
  const nextParts = parts.filter((part) => part.id !== removedPartId);
  return nextParts[removedIndex]?.id ?? nextParts[removedIndex - 1]?.id ?? nextParts[0]?.id ?? null;
}

export function normalizeConcatPartsAfterReorder(parts: ConcatPart[]) {
  const [firstPart, secondPart, ...restParts] = parts;
  if (!firstPart?.separatorBefore || !secondPart || secondPart.separatorBefore) {
    return parts;
  }

  return [
    omitSeparatorBefore(firstPart),
    { ...secondPart, separatorBefore: firstPart.separatorBefore },
    ...restParts,
  ];
}

export function updateConcatPartSteps(parts: ConcatPart[], partId: string, steps: TransformStep[]) {
  return parts.map((part) => (part.id === partId ? { ...part, steps } : part));
}

function omitSeparatorBefore(part: ConcatPart): ConcatPart {
  const { separatorBefore: _separatorBefore, ...nextPart } = part;
  return nextPart;
}

export function describeConcatPartSource(part: ConcatPart, inputColumns: InputColumn[]) {
  const manualRangeStep = findManualRangeStep(part.steps ?? []);

  if (manualRangeStep) {
    return describeManualRangeStepSummary(manualRangeStep, inputColumns);
  }

  const { source } = part;

  if (source.type === 'previousResult') {
    return 'Resultado del paso anterior';
  }

  if (source.type === 'fixedText') {
    return `Texto fijo "${source.value || ''}"`;
  }

  if (source.type === 'input') {
    const inputColumnId = source.inputColumnId;
    const inputColumn = inputColumns.find((column) => column.id === inputColumnId);
    return inputColumn ? getInputColumnSummary(inputColumn) : 'Columna de entrada';
  }

  return 'Columna de entrada';
}

function findManualRangeStep(steps: TransformStep[]): TransformStep | undefined {
  for (const step of steps) {
    if (step.type === 'manualRange') {
      return step;
    }

    if (step.type === 'concat') {
      const nestedStep = (step.parts ?? []).reduce<TransformStep | undefined>(
        (foundStep, part) => foundStep ?? findManualRangeStep(part.steps ?? []),
        undefined,
      );

      if (nestedStep) {
        return nestedStep;
      }
    }
  }

  return undefined;
}

export function getVisibleConcatPartPrimaryStep(steps: TransformStep[]) {
  return steps[0] ?? createNoopStep('text');
}

export function updateConcatPartPrimaryStep(steps: TransformStep[], patch: Partial<TransformStep>) {
  const primaryStep = getVisibleConcatPartPrimaryStep(steps);
  return [{ ...primaryStep, ...patch }, ...steps.slice(1)];
}

export function createDefaultConcatPart(index: number, preferPreviousResult = false): ConcatPart {
  return {
    id: crypto.randomUUID(),
    source: preferPreviousResult ? { type: 'previousResult' } : { type: 'input', inputColumnId: '' },
    ...(index > 0 ? { separatorBefore: '' } : {}),
  };
}

function buildStepBasedCustomValueRecipe(
  current: Extract<OutputRecipe, { type: 'combine' }>,
  steps: TransformStep[],
  fallbackMode: TransformStepMode,
): Extract<OutputRecipe, { type: 'combine' }> {
  const firstStep = steps[0];

  if (firstStep?.type === 'concat') {
    return {
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps,
    };
  }

  const inferredMode = inferCustomModeFromSteps(steps, fallbackMode);
  return buildSimpleCustomValueRecipeWithSteps(
    inferredMode,
    getSimpleInputPart(current).inputColumnId,
    steps,
    current,
  );
}

function inferCustomModeFromSteps(steps: TransformStep[], fallbackMode: TransformStepMode): 'number' | 'text' {
  if (steps.some((step) => getStepMode(step, fallbackMode) === 'number' || step.type === 'numericOperation')) {
    return 'number';
  }

  return 'text';
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

function createNumericOperationStep(operation: NonNullable<TransformStep['operation']> = 'add'): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: 'number',
    type: 'numericOperation',
    operation,
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

function createTextOperationStep(type: TransformStepType, condition?: TransformCondition, stepIndex = 0): TransformStep {
  if (type === 'concat') {
    return {
      id: crypto.randomUUID(),
      mode: 'text',
      type: 'concat',
      parts: [createDefaultConcatPart(0, stepIndex > 0)],
      condition,
      applyToEmptyValues: false,
    };
  }

  if (type === 'formatDate') {
    return {
      id: crypto.randomUUID(),
      mode: 'date',
      type,
      value: '',
      searchValue: '',
      replaceValue: '',
      dateInputFormat: defaultDateInputFormat,
      dateOutputFormat: defaultDateOutputFormat,
      dateInvalidFallback: defaultDateInvalidFallback,
      dateInvalidFallbackText: '',
      condition,
      applyToEmptyValues: false,
    };
  }

  if (type === 'manualRange') {
    return createManualRangeStep(condition);
  }

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

function createManualRangeStep(condition?: TransformCondition): TransformStep {
  return {
    id: crypto.randomUUID(),
    mode: 'manualRange',
    type: 'manualRange',
    ranges: [],
    condition,
    applyToEmptyValues: false,
  };
}

function replaceStepType(
  step: TransformStep,
  type: TransformStepType,
  mode: TransformStepMode,
  operation?: NonNullable<TransformStep['operation']>,
  stepIndex = 0,
): Partial<TransformStep> {
  if (type === 'numericOperation') {
    if (step.type === 'numericOperation') {
      return {
        operation: operation ?? step.operation ?? 'add',
        mode,
      };
    }

    return {
      ...createNumericOperationStep(operation),
      id: step.id,
      mode,
      condition: step.condition,
      applyToEmptyValues: step.applyToEmptyValues,
    };
  }

  if (type === 'manualRange') {
    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      mode,
      applyToEmptyValues: step.applyToEmptyValues,
    };
  }

  return {
    ...createTextOperationStep(type, step.condition, stepIndex),
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

function getVisibleStepSource(step: TransformStep, index: number, baseInputColumnId: string): StepSource {
  if (step.source) {
    if (index === 0 && step.source.type === 'previousResult') {
      return { type: 'input', inputColumnId: baseInputColumnId };
    }

    return step.source;
  }

  if (index === 0) {
    return { type: 'input', inputColumnId: baseInputColumnId };
  }

  return { type: 'previousResult' };
}

export function getVisibleLeftOperand(step: TransformStep, stepSource: StepSource): StepOperand {
  if (step.leftOperand) {
    return step.leftOperand;
  }

  return stepSourceToOperand(stepSource);
}

export function getVisibleRightOperand(step: TransformStep): StepOperand {
  if (step.rightOperand) {
    return step.rightOperand;
  }

  const amount = Number(step.amount ?? 0);
  return {
    type: 'fixedText',
    value: String(step.amount ?? 0),
    ...(Number.isFinite(amount) ? { numericFallback: amount } : {}),
  };
}

function stepSourceToOperand(source: StepSource): StepOperand {
  if (source.type === 'previousResult') {
    return { type: 'previousResult' };
  }

  if (source.type === 'input') {
    return { type: 'input', inputColumnId: source.inputColumnId };
  }

  if (source.type === 'rangeText') {
    return {
      type: 'rangeText',
      inputColumnId: source.inputColumnId,
      selectedText: source.selectedText,
      numericFallback: Number(source.selectedText),
    };
  }

  return {
    type: 'fixedText',
    value: source.value,
    numericFallback: Number(source.value),
  };
}

export function shouldShowTextSourceFields(type: TransformStepType) {
  return [
    'noop',
    'trim',
    'uppercase',
    'lowercase',
    'addPrefix',
    'addSuffix',
    'removeText',
    'replaceText',
    'extractNumber',
    'toNumber',
    'toText',
    'formatDate',
  ].includes(type);
}

export function getTextStepSourceLabel(type: TransformStepType) {
  if (type === 'trim') {
    return 'Valor a limpiar';
  }

  if (type === 'uppercase' || type === 'lowercase') {
    return 'Valor a convertir';
  }

  if (type === 'addPrefix' || type === 'addSuffix' || type === 'removeText' || type === 'replaceText') {
    return 'Valor base';
  }

  if (type === 'extractNumber') {
    return 'Valor del que extraer número';
  }

  if (type === 'toNumber' || type === 'toText') {
    return 'Valor a convertir';
  }

  if (type === 'formatDate') {
    return 'Fecha a formatear';
  }

  return 'Desde donde toma el valor';
}

export function changeStepMode(step: TransformStep, mode: TransformStepMode): Partial<TransformStep> {
  if (mode === 'manualRange') {
    if (step.type === 'manualRange') {
      return { mode };
    }

    return {
      ...createManualRangeStep(step.condition),
      id: step.id,
      applyToEmptyValues: step.applyToEmptyValues ?? false,
    };
  }

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
  return mode === 'text' || mode === 'number' || mode === 'conversion' || mode === 'date' || mode === 'manualRange' ? mode : undefined;
}

export function inferStepModeFromType(type: TransformStepType): TransformStepMode {
  if (type === 'manualRange') {
    return 'manualRange';
  }

  if (type === 'numericOperation') {
    return 'number';
  }

  if (type === 'extractNumber' || type === 'toNumber' || type === 'toText') {
    return 'conversion';
  }

  if (type === 'formatDate') {
    return 'date';
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
