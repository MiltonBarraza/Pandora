import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { addManualRangeValue, describeManualRangeCondition, duplicateManualRangeValue, getManualRangeCountLabel, getManualRangeFixedTextValue, getManualRangeInputSource, getManualRangeRangeTextSource, getManualRangeReferenceText, getManualRangeRowCountFromInputs, getManualRangeTextOptions, getManualRangeValueSourceType, hasOverlappingManualRanges, manualRangeValueSourceOptions, parseManualRangeRowInput, removeManualRangeValue, sortManualRangesByStart, updateManualRangeCondition, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueSourceType, type ManualRangeValueSourceType } from '../../domain/import/manualRangeModel';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, OutputColumn, OutputRecipe, RecipePart, StepSource, TransformStep } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';
import { getConfiguredConcatStep, getRecipeStepTitle } from './OutputColumnRecipeEditor.displayHelpers';
import { conditionOperators } from './OutputColumnRecipeEditor.optionHelpers';
import { buildSimpleCustomValueRecipeWithSteps, clearManualRangeValues, createNoopStep, getFirstStepSource, getRecipeStudioMode, getSimpleInputPart, type CustomValueMode, type EditableCustomRecipe, type RecipeStudioMode } from './OutputColumnRecipeEditor.recipeHelpers';
import './OutputColumnRecipeEditor.recipeStudio.css';

type CustomValueEditorRenderProps = {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  mode: CustomValueMode;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
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
  allowPreviousResultSource: boolean;
  onChange: (part: ConcatPart) => void;
};

export type ComposeStepHeaderRenderProps = {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
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
  onChange: (recipe: EditableCustomRecipe) => void;
} & RecipeStudioRenderers) {
  const [selectedStudioItemId, setSelectedStudioItemId] = useState<string | null>(null);
  const isComposeRecipe = recipe.type === 'combine' && getRecipeStudioMode(recipe) === 'compose';

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
              onChange={onChange}
            />
          ) : recipe.type === 'manualRange' ? (
            <RangeStudioPlaceholder />
          ) : (
            renderCustomValueEditor({
              recipe,
              inputColumns,
              manualRangeRows,
              sampleInputValues,
              mode: customValueMode,
              onChange,
            })
          )}
        </main>
      </div>
    </div>
  );
}

