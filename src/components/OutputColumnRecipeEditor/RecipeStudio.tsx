import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { addManualRangeValue, describeManualRangeCondition, duplicateManualRangeValue, getManualRangeCountLabel, getManualRangeFixedTextValue, getManualRangeInputSource, getManualRangeRangeTextSource, getManualRangeReferenceText, getManualRangeRowCountFromInputs, getManualRangeTextOptions, getManualRangeValueSourceType, hasOverlappingManualRanges, manualRangeValueSourceOptions, parseManualRangeRowInput, removeManualRangeValue, sortManualRangesByStart, updateManualRangeCondition, updateManualRangeFixedTextValue, updateManualRangeInputValue, updateManualRangeRangeTextValue, updateManualRangeValue, updateManualRangeValueSourceType, type ManualRangeValueSourceType } from '../../domain/import/manualRangeModel';
import { buildProcessedRows } from '../../domain/import/outputModel';
import type { ConcatPart, InputColumn, InputRow, ManualRangeValue, OutputColumn, OutputRecipe, RecipePart } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';
import { conditionOperators } from './OutputColumnRecipeEditor.optionHelpers';
import { buildManualRangeAwarePreview, describeStepAdjustments, getConfiguredConcatStep, getConstructorAdjustmentsSummary, getCustomValuePartsDisplaySummary } from './OutputColumnRecipeEditor.displayHelpers';
import { buildSimpleCustomValueRecipeWithSteps, clearManualRangeValues, createNoopStep, getFirstStepSource, getInputColumnSummary, getRecipeStudioMode, getSimpleInputPart, type CustomValueMode, type EditableCustomRecipe, type RecipeStudioMode } from './OutputColumnRecipeEditor.recipeHelpers';
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

type RecipeStudioRenderers = {
  renderCustomValueEditor: (props: CustomValueEditorRenderProps) => ReactNode;
  renderManualRangeRecipeEditor: (props: ManualRangeRecipeEditorRenderProps) => ReactNode;
  renderManualRangeTextGenerator: (props: ManualRangeTextGeneratorRenderProps) => ReactNode;
};

const recipeStudioModes: Array<{ mode: RecipeStudioMode; label: string; description: string }> = [
  { mode: 'takeValue', label: 'Tomar valor', description: 'Usar columna origen y ajustes simples.' },
  { mode: 'fixedText', label: 'Texto fijo', description: 'Repetir texto o valor constante.' },
  { mode: 'compose', label: 'Combinar valores', description: 'Unir columnas, textos y separadores.' },
  { mode: 'ranges', label: 'Asignar por rangos', description: 'Completar por filas reales del Excel.' },
  { mode: 'advanced', label: 'Avanzado', description: 'Editar pasos técnicos completos.' },
];

