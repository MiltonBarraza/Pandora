import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConcatPart, InputColumn, InputRow, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { getConfiguredConcatStep, getRecipeStepTitle } from './OutputColumnRecipeEditor.displayHelpers';
import { conditionOperators } from './OutputColumnRecipeEditor.optionHelpers';
import { buildSimpleCustomValueRecipeWithSteps, createNoopStep, getFirstStepSource, getRecipeStudioMode, getSimpleInputPart, type CustomValueMode, type EditableCustomRecipe, type RecipeStudioMode } from './OutputColumnRecipeEditor.recipeHelpers';
import './OutputColumnRecipeEditor.recipeStudio.css';

type CombineRecipe = Extract<OutputRecipe, { type: 'combine' }>;
type RecipeChange<TRecipe> = TRecipe | ((current: TRecipe) => TRecipe);
type RecipeChangeHandler<TRecipe> = (recipe: RecipeChange<TRecipe>) => void;

type CustomValueEditorRenderProps = {
  recipe: CombineRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  mode: CustomValueMode;
  onChange: RecipeChangeHandler<CombineRecipe>;
};

type ManualRangeRecipeEditorRenderProps = {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
};

type ManualRangeTextGeneratorRenderProps = {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onClose: () => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
};

export type ComposePartEditorRenderProps = {
  part: ConcatPart;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  allowPreviousResultSource: boolean;
  onChange: (part: ConcatPart) => void;
};

export type ComposeStepHeaderRenderProps = {
  recipe: CombineRecipe;
  inputColumns: InputColumn[];
  onChange: RecipeChangeHandler<CombineRecipe>;
};

type RecipeStudioRenderers = {
  renderCustomValueEditor: (props: CustomValueEditorRenderProps) => ReactNode;
  renderComposePartEditor: (props: ComposePartEditorRenderProps) => ReactNode;
  renderComposeStepHeader: (props: ComposeStepHeaderRenderProps) => ReactNode;
  renderManualRangeRecipeEditor: (props: ManualRangeRecipeEditorRenderProps) => ReactNode;
  renderManualRangeTextGenerator: (props: ManualRangeTextGeneratorRenderProps) => ReactNode;
};

export function RecipeStudioShell({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  preview,
  customValueMode,
  onChange,
  renderCustomValueEditor,
  renderComposePartEditor,
  renderComposeStepHeader,
  renderManualRangeRecipeEditor,
  renderManualRangeTextGenerator,
} : {
  recipe: EditableCustomRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  preview: string;
  customValueMode: CustomValueMode;
  onChange: (recipe: EditableCustomRecipe | ((current: EditableCustomRecipe) => EditableCustomRecipe)) => void;
} & RecipeStudioRenderers) {
  const [selectedStudioItemId, setSelectedStudioItemId] = useState<string | null>(null);
  const isComposeRecipe = recipe.type === 'combine' && getRecipeStudioMode(recipe) === 'compose';
  const handleCombineChange: RecipeChangeHandler<CombineRecipe> = (nextRecipe) => {
    onChange((currentRecipe) => {
      if (currentRecipe.type !== 'combine') {
        return currentRecipe;
      }

      return typeof nextRecipe === 'function' ? nextRecipe(currentRecipe) : nextRecipe;
    });
  };

  return (
    <div className="constructorModalContent recipeStudio">
      <div className="recipeStudioWorkspace">
        <main className="recipeStudioMain">
          {isComposeRecipe ? (
            <ComposeValueStudio
              recipe={recipe}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              sampleInputValues={sampleInputValues}
              selectedTokenId={selectedStudioItemId}
              onSelectedTokenChange={setSelectedStudioItemId}
              renderComposePartEditor={renderComposePartEditor}
              renderComposeStepHeader={renderComposeStepHeader}
              onChange={handleCombineChange}
            />
          ) : recipe.type === 'manualRange' ? (
            renderManualRangeRecipeEditor({
              recipe,
              inputColumns,
              manualRangeRows,
              onChange: (nextRecipe) => onChange(nextRecipe),
            })
          ) : (
            renderCustomValueEditor({
              recipe,
              inputColumns,
              manualRangeRows,
              sampleInputValues,
              mode: customValueMode,
              onChange: handleCombineChange,
            })
          )}
        </main>
      </div>
    </div>
  );
}