function TakeValueStudio({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  customValueMode,
  renderers,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  customValueMode: CustomValueMode;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const selectedInputColumnId = getSimpleStudioInputColumnId(recipe);
  const selectedInputColumn = inputColumns.find((column) => column.id === selectedInputColumnId);
  const previewRows = getTakeValuePreviewRows(selectedInputColumnId, manualRangeRows, sampleInputValues);

  const updateInputColumn = (inputColumnId: string) => {
    onChange(createTakeValueStudioRecipe(recipe, inputColumns, inputColumnId));
  };

  return (
    <div className="simpleStudioMode">
      <div className="simpleStudioIntro">
        <h4>Tomar un dato del Excel</h4>
        <p>Elegí la columna origen. Las transformaciones quedan como detalle avanzado.</p>
      </div>
      <div className="simpleStudioPrimary">
        <Dropdown
          className="compact"
          label="Usar datos de"
          labelInfo={<InfoTooltip content="Columna activa del Excel usada como fuente del valor." />}
          value={selectedInputColumnId}
          options={inputColumns.length === 0
            ? [{ value: '', label: noActiveColumnsLabel }]
            : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
          scrollStrategy="close"
          onChange={updateInputColumn}
        />
      </div>
      <SimpleValuePreview
        title="Vista previa"
        rows={previewRows}
        emptyMessage={selectedInputColumn ? 'No hay filas para previsualizar.' : 'Seleccioná una columna.'}
      />
      <SimpleStudioAdvanced
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        sampleInputValues={sampleInputValues}
        customValueMode={customValueMode}
        renderers={renderers}
        onChange={onChange}
      />
    </div>
  );
}

function FixedTextStudio({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  customValueMode,
  renderers,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  customValueMode: CustomValueMode;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const fixedText = getSimpleStudioFixedText(recipe);
  const previewRows = getFixedTextPreviewRows(fixedText, manualRangeRows, sampleInputValues);

  const updateText = (value: string) => {
    onChange(createFixedTextStudioRecipe(recipe, value));
  };

  return (
    <div className="simpleStudioMode">
      <div className="simpleStudioIntro">
        <h4>Usar el mismo texto en todas las filas</h4>
        <p>Definí un valor constante. Si el texto está vacío, la columna queda sin valor visible.</p>
      </div>
      <label className="field simpleStudioPrimary">
        <span className="labelWithInfo">
          <span>Texto</span>
          <InfoTooltip content="Este valor se repite en cada fila incluida." />
        </span>
        <input value={fixedText} onChange={(event) => updateText(event.target.value)} />
      </label>
      <SimpleValuePreview
        title="Vista previa"
        rows={previewRows}
        emptyMessage={fixedText.trim() ? 'No hay filas para previsualizar.' : 'Escribí un texto.'}
      />
      <SimpleStudioAdvanced
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        sampleInputValues={sampleInputValues}
        customValueMode={customValueMode}
        renderers={renderers}
        onChange={onChange}
      />
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
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  selectedTokenId: string | null;
  onSelectedTokenChange: (tokenId: string | null) => void;
  renderComposePartEditor: RecipeStudioRenderers['renderComposePartEditor'];
  renderComposeStepHeader: RecipeStudioRenderers['renderComposeStepHeader'];
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
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
  const duplicateToken = (tokenId: string) => {
    const token = tokens.find((item) => item.id === tokenId);
    const parts = getComposeRecipeParts(recipe);
    const part = token ? parts[token.index] : undefined;
    if (!token || !part) {
      return;
    }

    const nextPart = cloneComposePart(part);
    const nextParts = [...parts.slice(0, token.index + 1), nextPart, ...parts.slice(token.index + 1)];
    onChange(updateComposeRecipeParts(recipe, nextParts));
    onSelectedTokenChange(nextPart.id);
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
              totalAvailable={manualRangeRows.length > 0 ? manualRangeRows.length : undefined}
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
          onDuplicate={duplicateToken}
          onRemove={removeToken}
        />
      </section>
      <ComposeTokenInspector
        recipe={recipe}
        token={selectedToken}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
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
  onDuplicate,
  onRemove,
}: {
  tokens: ComposeToken[];
  selectedTokenId: string | null;
  separator?: string;
  emptyMessage: string;
  onSelect: (tokenId: string) => void;
  onReorder: (tokens: ComposeToken[]) => void;
  onDuplicate: (tokenId: string) => void;
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
        handleContent={<span aria-hidden="true">::</span>}
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
                <InfoTooltip content="Duplicar parte">
                  <ActionButton action="duplicate" variant="icon" size="sm" aria-label="Duplicar parte" onClick={() => onDuplicate(token.id)} />
                </InfoTooltip>
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
  renderComposePartEditor,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  token: ComposeToken | null;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  renderComposePartEditor: RecipeStudioRenderers['renderComposePartEditor'];
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
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
  totalAvailable,
}: {
  rows: Array<{ rowNumber: string; value: string }>;
  hasTokens: boolean;
  totalAvailable?: number;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewRows = hasTokens ? rows.slice(0, 10) : [];
  const emptyMessage = hasTokens ? 'No hay datos para previsualizar.' : 'Agregá una parte para ver la vista previa.';
  const previewCount = totalAvailable === undefined
    ? `Mostrando ${previewRows.length} filas`
    : `Mostrando ${previewRows.length} filas de ${totalAvailable} disponibles`;

  return (
    <div className="composePreviewControl">
      <InfoTooltip content="Vista previa">
        <ActionButton action="preview" variant="icon" size="sm" className="composeStudioActionButton composePreviewButton" title="Vista previa" aria-label="Vista previa" onClick={() => setIsPreviewOpen(true)} />
      </InfoTooltip>
      <Modal open={isPreviewOpen} title="Vista previa del resultado" className="composePreviewModal" onClose={() => setIsPreviewOpen(false)}>
        <p className="composePreviewCount">{previewCount}</p>
        <ComposePreviewTable rows={previewRows} emptyMessage={emptyMessage} />
      </Modal>
    </div>
  );
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
        <col className="composePreviewColumnRow" style={{ width: '15%' }} />
        <col className="composePreviewColumnResult" style={{ width: '85%' }} />
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

function SimpleValuePreview({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ rowNumber: string; value: string }>;
  emptyMessage: string;
}) {
  return (
    <div className="simpleStudioPreviewBlock">
      <strong>{title}</strong>
      {rows.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ol>
          {rows.map((row) => (
            <li key={`${row.rowNumber}-${row.value}`}>
              <span>Fila {row.rowNumber}</span>
              <strong>{row.value || 'Sin valor'}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SimpleStudioAdvanced({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  customValueMode,
  renderers,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  customValueMode: CustomValueMode;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  return (
    <details className="simpleStudioAdvanced">
      <summary>
        <span>Opciones avanzadas</span>
        <small>{getSimpleStudioAdvancedSummary(recipe, inputColumns)}</small>
      </summary>
      {renderers.renderCustomValueEditor({
        recipe,
        inputColumns,
        manualRangeRows,
        sampleInputValues,
        mode: customValueMode,
        onChange,
      })}
    </details>
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

  if (recipe.customMode === 'concat' || recipe.parts.length > 0 || getConfiguredConcatStep(recipe)) {
    return { ...recipe, customMode: 'concat', separator: recipe.separator ?? '' };
  }

  const firstSource = getFirstStepSource(recipe);
  if (firstSource?.type === 'input') {
    return {
      ...recipe,
      customMode: 'concat',
      parts: [createComposeInputPart(firstSource.inputColumnId)],
      separator: recipe.separator ?? '',
    };
  }

  if (firstSource?.type === 'fixedText') {
    return {
      ...recipe,
      customMode: 'concat',
      parts: [createComposeTextPart(firstSource.value)],
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
      return {
        id: part.id,
        kind: 'advanced',
        label: 'Parte avanzada',
        detail: `${configuredSteps.length} ${configuredSteps.length === 1 ? 'paso configurado' : 'pasos configurados'}`,
        statusHint: 'Esta parte usa pasos avanzados',
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
        label: `Columna ${inputColumn.columnLetter}`,
        detail: 'Dato del Excel',
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

function cloneComposePart(part: RecipePart): RecipePart {
  return part.type === 'input'
    ? { ...part, id: crypto.randomUUID(), steps: part.steps ? part.steps.map((step) => ({ ...step, id: crypto.randomUUID() })) : undefined }
    : { ...part, id: crypto.randomUUID(), steps: part.steps ? part.steps.map((step) => ({ ...step, id: crypto.randomUUID() })) : undefined };
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
  const rows = manualRangeRows.slice(0, 10);
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

function getTakeValuePreviewRows(
  inputColumnId: string,
  manualRangeRows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  if (!inputColumnId) {
    return [];
  }

  const rows = manualRangeRows
    .slice(0, 3)
    .map((row) => ({ rowNumber: String(row.rowNumber), value: row.values[inputColumnId] ?? '' }));

  if (rows.length > 0) {
    return rows;
  }

  if (!sampleInputValues) {
    return [];
  }

  return [{ rowNumber: 'ejemplo', value: sampleInputValues[inputColumnId] ?? '' }];
}

function getFixedTextPreviewRows(
  value: string,
  manualRangeRows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  if (!value.trim()) {
    return [];
  }

  const rows = manualRangeRows.slice(0, 3).map((row) => ({ rowNumber: String(row.rowNumber), value }));
  if (rows.length > 0) {
    return rows;
  }

  return sampleInputValues ? [{ rowNumber: 'ejemplo', value }] : [];
}

function getSimpleStudioAdvancedSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  return `${getSimpleStudioTransformSummary(recipe)} · ${getSimpleStudioConditionSummary(recipe, inputColumns)}`;
}

function getSimpleStudioTransformSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const count = getConfiguredTransformStepCount(recipe);
  if (count === 0) {
    return 'Sin transformaciones';
  }

  return `${count} ${count === 1 ? 'transformacion' : 'transformaciones'}`;
}

function getConfiguredTransformStepCount(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  return (recipe.steps ?? []).filter((step) => step.type !== 'noop' || step.condition).length;
}

function getSimpleStudioConditionSummary(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  const condition = (recipe.steps ?? []).find((step) => step.condition)?.condition;
  if (!condition) {
    return 'Aplicar siempre';
  }

  const column = inputColumns.find((inputColumn) => inputColumn.id === condition.columnId);
  const operatorLabel = conditionOperators.find((operator) => operator.value === condition.operator)?.label ?? condition.operator;
  const valueLabel = condition.value ? ` "${condition.value}"` : '';
  const targetLabel = condition.target === 'output'
    ? 'Salida'
    : column
      ? getInputColumnLabel(column)
      : 'Columna';
  return `${targetLabel} ${operatorLabel}${valueLabel}`;
}

function RangeValueStudio({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  selectedRangeId,
  onSelectedRangeChange,
  renderers,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  selectedRangeId: string | null;
  onSelectedRangeChange: (rangeId: string | null) => void;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const [showGenerator, setShowGenerator] = useState(false);
  const previousRangeCountRef = useRef(recipe.ranges.length);
  const selectedRange = recipe.ranges.find((range) => range.id === selectedRangeId) ?? recipe.ranges[0] ?? null;
  const hasOverlaps = hasOverlappingManualRanges(recipe.ranges);
  const previewRows = getRangeStudioPreviewRows(recipe, manualRangeRows, sampleInputValues);

  useEffect(() => {
    if (recipe.ranges.length > previousRangeCountRef.current) {
      onSelectedRangeChange(recipe.ranges[recipe.ranges.length - 1]?.id ?? null);
    } else if (selectedRangeId && !recipe.ranges.some((range) => range.id === selectedRangeId)) {
      onSelectedRangeChange(recipe.ranges[0]?.id ?? null);
    } else if (!selectedRangeId && recipe.ranges.length > 0) {
      onSelectedRangeChange(recipe.ranges[0].id);
    }

    previousRangeCountRef.current = recipe.ranges.length;
  }, [onSelectedRangeChange, recipe.ranges, selectedRangeId]);

  const addRange = () => {
    const nextRecipe = addManualRangeValue(recipe, 'end');
    onChange(nextRecipe);
    onSelectedRangeChange(nextRecipe.ranges[nextRecipe.ranges.length - 1]?.id ?? null);
  };
  const duplicateRange = (rangeId: string) => {
    const sourceIndex = recipe.ranges.findIndex((range) => range.id === rangeId);
    const nextRecipe = duplicateManualRangeValue(recipe, rangeId);
    onChange(nextRecipe);
    onSelectedRangeChange(nextRecipe.ranges[sourceIndex + 1]?.id ?? null);
  };
  const removeRange = (rangeId: string) => {
    const sourceIndex = recipe.ranges.findIndex((range) => range.id === rangeId);
    const nextRecipe = removeManualRangeValue(recipe, rangeId);
    onChange(nextRecipe);
    onSelectedRangeChange(nextRecipe.ranges[sourceIndex]?.id ?? nextRecipe.ranges[sourceIndex - 1]?.id ?? null);
  };

  return (
    <div className="rangeStudio">
      <div className="simpleStudioIntro">
        <h4>Asignar valores por rangos</h4>
        <p>Definí qué valor usar para cada bloque de filas reales del Excel.</p>
      </div>
      <div className="rangeStudioToolbar">
        <ActionButton action="add" variant="secondary" onClick={addRange}>Agregar rango</ActionButton>
        <ActionButton action="configure" variant="secondary" onClick={() => onChange(sortManualRangesByStart(recipe))}>Ordenar por inicio</ActionButton>
        <ActionButton action="configure" variant="secondary" onClick={() => setShowGenerator((show) => !show)}>Generar sugeridos</ActionButton>
        <ActionButton action="clear" variant="secondary" disabled={recipe.ranges.length === 0} onClick={() => onChange(clearManualRangeValues(recipe))}>Limpiar</ActionButton>
      </div>
      {showGenerator ? (
        <details className="rangeSuggestionPanel" open>
          <summary>Generar sugeridos</summary>
          {renderers.renderManualRangeTextGenerator({
            recipe,
            inputColumns,
            manualRangeRows,
            onClose: () => setShowGenerator(false),
            onChange,
          })}
        </details>
      ) : null}
      {hasOverlaps ? <p className="rangeStudioWarning">Hay rangos superpuestos. Se usará el primero que coincida.</p> : null}
      <div className="rangeStudioWorkspace">
        <RangeRulesList
          recipe={recipe}
          inputColumns={inputColumns}
          selectedRangeId={selectedRange?.id ?? null}
          onSelect={onSelectedRangeChange}
          onDuplicate={duplicateRange}
          onRemove={removeRange}
        />
      </div>
      <RangeValuePreview rows={previewRows} hasRanges={recipe.ranges.length > 0} />
      <details className="simpleStudioAdvanced">
        <summary>
          <span>Opciones avanzadas</span>
          <small>{getManualRangeCountLabel(recipe)} · {describeManualRangeCondition(recipe, inputColumns)}</small>
        </summary>
        {renderers.renderManualRangeRecipeEditor({ recipe, inputColumns, manualRangeRows, onChange })}
      </details>
    </div>
  );
}

function RangeStudioPlaceholder() {
  return (
    <div className="rangeRulesEmpty" role="status">
      Esta receta mantiene su configuración actual. La edición de rangos no está disponible en este paso.
    </div>
  );
}

function RangeRulesList({
  recipe,
  inputColumns,
  selectedRangeId,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  selectedRangeId: string | null;
  onSelect: (rangeId: string) => void;
  onDuplicate: (rangeId: string) => void;
  onRemove: (rangeId: string) => void;
}) {
  if (recipe.ranges.length === 0) {
    return <div className="rangeRulesEmpty">No hay rangos configurados.</div>;
  }

  return (
    <div className="rangeRulesList">
      {recipe.ranges.map((range) => (
        <RangeRuleCard
          key={range.id}
          range={range}
          inputColumns={inputColumns}
          selected={range.id === selectedRangeId}
          hasCondition={Boolean(recipe.condition)}
          onSelect={() => onSelect(range.id)}
          onDuplicate={() => onDuplicate(range.id)}
          onRemove={() => onRemove(range.id)}
        />
      ))}
    </div>
  );
}

function RangeRuleCard({
  range,
  inputColumns,
  selected,
  hasCondition,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  selected: boolean;
  hasCondition: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rangeRuleCard${selected ? ' selected' : ''}`}>
      <button type="button" className="rangeRuleSelect" onClick={onSelect}>
        <strong>Filas {formatRangeRowNumber(range.startRowNumber)} - {formatRangeRowNumber(range.endRowNumber)}</strong>
        <span>{getRangeRuleValueSummary(range, inputColumns)}</span>
        <small>{getRangeRuleMetaSummary(range, inputColumns, hasCondition)}</small>
      </button>
      <div className="rangeRuleActions">
        <ActionButton action="duplicate" variant="icon" size="sm" title="Duplicar rango" aria-label="Duplicar rango" onClick={onDuplicate} />
        <DeleteButton title="Eliminar rango" onClick={onRemove} />
      </div>
    </div>
  );
}

function RangeRuleInspector({
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  onChange,
  onDuplicate,
  onRemove,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  range: ManualRangeValue | null;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
  onDuplicate: (rangeId: string) => void;
  onRemove: (rangeId: string) => void;
}) {
  if (!range) {
    return (
      <div className="rangeRuleInspector">
        <strong>Inspector de rango</strong>
        <p>Seleccioná un rango.</p>
      </div>
    );
  }

  const valueSourceType = getManualRangeValueSourceType(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const inputSource = getManualRangeInputSource(range);
  const selectedTextOptions = getManualRangeTextOptions(manualRangeRows, range, rangeTextSource.inputColumnId);
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: noActiveColumnsLabel }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));
  const rangeIndex = recipe.ranges.findIndex((item) => item.id === range.id);
  const updateRange = (patch: Partial<ManualRangeValue>) => onChange(updateManualRangeValue(recipe, range.id, patch));
  const moveRange = (direction: -1 | 1) => {
    const nextIndex = rangeIndex + direction;
    if (nextIndex < 0 || nextIndex >= recipe.ranges.length) {
      return;
    }
    const nextRanges = [...recipe.ranges];
    [nextRanges[rangeIndex], nextRanges[nextIndex]] = [nextRanges[nextIndex], nextRanges[rangeIndex]];
    onChange({ ...recipe, ranges: nextRanges });
  };

  return (
    <div className="rangeRuleInspector">
      <div className="rangeRuleInspectorHeader">
        <span>Rango seleccionado</span>
        <strong>Filas {formatRangeRowNumber(range.startRowNumber)} - {formatRangeRowNumber(range.endRowNumber)}</strong>
      </div>
      <div className="rangeRuleInspectorFields">
        <label className="field compact">
          <span>Fila inicio</span>
          <input type="number" min="1" value={formatManualRangeRowInput(range.startRowNumber)} onChange={(event) => updateRange({ startRowNumber: parseManualRangeRowInput(event.target.value) ?? 0 })} />
        </label>
        <label className="field compact">
          <span>Fila fin</span>
          <input type="number" min="1" value={formatManualRangeRowInput(range.endRowNumber)} onChange={(event) => updateRange({ endRowNumber: parseManualRangeRowInput(event.target.value) ?? 0 })} />
        </label>
        <Dropdown<ManualRangeValueSourceType>
          className="compact"
          label="Modo de valor"
          value={valueSourceType}
          options={manualRangeValueSourceOptions}
          scrollStrategy="close"
          onChange={(type) => onChange(updateManualRangeValueSourceType(recipe, range.id, type, inputColumns))}
        />
        {valueSourceType === 'fixedText' ? (
          <label className="field compact">
            <span>Texto fijo</span>
            <input value={getManualRangeFixedTextValue(range)} onChange={(event) => onChange(updateManualRangeFixedTextValue(recipe, range.id, event.target.value))} />
          </label>
        ) : null}
        {valueSourceType === 'input' ? (
          <Dropdown className="compact" label="Columna de entrada" value={inputSource.inputColumnId} options={inputColumnOptions} scrollStrategy="close" onChange={(inputColumnId) => onChange(updateManualRangeInputValue(recipe, range.id, inputColumnId))} />
        ) : null}
        {valueSourceType === 'rangeText' ? (
          <>
            <Dropdown className="compact" label="Buscar textos en" value={rangeTextSource.inputColumnId} options={inputColumnOptions} scrollStrategy="close" onChange={(inputColumnId) => onChange(updateManualRangeRangeTextValue(recipe, range.id, { inputColumnId }))} />
            <Dropdown
              className="compact"
              label="Texto encontrado"
              value={rangeTextSource.selectedText}
              options={selectedTextOptions.length === 0 ? [{ value: '', label: 'Sin textos en el rango', disabled: true }] : selectedTextOptions.map((text) => ({ value: text, label: text }))}
              disabled={selectedTextOptions.length === 0}
              searchable
              searchPlaceholder="Buscar texto"
              scrollStrategy="close"
              onChange={(selectedText) => onChange(updateManualRangeRangeTextValue(recipe, range.id, { selectedText }))}
            />
            {selectedTextOptions.length === 0 ? <p className="rangeRuleHelp">No se encontraron textos en este rango para la columna seleccionada.</p> : null}
          </>
        ) : null}
      </div>
      <details className="rangeConditionPanel">
        <summary>{recipe.condition ? `Condición: ${describeManualRangeCondition(recipe, inputColumns)}` : '+ Agregar condición'}</summary>
        <RangeConditionEditor recipe={recipe} inputColumns={inputColumns} onChange={onChange} />
      </details>
      <div className="rangeRuleInspectorActions">
        <ActionButton action="duplicate" variant="secondary" onClick={() => onDuplicate(range.id)}>Duplicar</ActionButton>
        <ActionButton variant="secondary" disabled={rangeIndex <= 0} onClick={() => moveRange(-1)}>Subir</ActionButton>
        <ActionButton variant="secondary" disabled={rangeIndex >= recipe.ranges.length - 1} onClick={() => moveRange(1)}>Bajar</ActionButton>
        <DeleteButton title="Eliminar rango" onClick={() => onRemove(range.id)} />
      </div>
    </div>
  );
}

function RangeConditionEditor({
  recipe,
  inputColumns,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}) {
  const condition = recipe.condition;
  const defaultColumnId = inputColumns[0]?.id ?? '';
  return (
    <div className="rangeConditionFields">
      <Dropdown<'always' | 'conditional'>
        className="compact"
        label="Aplicación"
        value={condition ? 'conditional' : 'always'}
        options={[
          { value: 'always', label: 'Todas las filas del rango' },
          { value: 'conditional', label: 'Sólo filas que coinciden' },
        ]}
        scrollStrategy="close"
        onChange={(value) => onChange(updateManualRangeCondition(recipe, value === 'conditional' ? condition ?? { inputColumnId: defaultColumnId, operator: 'isNotEmpty' } : null))}
      />
      {condition ? (
        <>
          <Dropdown className="compact" label="Columna" value={condition.inputColumnId} options={inputColumns.length === 0 ? [{ value: '', label: noActiveColumnsLabel }] : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))} scrollStrategy="close" onChange={(inputColumnId) => onChange(updateManualRangeCondition(recipe, { ...condition, inputColumnId }))} />
          <Dropdown<'isEmpty' | 'isNotEmpty'> className="compact" label="Condición" value={condition.operator} options={[{ value: 'isNotEmpty', label: 'no está vacía' }, { value: 'isEmpty', label: 'está vacía' }]} scrollStrategy="close" onChange={(operator) => onChange(updateManualRangeCondition(recipe, { ...condition, operator }))} />
          <ActionButton action="clear" variant="secondary" onClick={() => onChange(updateManualRangeCondition(recipe, null))}>Quitar condición</ActionButton>
        </>
      ) : null}
    </div>
  );
}

function RangeValuePreview({ rows, hasRanges }: { rows: Array<{ rowNumber: string; value: string }>; hasRanges: boolean }) {
  return (
    <SimpleValuePreview
      title="Preview de rangos"
      rows={rows}
      emptyMessage={hasRanges ? 'No hay filas para previsualizar.' : 'Agregá un rango.'}
    />
  );
}

function getRangeStudioPreviewRows(
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>,
  manualRangeRows: InputRow[],
  sampleInputValues?: Record<string, string>,
) {
  if (recipe.ranges.length === 0) {
    return [];
  }

  const previewColumn: OutputColumn = { id: 'range-studio-preview', label: 'Preview', order: 0, enabled: true, recipe };
  const rowCandidates = manualRangeRows
    .filter((row) => recipe.ranges.some((range) => row.rowNumber >= range.startRowNumber && row.rowNumber <= range.endRowNumber))
    .slice(0, 3);
  if (rowCandidates.length > 0) {
    return buildProcessedRows(rowCandidates, [previewColumn]).map((row) => ({ rowNumber: String(row.rowNumber), value: row.outputValues[previewColumn.id] ?? '' }));
  }

  if (!sampleInputValues) {
    return [];
  }

  const firstRange = recipe.ranges[0];
  const [row] = buildProcessedRows([{ rowNumber: firstRange.startRowNumber || 1, values: sampleInputValues }], [previewColumn]);
  return [{ rowNumber: String(firstRange.startRowNumber || 'ejemplo'), value: row?.outputValues[previewColumn.id] ?? '' }];
}

function getRangeRuleValueSummary(range: ManualRangeValue, inputColumns: InputColumn[]) {
  if ((range.valueRecipe?.steps ?? []).length > 0) {
    return 'Fragmento avanzado';
  }

  const sourceType = getManualRangeValueSourceType(range);
  if (sourceType === 'fixedText') {
    return getManualRangeFixedTextValue(range).trim() || 'Sin valor';
  }

  if (sourceType === 'rangeText') {
    return getManualRangeRangeTextSource(range).selectedText.trim() || 'Texto encontrado dentro del rango';
  }

  const inputColumn = inputColumns.find((column) => column.id === getManualRangeInputSource(range).inputColumnId);
  return inputColumn ? `Columna: ${getInputColumnLabel(inputColumn)}` : 'Columna de entrada';
}

function getRangeRuleMetaSummary(range: ManualRangeValue, inputColumns: InputColumn[], hasCondition: boolean) {
  const parts = [];
  const rowCount = getManualRangeRowCountFromInputs(String(range.startRowNumber || ''), String(range.endRowNumber || ''));
  if (rowCount) {
    parts.push(`${rowCount} ${rowCount === '1' ? 'fila' : 'filas'}`);
  }

  const reference = getManualRangeReferenceText(range);
  if (reference) {
    parts.push(reference);
  }

  if (getManualRangeValueSourceType(range) === 'rangeText') {
    const inputColumn = inputColumns.find((column) => column.id === getManualRangeRangeTextSource(range).inputColumnId);
    if (inputColumn) {
      parts.push(`busca en ${getInputColumnLabel(inputColumn)}`);
    }
  }

  if (hasCondition) {
    parts.push('con condición');
  }

  return parts.join(' · ') || 'Sin detalles';
}

function formatRangeRowNumber(rowNumber: number) {
  return rowNumber > 0 ? String(rowNumber) : 'sin definir';
}

function formatManualRangeRowInput(rowNumber: number) {
  return Number.isInteger(rowNumber) && rowNumber > 0 ? String(rowNumber) : '';
}