export function RecipeStudioShell({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  preview,
  customValueMode,
  onChange,
  renderCustomValueEditor,
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
  const activeMode = getRecipeStudioMode(recipe);
  const [selectedStudioItemId, setSelectedStudioItemId] = useState<string | null>(null);
  const renderers = { renderCustomValueEditor, renderManualRangeRecipeEditor, renderManualRangeTextGenerator };
  const changeMode = (mode: RecipeStudioMode) => {
    if (mode === activeMode) {
      return;
    }

    if (mode === 'takeValue') {
      onChange(createTakeValueStudioRecipe(recipe, inputColumns));
      return;
    }

    if (mode === 'fixedText') {
      onChange(createFixedTextStudioRecipe(recipe));
      return;
    }

    if (mode === 'compose') {
      onChange(createComposeStudioRecipe(recipe));
      return;
    }

    if (mode === 'ranges') {
      onChange(recipe.type === 'manualRange' ? recipe : { type: 'manualRange', ranges: [] });
    }
  };

  return (
    <div className="constructorModalContent recipeStudio">
      <RecipeStudioHeader recipe={recipe} activeMode={activeMode} preview={preview} inputColumns={inputColumns} />
      <div className="recipeStudioWorkspace">
        <RecipeStudioSidebar activeMode={activeMode} onModeSelect={changeMode} />
        <RecipeStudioMain
          recipe={recipe}
          activeMode={activeMode}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sampleInputValues={sampleInputValues}
          customValueMode={customValueMode}
          selectedStudioItemId={selectedStudioItemId}
          onSelectedStudioItemChange={setSelectedStudioItemId}
          renderers={renderers}
          onChange={onChange}
        />
        <RecipeStudioInspector
          recipe={recipe}
          activeMode={activeMode}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          preview={preview}
          selectedStudioItemId={selectedStudioItemId}
          onSelectedStudioItemChange={setSelectedStudioItemId}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function RecipeStudioHeader({
  recipe,
  activeMode,
  preview,
  inputColumns,
}: {
  recipe: EditableCustomRecipe;
  activeMode: RecipeStudioMode;
  preview: string;
  inputColumns: InputColumn[];
}) {
  return (
    <div className="recipeStudioHero">
      <div>
        <span className="recipeStudioEyebrow">{getRecipeStudioModeLabel(activeMode)}</span>
        <h4>{getRecipeStudioTitle(recipe, activeMode)}</h4>
        <p>{getRecipeStudioSummary(recipe, activeMode, inputColumns)}</p>
      </div>
      <div className="recipeStudioPreview">
        <span>Vista previa</span>
        <strong>{preview || 'Sin vista previa'}</strong>
      </div>
    </div>
  );
}

function RecipeStudioSidebar({
  activeMode,
  onModeSelect,
}: {
  activeMode: RecipeStudioMode;
  onModeSelect: (mode: RecipeStudioMode) => void;
}) {
  return (
    <nav className="recipeStudioSidebar" aria-label="Modo de construccion">
      {recipeStudioModes.map((item) => {
        const isActive = item.mode === activeMode;
        const isEnabled = isActive || item.mode === 'takeValue' || item.mode === 'fixedText' || item.mode === 'compose' || item.mode === 'ranges';
        return (
          <button
            key={item.mode}
            type="button"
            className={`recipeStudioModeButton${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'step' : undefined}
            disabled={!isEnabled}
            title={isEnabled ? item.label : 'Disponible en el siguiente corte'}
            onClick={() => onModeSelect(item.mode)}
          >
            <span>{item.label}</span>
            <small>{item.description}</small>
          </button>
        );
      })}
    </nav>
  );
}

function RecipeStudioMain({
  recipe,
  activeMode,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  customValueMode,
  selectedStudioItemId,
  onSelectedStudioItemChange,
  renderers,
  onChange,
}: {
  recipe: EditableCustomRecipe;
  activeMode: RecipeStudioMode;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  customValueMode: CustomValueMode;
  selectedStudioItemId: string | null;
  onSelectedStudioItemChange: (id: string | null) => void;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: EditableCustomRecipe) => void;
}) {
  return (
    <main className="recipeStudioMain">
      <div className="recipeStudioSectionHeading">
        <span>{getRecipeStudioModeLabel(activeMode)}</span>
        <strong>{getRecipeStudioMainTitle(activeMode)}</strong>
      </div>
      {recipe.type === 'manualRange' ? (
        <RangeValueStudio
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sampleInputValues={sampleInputValues}
          selectedRangeId={selectedStudioItemId}
          onSelectedRangeChange={onSelectedStudioItemChange}
          renderers={renderers}
          onChange={onChange}
        />
      ) : activeMode === 'takeValue' ? (
        <TakeValueStudio
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sampleInputValues={sampleInputValues}
          customValueMode={customValueMode}
          renderers={renderers}
          onChange={onChange}
        />
      ) : activeMode === 'fixedText' ? (
        <FixedTextStudio
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sampleInputValues={sampleInputValues}
          customValueMode={customValueMode}
          renderers={renderers}
          onChange={onChange}
        />
      ) : activeMode === 'compose' ? (
        <ComposeValueStudio
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          sampleInputValues={sampleInputValues}
          customValueMode={customValueMode}
          selectedTokenId={selectedStudioItemId}
          onSelectedTokenChange={onSelectedStudioItemChange}
          renderers={renderers}
          onChange={onChange}
        />
      ) : (
        renderers.renderCustomValueEditor({
          recipe,
          inputColumns,
          manualRangeRows,
          sampleInputValues,
          mode: customValueMode,
          onChange,
        })
      )}
    </main>
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
  kind: 'input' | 'text' | 'previous' | 'advanced';
  index: number;
  isComplex: boolean;
};

function ComposeValueStudio({
  recipe,
  inputColumns,
  manualRangeRows,
  sampleInputValues,
  customValueMode,
  selectedTokenId,
  onSelectedTokenChange,
  renderers,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  sampleInputValues?: Record<string, string>;
  customValueMode: CustomValueMode;
  selectedTokenId: string | null;
  onSelectedTokenChange: (tokenId: string | null) => void;
  renderers: RecipeStudioRenderers;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const previousTokenCountRef = useRef(getComposeTokens(recipe, inputColumns).length);
  const tokens = getComposeTokens(recipe, inputColumns);
  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? tokens[0] ?? null;
  const previewRows = getComposePreviewRows(recipe, manualRangeRows, sampleInputValues);
  const complexTokenCount = tokens.filter((token) => token.isComplex).length;

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

  const updateRecipeParts = (parts: RecipePart[]) => {
    onChange(updateComposeRecipeParts(recipe, parts));
  };

  const addToken = (part: RecipePart) => {
    updateRecipeParts([...getComposeRecipeParts(recipe), part]);
  };

  return (
    <div className="composeStudio">
      <div className="simpleStudioIntro">
        <h4>Combinar valores</h4>
        <p>Armá el resultado uniendo columnas, textos y separadores.</p>
      </div>
      <div className="composeStudioActions" aria-label="Agregar pieza">
        <ActionButton action="add" variant="secondary" onClick={() => addToken(createComposeInputPart(inputColumns[0]?.id ?? ''))}>
          Columna
        </ActionButton>
        <ActionButton action="add" variant="secondary" onClick={() => addToken(createComposeTextPart(''))}>
          Texto
        </ActionButton>
        <ActionButton action="add" variant="secondary" onClick={() => addToken(createComposeTextPart(' - '))}>
          Separador
        </ActionButton>
      </div>
      <CompositionTokenList
        tokens={tokens}
        selectedTokenId={selectedToken?.id ?? null}
        separator={recipe.separator}
        emptyMessage="Agregá una pieza para empezar."
        onSelect={onSelectedTokenChange}
      />
      {complexTokenCount > 0 ? (
        <p className="composeStudioWarning">
          {complexTokenCount} {complexTokenCount === 1 ? 'pieza usa' : 'piezas usan'} opciones avanzadas. Revisalas en el editor avanzado.
        </p>
      ) : null}
      <ComposeValuePreview rows={previewRows} hasTokens={tokens.length > 0} />
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
    </div>
  );
}

function CompositionTokenList({
  tokens,
  selectedTokenId,
  separator,
  emptyMessage,
  onSelect,
}: {
  tokens: ComposeToken[];
  selectedTokenId: string | null;
  separator?: string;
  emptyMessage: string;
  onSelect: (tokenId: string) => void;
}) {
  if (tokens.length === 0) {
    return <div className="compositionTokenEmpty">{emptyMessage}</div>;
  }

  return (
    <div className="compositionTokenList" aria-label="Piezas de combinacion">
      {tokens.map((token, index) => (
        <div key={token.id} className="compositionTokenSlot">
          {index > 0 ? <span className="compositionJoiner">{separator ? JSON.stringify(separator) : '+'}</span> : null}
          <CompositionToken
            token={token}
            selected={token.id === selectedTokenId}
            onClick={() => onSelect(token.id)}
          />
        </div>
      ))}
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
  onSelectToken,
  onChange,
}: {
  recipe: Extract<OutputRecipe, { type: 'combine' }>;
  token: ComposeToken | null;
  inputColumns: InputColumn[];
  onSelectToken: (tokenId: string | null) => void;
  onChange: (recipe: Extract<OutputRecipe, { type: 'combine' }>) => void;
}) {
  const parts = getComposeRecipeParts(recipe);
  const part = token ? parts[token.index] : undefined;

  if (!token || !part) {
    return (
      <aside className="composeTokenInspector">
        <strong>Inspector de pieza</strong>
        <p>Seleccioná una pieza.</p>
      </aside>
    );
  }

  const updatePart = (nextPart: RecipePart) => {
    onChange(updateComposeRecipeParts(recipe, parts.map((item, index) => (index === token.index ? nextPart : item))));
  };
  const removePart = () => {
    const nextParts = parts.filter((_, index) => index !== token.index);
    onChange(updateComposeRecipeParts(recipe, nextParts));
    onSelectToken(nextParts[token.index]?.id ?? nextParts[token.index - 1]?.id ?? null);
  };
  const duplicatePart = () => {
    const nextPart = cloneComposePart(part);
    const nextParts = [...parts.slice(0, token.index + 1), nextPart, ...parts.slice(token.index + 1)];
    onChange(updateComposeRecipeParts(recipe, nextParts));
    onSelectToken(nextPart.id);
  };
  const movePart = (direction: -1 | 1) => {
    const nextIndex = token.index + direction;
    if (nextIndex < 0 || nextIndex >= parts.length) {
      return;
    }

    const nextParts = [...parts];
    [nextParts[token.index], nextParts[nextIndex]] = [nextParts[nextIndex], nextParts[token.index]];
    onChange(updateComposeRecipeParts(recipe, nextParts));
  };

  return (
    <aside className="composeTokenInspector">
      <div className="composeTokenInspectorHeader">
        <span>Pieza seleccionada</span>
        <strong>{token.label}</strong>
      </div>
      <div className="composeTokenFields">
        <Dropdown<'input' | 'text'>
          className="compact"
          label="Fuente"
          value={part.type}
          options={[
            { value: 'input', label: 'Columna de entrada' },
            { value: 'text', label: 'Texto fijo' },
          ]}
          scrollStrategy="close"
          onChange={(type) => updatePart(type === 'input'
            ? createComposeInputPart(inputColumns[0]?.id ?? '', part.id)
            : createComposeTextPart(part.type === 'text' ? part.value : '', part.id))}
        />
        {part.type === 'input' ? (
          <Dropdown
            className="compact"
            label="Columna"
            value={part.inputColumnId}
            options={inputColumns.length === 0
              ? [{ value: '', label: noActiveColumnsLabel }]
              : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
            scrollStrategy="close"
            onChange={(inputColumnId) => updatePart({ ...part, inputColumnId })}
          />
        ) : (
          <label className="field compact">
            <span>Texto</span>
            <input value={part.value} onChange={(event) => updatePart({ ...part, value: event.target.value })} />
          </label>
        )}
        <dl className="composeTokenMeta">
          <div>
            <dt>Transformaciones</dt>
            <dd>{describeStepAdjustments(part.steps ?? [], inputColumns).length || 'Sin transformaciones'}</dd>
          </div>
          <div>
            <dt>Condicion</dt>
            <dd>{getComposeTokenConditionSummary(part, inputColumns)}</dd>
          </div>
        </dl>
      </div>
      <div className="composeTokenInspectorActions">
        <ActionButton action="duplicate" variant="secondary" onClick={duplicatePart}>Duplicar</ActionButton>
        <ActionButton variant="secondary" disabled={token.index === 0} onClick={() => movePart(-1)}>Izquierda</ActionButton>
        <ActionButton variant="secondary" disabled={token.index === parts.length - 1} onClick={() => movePart(1)}>Derecha</ActionButton>
        <DeleteButton title="Eliminar pieza" onClick={removePart} />
      </div>
    </aside>
  );
}

function ComposeValuePreview({
  rows,
  hasTokens,
}: {
  rows: Array<{ rowNumber: string; value: string }>;
  hasTokens: boolean;
}) {
  return (
    <SimpleValuePreview
      title="Preview combinado"
      rows={rows}
      emptyMessage={hasTokens ? 'No hay datos para previsualizar.' : 'Agregá una pieza para empezar.'}
    />
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

function RecipeStudioInspector({
  recipe,
  activeMode,
  inputColumns,
  manualRangeRows,
  preview,
  selectedStudioItemId,
  onSelectedStudioItemChange,
  onChange,
}: {
  recipe: EditableCustomRecipe;
  activeMode: RecipeStudioMode;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  preview: string;
  selectedStudioItemId: string | null;
  onSelectedStudioItemChange: (id: string | null) => void;
  onChange: (recipe: EditableCustomRecipe) => void;
}) {
  const details = getRecipeStudioInspectorDetails(recipe, activeMode, inputColumns, preview);

  if (recipe.type === 'combine' && activeMode === 'compose') {
    const tokens = getComposeTokens(recipe, inputColumns);
    const selectedToken = tokens.find((token) => token.id === selectedStudioItemId) ?? tokens[0] ?? null;
    return (
      <ComposeTokenInspector
        recipe={recipe}
        token={selectedToken}
        inputColumns={inputColumns}
        onSelectToken={onSelectedStudioItemChange}
        onChange={onChange}
      />
    );
  }

  if (recipe.type === 'manualRange') {
    const selectedRange = recipe.ranges.find((range) => range.id === selectedStudioItemId) ?? recipe.ranges[0] ?? null;
    const duplicateRange = (rangeId: string) => {
      const sourceIndex = recipe.ranges.findIndex((range) => range.id === rangeId);
      const nextRecipe = duplicateManualRangeValue(recipe, rangeId);
      onChange(nextRecipe);
      onSelectedStudioItemChange(nextRecipe.ranges[sourceIndex + 1]?.id ?? null);
    };
    const removeRange = (rangeId: string) => {
      const sourceIndex = recipe.ranges.findIndex((range) => range.id === rangeId);
      const nextRecipe = removeManualRangeValue(recipe, rangeId);
      onChange(nextRecipe);
      onSelectedStudioItemChange(nextRecipe.ranges[sourceIndex]?.id ?? nextRecipe.ranges[sourceIndex - 1]?.id ?? null);
    };

    return (
      <RangeRuleInspector
        recipe={recipe}
        range={selectedRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
        onDuplicate={duplicateRange}
        onRemove={removeRange}
      />
    );
  }

  return (
    <aside className="recipeStudioInspector">
      <div className="recipeStudioInspectorHeader">
        <span>Inspector</span>
        <strong>{getRecipeStudioModeLabel(activeMode)}</strong>
      </div>
      <dl>
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
      {activeMode !== 'advanced' ? (
        <p>Abrí Opciones avanzadas para el editor técnico completo.</p>
      ) : (
        <p>Editor técnico completo para casos complejos.</p>
      )}
    </aside>
  );
}

function getRecipeStudioModeLabel(mode: RecipeStudioMode) {
  return recipeStudioModes.find((item) => item.mode === mode)?.label ?? 'Avanzado';
}

function getRecipeStudioTitle(recipe: EditableCustomRecipe, mode: RecipeStudioMode) {
  if (recipe.type === 'manualRange') {
    return 'Valores por rangos';
  }

  if (mode === 'compose') {
    return 'Composicion de valor';
  }

  if (mode === 'fixedText') {
    return 'Valor constante';
  }

  if (mode === 'takeValue') {
    return 'Valor desde origen';
  }

  return 'Editor avanzado';
}

function getRecipeStudioMainTitle(mode: RecipeStudioMode) {
  if (mode === 'ranges') {
    return 'Rangos configurados';
  }

  if (mode === 'compose') {
    return 'Construccion';
  }

  if (mode === 'takeValue') {
    return 'Origen y ajustes';
  }

  if (mode === 'fixedText') {
    return 'Texto y ajustes';
  }

  return 'Pasos tecnicos';
}

function getRecipeStudioSummary(recipe: EditableCustomRecipe, mode: RecipeStudioMode, inputColumns: InputColumn[]) {
  if (recipe.type === 'manualRange') {
    return `${getManualRangeCountLabel(recipe)}. ${describeManualRangeCondition(recipe, inputColumns)}.`;
  }

  if (mode === 'compose') {
    return getCustomValuePartsDisplaySummary(recipe, inputColumns) || 'Combina partes y transformaciones.';
  }

  if (mode === 'takeValue') {
    const inputColumn = getSimpleInputColumn(recipe, inputColumns) ?? inputColumns[0];
    return inputColumn ? getInputColumnSummary(inputColumn) : 'Toma valor desde una columna activa.';
  }

  if (mode === 'fixedText') {
    return 'Usa texto fijo como fuente del valor.';
  }

  return 'Mantiene acceso a pasos, condiciones y transformaciones completas.';
}

function getRecipeStudioInspectorDetails(
  recipe: EditableCustomRecipe,
  activeMode: RecipeStudioMode,
  inputColumns: InputColumn[],
  preview: string,
) {
  if (recipe.type === 'manualRange') {
    return [
      { label: 'Modo', value: getRecipeStudioModeLabel(activeMode) },
      { label: 'Rangos', value: getManualRangeCountLabel(recipe) },
      { label: 'Condicion', value: describeManualRangeCondition(recipe, inputColumns) },
      { label: 'Preview', value: preview || 'Sin vista previa' },
    ];
  }

  return [
    { label: 'Modo', value: getRecipeStudioModeLabel(activeMode) },
    ...getCombineStudioInspectorDetails(recipe, activeMode, inputColumns),
    { label: 'Preview', value: preview || 'Sin vista previa' },
  ];
}

function getSimpleInputColumn(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]) {
  const inputColumnId = getSimpleInputPart(recipe).inputColumnId;
  return inputColumns.find((column) => column.id === inputColumnId);
}

function getCombineStudioInspectorDetails(
  recipe: Extract<OutputRecipe, { type: 'combine' }>,
  activeMode: RecipeStudioMode,
  inputColumns: InputColumn[],
) {
  if (activeMode === 'takeValue') {
    const selectedInputColumn = getSimpleInputColumn(recipe, inputColumns);
    return [
      { label: 'Fuente', value: 'Columna de entrada' },
      { label: 'Columna', value: selectedInputColumn ? getInputColumnLabel(selectedInputColumn) : 'Sin columna seleccionada' },
      { label: 'Condicion', value: getSimpleStudioConditionSummary(recipe, inputColumns) },
      { label: 'Transformaciones', value: getSimpleStudioTransformSummary(recipe) },
    ];
  }

  if (activeMode === 'fixedText') {
    return [
      { label: 'Fuente', value: 'Texto fijo' },
      { label: 'Valor actual', value: getSimpleStudioFixedText(recipe) || 'Sin texto' },
      { label: 'Condicion', value: getSimpleStudioConditionSummary(recipe, inputColumns) },
      { label: 'Transformaciones', value: getSimpleStudioTransformSummary(recipe) },
    ];
  }

  return [
    { label: 'Partes', value: getCustomValuePartsDisplaySummary(recipe, inputColumns) || 'Sin partes visibles' },
    { label: 'Transformaciones', value: getConstructorAdjustmentsSummary(recipe, inputColumns) || 'Sin transformaciones' },
  ];
}

function createTakeValueStudioRecipe(
  recipe: EditableCustomRecipe,
  inputColumns: InputColumn[],
  requestedInputColumnId?: string,
): Extract<OutputRecipe, { type: 'combine' }> {
  const currentRecipe = recipe.type === 'combine' ? recipe : { type: 'combine' as const, parts: [], separator: '' };
  const inputColumnId = requestedInputColumnId
    ?? getSimpleStudioInputColumnId(currentRecipe)
    ?? inputColumns[0]?.id
    ?? '';
  return buildSimpleCustomValueRecipeWithSteps(
    'text',
    inputColumnId,
    getReusableSimpleStudioSteps(currentRecipe),
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

  if (recipe.customMode === 'concat' || recipe.parts.length > 1 || getConfiguredConcatStep(recipe)) {
    return { ...recipe, customMode: 'concat', separator: recipe.separator ?? '' };
  }

  return { type: 'combine', customMode: 'concat', parts: [], separator: '', steps: [] };
}

function getComposeTokens(recipe: Extract<OutputRecipe, { type: 'combine' }>, inputColumns: InputColumn[]): ComposeToken[] {
  const parts = getComposeRecipeParts(recipe);
  return parts.map((part, index) => {
    const steps = part.steps ?? [];
    const isComplex = steps.length > 0;
    if (part.type === 'input') {
      const inputColumn = inputColumns.find((column) => column.id === part.inputColumnId);
      return {
        id: part.id,
        kind: isComplex ? 'advanced' : 'input',
        label: inputColumn ? `Columna: ${getInputColumnLabel(inputColumn)}` : 'Columna',
        detail: isComplex ? 'Fragmento avanzado' : 'Dato del Excel',
        index,
        isComplex,
      };
    }

    return {
      id: part.id,
      kind: isComplex ? 'advanced' : 'text',
      label: part.value ? `"${part.value}"` : 'Texto fijo',
      detail: isComplex ? 'Fragmento avanzado' : 'Texto',
      index,
      isComplex,
    };
  });
}

function getComposeRecipeParts(recipe: Extract<OutputRecipe, { type: 'combine' }>): RecipePart[] {
  const concatStep = getConfiguredConcatStep(recipe);
  if (recipe.parts.length > 0 || !concatStep?.parts?.length) {
    return recipe.parts;
  }

  return concatStep.parts.map((part) => concatPartToRecipePart(part));
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
  const rows = manualRangeRows.slice(0, 3);
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

function getComposeTokenConditionSummary(part: RecipePart, inputColumns: InputColumn[]) {
  const condition = (part.steps ?? []).find((step) => step.condition)?.condition;
  if (!condition) {
    return 'Aplicar siempre';
  }

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
    return <div className="rangeRulesEmpty">Agregá un rango.</div>;
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
      <aside className="rangeRuleInspector">
        <strong>Inspector de rango</strong>
        <p>Seleccioná un rango.</p>
      </aside>
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
    <aside className="rangeRuleInspector">
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
    </aside>
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