type ComposeToken = {
  id: string;
  label: string;
  detail: string;
  kind: 'input' | 'text' | 'previous' | 'advanced' | 'warning';
  statusHint?: string;
  index: number;
};

function ComposeValueStudio({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  selectedTokenId,
  onSelectedTokenChange,
  renderComposePartEditor,
  renderComposeStepHeader,
  onChange,
}: {
  recipe: CombineRecipe;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  selectedTokenId: string | null;
  onSelectedTokenChange: (tokenId: string | null) => void;
  renderComposePartEditor: RecipeStudioRenderers['renderComposePartEditor'];
  renderComposeStepHeader: RecipeStudioRenderers['renderComposeStepHeader'];
  onChange: RecipeChangeHandler<CombineRecipe>;
}) {
  const previousTokenCountRef = useRef(getComposeTokens(recipe, inputColumns).length);
  const tokens = getComposeTokens(recipe, inputColumns);
  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? tokens[0] ?? null;
  const previewRows = getComposePreviewRows(recipe, manualRangeRows, sampleInputValues);

  useEffect(() => {
    if (tokens.length > previousTokenCountRef.current) {
      onSelectedTokenChange(tokens[tokens.length - 1]?.id ?? null);
    } else if (selectedTokenId && !tokens.some((token) => token.id === selectedTokenId)) {
      onSelectedTokenChange(tokens[0]?.id ?? null);
    } else if (!selectedTokenId && tokens.length > 0) {
      onSelectedTokenChange(tokens[0].id);
    }

    previousTokenCountRef.current = tokens.length;
  }, [onSelectedTokenChange, selectedTokenId, tokens]);

  const addToken = () => {
    const result = addComposeRecipePart(recipe, inputColumns);
    onChange(result.recipe);
    onSelectedTokenChange(result.selectedPartId);
  };

  const reorderTokens = (nextTokens: ComposeToken[]) => {
    onChange(reorderComposeRecipeParts(recipe, nextTokens.map((token) => token.id)));
  };
  const removeToken = (tokenId: string) => {
    const token = tokens.find((item) => item.id === tokenId);
    if (!token) {
      return;
    }

    const parts = getComposeRecipeParts(recipe);
    const nextParts = parts.filter((_, index) => index !== token.index);
    onChange(updateComposeRecipeParts(recipe, nextParts));
    onSelectedTokenChange(nextParts[token.index]?.id ?? nextParts[token.index - 1]?.id ?? null);
  };

  return (
    <div className="composeStudio composeStudioFlat">
      <section className="recipeStudioSection recipeStudioGeneralSection composeStudioHeader" aria-label="Configuración general">
        <div className="composeStudioHeaderTitle">
          <span>Configuración general</span>
          <strong>Paso 1 · Concatenar</strong>
        </div>
        <div className="composeStudioHeaderFields stepPrimaryFieldsRow">
          {renderComposeStepHeader({ recipe, inputColumns, onChange })}
        </div>
      </section>
      <section className="recipeStudioSection recipeStudioSectionLight composePartsBuilder" aria-label="Editor de partes">
        <div className="composePartsBuilderHeader">
          <div className="composePartsBuilderTitle">
            <strong>Editor de partes</strong>
            <p className="composeStudioHint">Arrastrá las partes para cambiar el orden.</p>
          </div>
          <div className="composeStudioActions">
            <div className="composeStudioAddActions">
              <ActionButton action="add" variant="secondary" className="composeStudioActionButton" onClick={addToken}>
                Agregar parte
              </ActionButton>
            </div>
            <ComposeValuePreview
              rows={previewRows}
              hasTokens={tokens.length > 0}
            />
          </div>
        </div>
        <CompositionTokenList
          tokens={tokens}
          selectedTokenId={selectedToken?.id ?? null}
          separator={recipe.separator}
          emptyMessage="Agregá una parte para empezar."
          onSelect={onSelectedTokenChange}
          onReorder={reorderTokens}
          onRemove={removeToken}
        />
      </section>
      <ComposeTokenInspector
        recipe={recipe}
        token={selectedToken}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        sampleInputValues={sampleInputValues}
        renderComposePartEditor={renderComposePartEditor}
        onChange={onChange}
      />
    </div>
  );
}

function CompositionTokenList({
  tokens,
  selectedTokenId,
  separator,
  emptyMessage,
  onSelect,
  onReorder,
  onRemove,
}: {
  tokens: ComposeToken[];
  selectedTokenId: string | null;
  separator?: string;
  emptyMessage: string;
  onSelect: (tokenId: string) => void;
  onReorder: (tokens: ComposeToken[]) => void;
  onRemove: (tokenId: string) => void;
}) {
  if (tokens.length === 0) {
    return <div className="compositionTokenEmpty">{emptyMessage}</div>;
  }

  return (
    <div className="compositionTokenList" aria-label="Partes de combinación">
      <SortableList
        items={tokens}
        axis="horizontal"
        handleLabel="Arrastrar parte"
        onChange={onReorder}
        renderItem={(token, dragHandle) => (
          <div className="compositionTokenSlot">
            {token.index > 0 ? <span className="compositionJoiner">{separator ? JSON.stringify(separator) : '+'}</span> : null}
            <div className={`compositionTokenCard compositionToken-${token.kind}${token.id === selectedTokenId ? ' selected' : ' unselected'}`}>
              {dragHandle}
              <CompositionToken
                token={token}
                selected={token.id === selectedTokenId}
                onClick={() => onSelect(token.id)}
              />
              <div className="compositionTokenActions">
                <InfoTooltip content="Eliminar parte">
                  <DeleteButton title="Eliminar parte" onClick={() => onRemove(token.id)} />
                </InfoTooltip>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

function CompositionToken({
  token,
  selected,
  onClick,
}: {
  token: ComposeToken;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`compositionToken compositionToken-${token.kind}${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      title={token.statusHint}
      onClick={onClick}
    >
      <span>{token.label}</span>
      <small>{token.detail}</small>
    </button>
  );
}

function ComposeTokenInspector({
  recipe,
  token,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  renderComposePartEditor,
  onChange,
}: {
  recipe: CombineRecipe;
  token: ComposeToken | null;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  renderComposePartEditor: RecipeStudioRenderers['renderComposePartEditor'];
  onChange: RecipeChangeHandler<CombineRecipe>;
}) {
  const parts = getComposeRecipeParts(recipe);
  const part = token ? parts[token.index] : undefined;
  const concatPart = token ? getComposeConcatPart(recipe, token.index) : undefined;

  if (!token || !part || !concatPart) {
    return (
      <section className="recipeStudioSection composeTokenInspector composeTokenInspectorFlat">
        <strong>Parte seleccionada</strong>
        <p>Agregá una parte para configurarla.</p>
      </section>
    );
  }

  const hasLegacyConcatParts = recipe.parts.length === 0 && Boolean(getConfiguredConcatStep(recipe)?.parts?.length);

  return (
    <section className="recipeStudioSection composeTokenInspector composeTokenInspectorFlat">
      <div className="composeTokenInspectorHeader">
        <span>Parte seleccionada</span>
        <strong>{token.label}</strong>
      </div>
      <div className="composeTokenFields">
        <div className="composePartTechnicalEditor composePartTechnicalEditorFlat">
          {renderComposePartEditor({
            part: concatPart,
            inputColumns,
            manualRangeRows,
            sampleInputValues,
            allowPreviousResultSource: hasLegacyConcatParts,
            onChange: (nextPart) => onChange(updateComposeConcatPart(recipe, token.index, nextPart)),
          })}
        </div>
        <details className="composeTokenRules">
          <summary className="composeTokenRulesHeader">
            <strong>Reglas y condiciones de esta parte</strong>
            <span>{getComposeTokenRulesSummary(part)}</span>
          </summary>
          <div className="composeTokenRulesContent">
            <ComposeTokenConditionTable part={part} inputColumns={inputColumns} />
          </div>
        </details>
      </div>
    </section>
  );
}

function ComposeValuePreview({
  rows,
  hasTokens,
}: {
  rows: Array<{ rowNumber: string; value: string }>;
  hasTokens: boolean;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const firstAvailableRow = getFirstNumericPreviewRow(rows);
  const [startRowInput, setStartRowInput] = useState(() => String(firstAvailableRow ?? 1));
  useEffect(() => {
    if (firstAvailableRow !== null && startRowInput.trim() !== '' && !isPreviewStartValid(startRowInput)) {
      setStartRowInput(String(firstAvailableRow));
    }
  }, [firstAvailableRow, startRowInput]);

  const requestedStartRowNumber = getPreviewStartRowNumber(startRowInput);
  const startRowNumber = requestedStartRowNumber ?? firstAvailableRow;
  const lastFileRowNumber = getLastNumericPreviewRow(rows);
  const previewRows = hasTokens ? getPreviewRowsFromStart(rows, startRowNumber).slice(0, 10) : [];
  const emptyMessage = hasTokens ? 'No se encontraron filas.' : 'Agregá una parte para ver la vista previa.';
  const previewCount = getComposePreviewCountText(previewRows.length, startRowNumber, lastFileRowNumber);

  return (
    <div className="composePreviewControl">
      <InfoTooltip content="Vista previa">
        <ActionButton action="preview" variant="icon" size="sm" className="composeStudioActionButton composePreviewButton" title="Vista previa" aria-label="Vista previa" onClick={() => setIsPreviewOpen(true)} />
      </InfoTooltip>
      <Modal open={isPreviewOpen} title="Vista previa del resultado" className="composePreviewModal" onClose={() => setIsPreviewOpen(false)}>
        {firstAvailableRow !== null ? (
          <label className="field compact composePreviewStartField">
            <span>Ver desde fila</span>
            <input
              type="number"
              min="1"
              step="1"
              value={startRowInput}
              onBlur={() => setStartRowInput(String(isPreviewStartValid(startRowInput) ? startRowInput : firstAvailableRow))}
              onChange={(event) => setStartRowInput(event.target.value)}
            />
          </label>
        ) : null}
        {previewCount ? <p className="composePreviewCount">{previewCount}</p> : null}
        <ComposePreviewTable rows={previewRows} emptyMessage={emptyMessage} />
      </Modal>
    </div>
  );
}

function getNumericPreviewRows(rows: Array<{ rowNumber: string; value: string }>) {
  return rows
    .map((row) => ({ ...row, numericRowNumber: Number(row.rowNumber) }))
    .filter((row) => Number.isFinite(row.numericRowNumber));
}

function getFirstNumericPreviewRow(rows: Array<{ rowNumber: string; value: string }>) {
  return getNumericPreviewRows(rows)[0]?.numericRowNumber ?? null;
}

function getLastNumericPreviewRow(rows: Array<{ rowNumber: string; value: string }>) {
  const numericRows = getNumericPreviewRows(rows);
  return numericRows[numericRows.length - 1]?.numericRowNumber ?? null;
}

function isPreviewStartValid(value: string) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue >= 1;
}

export function getPreviewStartRowNumber(value: string) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

export function getPreviewRowsFromStart(rows: Array<{ rowNumber: string; value: string }>, startRowNumber: number | null) {
  if (startRowNumber === null) {
    return rows;
  }

  return rows.filter((row) => Number(row.rowNumber) >= startRowNumber);
}

export function getComposePreviewCountText(rowCount: number, startRowNumber: number | null, lastFileRowNumber: number | null) {
  const rowLabel = rowCount === 1 ? 'fila' : 'filas';
  if (rowCount === 0 && startRowNumber !== null) {
    return null;
  }

  if (startRowNumber !== null && lastFileRowNumber !== null) {
    return `Mostrando ${rowCount} ${rowLabel} desde la fila ${startRowNumber} de ${lastFileRowNumber} filas del archivo.`;
  }

  return `Mostrando ${rowCount} ${rowLabel}`;
}

function ComposeTokenConditionTable({
  part,
  inputColumns,
}: {
  part: RecipePart;
  inputColumns: InputColumn[];
}) {
  const rows = getComposeTokenConditionRows(part, inputColumns);

  return (
    <table className="composeTokenConditionTable">
      <thead>
        <tr>
          <th>Paso y accion</th>
          <th>Condicion</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.step}>
            <td>{row.description}</td>
            <td>{row.condition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComposePreviewTable({
  rows,
  emptyMessage,
}: {
  rows: Array<{ rowNumber: string; value: string }>;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="composePreviewEmpty">{emptyMessage}</p>;
  }

  return (
    <table className="composePreviewTable">
      <colgroup>
        <col className="composePreviewColumnRow" />
        <col className="composePreviewColumnResult" />
      </colgroup>
      <thead>
        <tr>
          <th>Fila</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.rowNumber}-${row.value}`}>
            <td>{row.rowNumber}</td>
            <td>{row.value || 'Sin valor'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function createRecipeForStudioMode(
  mode: Exclude<RecipeStudioMode, 'advanced'>,
  recipe: EditableCustomRecipe,
  inputColumns: InputColumn[],
): EditableCustomRecipe {
  if (mode === 'takeValue') {
    return createTakeValueStudioRecipe(recipe, inputColumns);
  }

  if (mode === 'fixedText') {
    return createFixedTextStudioRecipe(recipe);
  }

  if (mode === 'compose') {
    return createComposeStudioRecipe(recipe);
  }

  return recipe.type === 'manualRange' ? recipe : { type: 'manualRange', ranges: [] };
}

function createTakeValueStudioRecipe(
  recipe: EditableCustomRecipe,
  inputColumns: InputColumn[],
  requestedInputColumnId?: string,
): Extract<OutputRecipe, { type: 'combine' }> {
  const currentRecipe = recipe.type === 'combine' ? recipe : { type: 'combine' as const, parts: [], separator: '' };
  const inputColumnId = requestedInputColumnId
    || getSimpleStudioInputColumnId(currentRecipe)
    || inputColumns[0]?.id
    || '';
  return buildSimpleCustomValueRecipeWithSteps(
    'text',
    inputColumnId,
    [createNoopStep('text')],
    currentRecipe,
  );
}

function createFixedTextStudioRecipe(
  recipe: EditableCustomRecipe,
  value = recipe.type === 'combine' ? getSimpleStudioFixedText(recipe) : '',
): Extract<OutputRecipe, { type: 'combine' }> {
  const currentRecipe = recipe.type === 'combine' ? recipe : { type: 'combine' as const, parts: [], separator: '' };
  const firstStep = getReusableSimpleStudioSteps(currentRecipe)[0] ?? createNoopStep('text');
  return {
    type: 'combine',
    customMode: 'text',
    parts: [{
      id: currentRecipe.parts[0]?.id ?? crypto.randomUUID(),
      type: 'text',
      value,
    }],
    separator: '',
    steps: [{
      ...firstStep,
      mode: 'text',
      type: 'noop',
      source: { type: 'fixedText', value },
    }],
  };
}

function createComposeStudioRecipe(recipe: EditableCustomRecipe): Extract<OutputRecipe, { type: 'combine' }> {
  if (recipe.type === 'manualRange') {
    return { type: 'combine', customMode: 'concat', parts: [], separator: '', steps: [] };
  }

  if (
    recipe.customMode === 'concat'
    || getConfiguredConcatStep(recipe)
    || (!recipe.customMode && recipe.parts.length > 1)
  ) {
    return { ...recipe, customMode: 'concat', separator: recipe.separator ?? '' };
  }

  const hasOnlySimpleSetupStep = (recipe.steps ?? []).length <= 1;
  const firstSource = getFirstStepSource(recipe);
  const simpleInputColumnId = getSimpleInputPart(recipe).inputColumnId;
  if (hasOnlySimpleSetupStep && (firstSource?.type === 'input' || simpleInputColumnId)) {
    return {
      type: 'combine',
      customMode: 'concat',
      parts: [createComposeInputPart(firstSource?.type === 'input' ? firstSource.inputColumnId : simpleInputColumnId)],
      separator: recipe.separator ?? '',
    };
  }

  const simpleFixedText = getSimpleStudioFixedText(recipe);
  if (hasOnlySimpleSetupStep && (firstSource?.type === 'fixedText' || simpleFixedText)) {
    return {
      type: 'combine',
      customMode: 'concat',
      parts: [createComposeTextPart(firstSource?.type === 'fixedText' ? firstSource.value : simpleFixedText)],
      separator: recipe.separator ?? '',
    };
  }

  return { type: 'combine', customMode: 'concat', parts: [], separator: '', steps: [] };
}

function getComposeTokens(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]): ComposeToken[] {
  const parts = getComposeRecipeParts(recipe);
  return parts.map((part, index) => {
    const steps = part.steps ?? [];
    const configuredSteps = steps.filter((step) => step.type !== 'noop' || Boolean(step.condition));
    const isComplex = configuredSteps.length > 0;
    const concatPart = getComposeConcatPart(recipe, index);

    if (isComplex) {
      const sourceSummary = getComposeTokenSourceSummary(part, concatPart, inputColumns);
      const configuredStepCount = configuredSteps.length + 1;
      return {
        id: part.id,
        kind: sourceSummary.kind === 'warning' ? 'advanced' : sourceSummary.kind,
        label: sourceSummary.label,
        detail: `${configuredStepCount} pasos configurados`,
        statusHint: `Fuente: ${sourceSummary.detail}. Esta parte usa pasos avanzados`,
        index,
      };
    }

    if (concatPart?.source.type === 'rangeText') {
      const selectedText = concatPart.source.selectedText.trim();
      return selectedText ? {
        id: part.id,
        kind: 'text',
        label: 'Texto elegido',
        detail: selectedText,
        index,
      } : createUnconfiguredComposeToken(part.id, index, 'Falta elegir texto desde columna');
    }

    if (concatPart?.source.type === 'previousResult') {
      return createUnconfiguredComposeToken(part.id, index, 'Revisar configuración: esta parte usa un resultado anterior');
    }

    if (part.type === 'input') {
      const inputColumn = inputColumns.find((column) => column.id === part.inputColumnId);
      return inputColumn ? {
        id: part.id,
        kind: 'input',
        label: 'Dato de Excel',
        detail: `Columna ${inputColumn.columnLetter}`,
        index,
      } : createUnconfiguredComposeToken(part.id, index, 'Falta seleccionar origen');
    }

    const fixedText = part.value.trim();
    if (!fixedText) {
      return createUnconfiguredComposeToken(part.id, index, 'Falta ingresar texto fijo');
    }

    return {
      id: part.id,
      kind: 'text',
      label: 'Texto fijo',
      detail: `"${part.value}"`,
      index,
    };
  });
}

function createUnconfiguredComposeToken(id: string, index: number, statusHint: string): ComposeToken {
  return {
    id,
    kind: 'warning',
    label: `Parte ${index + 1}`,
    detail: 'Sin configurar',
    statusHint,
    index,
  };
}

function getComposeTokenSourceSummary(
  part: RecipePart,
  concatPart: ConcatPart | undefined,
  inputColumns: InputColumn[],
): Pick<ComposeToken, 'label' | 'detail' | 'kind'> {
  const source = concatPart?.source;

  if (source?.type === 'input' || part.type === 'input') {
    const inputColumnId = source?.type === 'input' ? source.inputColumnId : part.type === 'input' ? part.inputColumnId : '';
    const inputColumn = inputColumns.find((column) => column.id === inputColumnId);
    return inputColumn
      ? { kind: 'input', label: 'Dato de Excel', detail: `Columna ${inputColumn.columnLetter}` }
      : { kind: 'warning', label: 'Dato de Excel', detail: 'Sin columna' };
  }

  if (source?.type === 'previousResult') {
    return { kind: 'previous', label: 'Dato calculado', detail: 'Resultado del paso anterior' };
  }

  if (source?.type === 'rangeText') {
    return source.selectedText
      ? { kind: 'text', label: 'Texto encontrado', detail: `"${source.selectedText}"` }
      : { kind: 'warning', label: 'Sin texto encontrado', detail: 'Valor vacío' };
  }

  const fixedText = source?.type === 'fixedText' ? source.value : part.type === 'text' ? part.value : '';
  return { kind: 'text', label: 'Texto fijo', detail: fixedText ? `"${fixedText}"` : 'Sin texto' };
}

function getComposeRecipeParts(recipe: Extract<OutputRecipe, { type: 'combine' }>): RecipePart[] {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length > 0 || !concatStep?.parts?.length) {
    return recipe.parts;
  }

  return concatStep.parts.map((part) => concatPartToRecipePart(part));
}

function getComposeConcatPart(recipe: Extract<OutputRecipe, { type: 'combine' }>, index: number): ConcatPart | undefined {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length === 0 && concatStep?.parts?.length) {
    return concatStep.parts[index];
  }

  const part = recipe.parts[index];
  return part ? recipePartToConcatPart(part) : undefined;
}

function updateComposeConcatPart(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  index: number,
  nextPart: ConcatPart,
): Extract<OutputRecipe, { type: 'combine' }> {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length === 0 && concatStep?.parts?.length) {
    return {
      ...recipe,
      steps: (recipe.steps ?? []).map((step) => step.id === concatStep.id
        ? { ...step, parts: concatStep.parts?.map((part, partIndex) => (partIndex === index ? nextPart : part)) }
        : step),
    };
  }

  const currentPart = recipe.parts[index];
  if (!currentPart) {
    return recipe;
  }

  const nextRecipePart = concatPartToRecipePart(nextPart);
  return updateComposeRecipeParts(recipe, recipe.parts.map((part, partIndex) => partIndex === index
    ? { ...nextRecipePart, ...(currentPart.separatorAfter !== undefined ? { separatorAfter: currentPart.separatorAfter } : {}) }
    : part));
}

function updateComposeRecipeParts(recipe: Extract<OutputRecipe, { type: 'combine' }>, parts: RecipePart[]): Extract<OutputRecipe, { type: 'combine' }> {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length === 0 && concatStep) {
    return {
      ...recipe,
      customMode: 'concat',
      steps: (recipe.steps ?? []).map((step) => step.id === concatStep.id
        ? { ...step, parts: parts.map(recipePartToConcatPart) }
        : step),
    };
  }

  return {
    ...recipe,
    customMode: 'concat',
    parts,
    separator: recipe.separator ?? '',
  };
}

export function addComposeRecipePart(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  _inputColumns: InputColumn[],
): { recipe: Extract<OutputRecipe, { type: 'combine' }>; selectedPartId: string } {
  const part = createComposeInputPart('');
  return {
    recipe: updateComposeRecipeParts(recipe, [...getComposeRecipeParts(recipe), part]),
    selectedPartId: part.id,
  };
}

export function reorderComposeRecipeParts(recipe: Extract<OutputRecipe, { type: 'combine' }>, orderedPartIds: string[]): Extract<OutputRecipe, { type: 'combine' }> {
  const parts = getComposeRecipeParts(recipe);
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const movedParts = orderedPartIds.map((id) => partsById.get(id)).filter((part): part is RecipePart => Boolean(part));
  const remainingParts = parts.filter((part) => !orderedPartIds.includes(part.id));
  return updateComposeRecipeParts(recipe, [...movedParts, ...remainingParts]);
}

function concatPartToRecipePart(part: ConcatPart): RecipePart {
  if (part.source.type === 'input') {
    return {
      id: part.id,
      type: 'input',
      inputColumnId: part.source.inputColumnId,
      ...(part.steps ? { steps: part.steps } : {}),
    };
  }

  if (part.source.type === 'fixedText') {
    return {
      id: part.id,
      type: 'text',
      value: part.source.value,
      ...(part.steps ? { steps: part.steps } : {}),
    };
  }

  return {
    id: part.id,
    type: 'text',
    value: part.source.type === 'rangeText' ? part.source.selectedText : '',
    steps: part.steps ?? [createNoopStep('text')],
  };
}

function recipePartToConcatPart(part: RecipePart): ConcatPart {
  return {
    id: part.id,
    source: part.type === 'input'
      ? { type: 'input', inputColumnId: part.inputColumnId }
      : { type: 'fixedText', value: part.value },
    ...(part.steps ? { steps: part.steps } : {}),
  };
}

function createComposeInputPart(inputColumnId: string, id: string = crypto.randomUUID()): RecipePart {
  return { id, type: 'input', inputColumnId };
}

function createComposeTextPart(value: string, id: string = crypto.randomUUID()): RecipePart {
  return { id, type: 'text', value };
}

function getComposePreviewRows(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  manualRangeRows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  const previewColumn: OutputColumn = {
    id: 'compose-preview',
    label: 'Preview',
    order: 0,
    enabled: true,
    recipe,
  };
  const rows = manualRangeRows;
  if (rows.length > 0) {
    return buildProcessedRows(rows, [previewColumn]).map((row) => ({
      rowNumber: String(row.rowNumber),
      value: row.outputValues[previewColumn.id] ?? '',
    }));
  }

  if (!sampleInputValues) {
    return [];
  }

  const [row] = buildProcessedRows([{ rowNumber: 1, values: sampleInputValues }], [previewColumn]);
  return [{ rowNumber: 'ejemplo', value: row?.outputValues[previewColumn.id] ?? '' }];
}

export function getComposeColumnTextOptions(
  manualRangeRows: InputRow[],
  inputColumnId: string,
  sampleInputValues?: Record<string, string>,
) {
  const seen = new Set<string>();
  const values = manualRangeRows.length > 0
    ? manualRangeRows.map((row) => row.values[inputColumnId])
    : sampleInputValues
      ? [sampleInputValues[inputColumnId]]
      : [];

  return values.reduce<string[]>((options, value) => {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) {
      return options;
    }

    seen.add(text);
    return [...options, text];
  }, []);
}

export function getComposeValidColumnTextSelection(value: string, options: string[]) {
  const text = value.trim();
  return options.includes(text) ? text : '';
}

export function updateComposeColumnTextSelection(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  partId: string,
  selectedText: string,
): Extract<OutputRecipe, { type: 'combine' }> {
  return updateComposeRecipeParts(recipe, getComposeRecipeParts(recipe).map((part) => (
    part.id === partId
      ? {
        id: part.id,
        type: 'text',
        value: selectedText,
        ...(part.steps ? { steps: part.steps } : {}),
        ...(part.separatorAfter ? { separatorAfter: part.separatorAfter } : {}),
      }
      : part
  )));
}

function getComposeTokenConditionSummary(part: RecipePart, inputColumns: InputColumn[]) {
  const condition = (part.steps ?? []).find((step) => step.condition)?.condition;
  if (!condition) {
    return 'Aplicar siempre';
  }

  return getComposeStepConditionSummary(condition, inputColumns);
}

function getComposeTokenConditionRows(part: RecipePart, inputColumns: InputColumn[]) {
  const steps = part.steps ?? [];
  const partSource: StepSource = part.type === 'input'
    ? { type: 'input', inputColumnId: part.inputColumnId }
    : { type: 'fixedText', value: part.value };
  if (steps.length === 0) {
    return [{ step: 'Paso base', description: `Paso base · ${getRecipeStepTitle({ id: 'base', type: 'noop' }, inputColumns, partSource)}`, condition: 'Aplicar siempre' }];
  }

  return steps.map((step, index) => ({
    step: `Paso ${index + 1}`,
    description: `${`Paso ${index + 1}`} · ${getComposeStepDescription(
      step,
      inputColumns,
      step.source ?? (index === 0 ? partSource : { type: 'previousResult' }),
    )}`,
    condition: step.condition ? getComposeStepConditionSummary(step.condition, inputColumns) : 'Aplicar siempre',
  }));
}

function getComposeTokenRulesSummary(part: RecipePart) {
  const steps = part.steps ?? [];
  if (steps.length === 0) {
    return 'Todos los pasos aplican siempre';
  }

  const conditionCount = steps.filter((step) => Boolean(step.condition)).length;
  if (conditionCount === 0) {
    return 'Todos los pasos aplican siempre';
  }

  return `${steps.length} ${steps.length === 1 ? 'paso' : 'pasos'} · ${conditionCount} con condicion`;
}

function getComposeStepDescription(step: TransformStep, inputColumns: InputColumn[], source: StepSource) {
  return getRecipeStepTitle(step, inputColumns, source);
}

function getComposeStepConditionSummary(condition: NonNullable<NonNullable<RecipePart['steps']>[number]['condition']>, inputColumns: InputColumn[]) {
  const column = inputColumns.find((inputColumn) => inputColumn.id === condition.columnId);
  const operatorLabel = conditionOperators.find((operator) => operator.value === condition.operator)?.label ?? condition.operator;
  const valueLabel = condition.value ? ` "${condition.value}"` : '';
  return `${column ? getInputColumnLabel(column) : 'Columna'} ${operatorLabel}${valueLabel}`;
}

function getReusableSimpleStudioSteps(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const steps = recipe.steps ?? [];
  return steps.length > 0 ? steps : [createNoopStep('text')];
}

function getSimpleStudioInputColumnId(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const simplePart = getSimpleInputPart(recipe);
  if (simplePart.inputColumnId) {
    return simplePart.inputColumnId;
  }

  const firstSource = getFirstStepSource(recipe);
  return firstSource?.type === 'input' ? firstSource.inputColumnId : '';
}

function getSimpleStudioFixedText(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const firstSource = getFirstStepSource(recipe);
  if (firstSource?.type === 'fixedText') {
    return firstSource.value;
  }

  const textPart = recipe.parts.find((part) => part.type === 'text');
  return textPart?.value ?? '';
}
