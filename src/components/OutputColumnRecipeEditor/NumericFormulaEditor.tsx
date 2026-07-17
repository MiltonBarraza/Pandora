import { useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { parseNumericValue } from '../../domain/import/numericOperations';
import type { InputColumn, NumericFormula, NumericFormulaNode, NumericFormulaOperator, StepOperand, TransformStep } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { parseRounding } from './OutputColumnRecipeEditor.optionHelpers';
import { StepOperandFields } from './OutputColumnRecipeEditor.StepFields';
import {
  addFormulaValueToken,
  clearFormulaGroup,
  createDefaultFormulaTokenState,
  getFormulaOperatorTokens,
  getFormulaValueTokens,
  groupFormulaValueWithNext,
  moveFormulaGroupEndToValue,
  moveFormulaGroupStartToValue,
  numericFormulaNodeToTokens,
  numericFormulaToTokenState,
  normalizeFormulaTokenState,
  removeFormulaValueToken,
  reorderFormulaValueToken,
  tokenStateToExpression,
  tokenStateToNumericFormula,
  updateFormulaOperator,
  updateFormulaValueOperand,
  validateFormulaTokenState,
  type FormulaGroup,
  type FormulaTokenState,
  type FormulaValueToken,
} from './numericFormulaTokens';

type NumericFormulaEditorProps = {
  formula: NumericFormula | undefined;
  rounding?: TransformStep['rounding'];
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  compatibilityHint?: string;
  showRoundingControl?: boolean;
  warning?: string;
  onFormulaChange: (formula: NumericFormula) => void;
  onRoundingChange?: (rounding: TransformStep['rounding']) => void;
};

const operatorOptions: Array<{ value: NumericFormulaOperator; label: string }> = [
  { value: 'add', label: '+' },
  { value: 'subtract', label: '-' },
  { value: 'multiply', label: '×' },
  { value: 'divide', label: '÷' },
];

const formulaDisplayOperatorLabels: Record<NumericFormulaOperator, string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
};

type FormulaParenthesisSide = 'open' | 'close';

const openParenthesisDragId = 'parenthesis-open';
const closeParenthesisDragId = 'parenthesis-close';
const invalidParenthesesWarning = 'Los paréntesis no forman un grupo válido. Ajustalos para ver la vista previa.';

export function NumericFormulaEditor({
  formula,
  rounding,
  inputColumns,
  allowPreviousResult,
  compatibilityHint = '',
  showRoundingControl = true,
  warning = '',
  onFormulaChange,
  onRoundingChange,
}: NumericFormulaEditorProps) {
  const fallbackState = useMemo(
    () => createDefaultFormulaTokenState(
      createDefaultOperand(inputColumns, allowPreviousResult, 0),
      createDefaultOperand(inputColumns, false, 1),
    ),
    [allowPreviousResult, inputColumns],
  );
  const tokenState = numericFormulaToTokenState(formula, fallbackState);
  const conversionWarning = formula?.expression && numericFormulaNodeToTokens(formula.expression).isAdvanced
    ? 'Esta fórmula usa una estructura avanzada.'
    : '';
  const values = getFormulaValueTokens(tokenState);
  const operators = getFormulaOperatorTokens(tokenState);
  const [selectedValueId, setSelectedValueId] = useState(values[0]?.id ?? '');
  const [forcedGroup, setForcedGroup] = useState<FormulaGroup | undefined>(undefined);
  const [hiddenGroupKey, setHiddenGroupKey] = useState('');
  const [draggedPieceId, setDraggedPieceId] = useState('');
  const [hiddenParenthesisSide, setHiddenParenthesisSide] = useState<FormulaParenthesisSide | ''>('');
  const inferredGroup = tokenState.groups[0];
  const visibleForcedGroup = forcedGroup ? normalizeFormulaTokenState({ ...tokenState, groups: [forcedGroup] }).groups[0] : undefined;
  const visibleInferredGroup = inferredGroup && getFormulaGroupSignature(inferredGroup) !== hiddenGroupKey
    ? inferredGroup
    : undefined;
  const visibleGroup = visibleForcedGroup ?? visibleInferredGroup;
  const visibleTokenState = visibleGroup ? { ...tokenState, groups: [visibleGroup] } : { ...tokenState, groups: [] };
  const safeSelectedValue = values.find((value) => value.id === selectedValueId) ?? values[0];
  const formulaText = describeFormulaTokenState(visibleTokenState, inputColumns, hiddenParenthesisSide);
  const tokenWarning = hiddenParenthesisSide ? invalidParenthesesWarning : validateFormulaTokenState(visibleTokenState);
  const visibleWarning = warning || tokenWarning || conversionWarning;

  const commitState = (nextState: FormulaTokenState, nextSelectedValueId = selectedValueId, options: { keepHiddenGroup?: boolean } = {}) => {
    const nextValues = getFormulaValueTokens(nextState);
    const safeNextSelectedValueId = nextValues.some((value) => value.id === nextSelectedValueId)
      ? nextSelectedValueId
      : nextValues[0]?.id ?? '';
    if (!options.keepHiddenGroup) {
      setHiddenGroupKey('');
    }
    setHiddenParenthesisSide('');
    setSelectedValueId(safeNextSelectedValueId);
    onFormulaChange(tokenStateToNumericFormula(nextState));
  };

  const selectedValueIndex = safeSelectedValue ? values.findIndex((value) => value.id === safeSelectedValue.id) : -1;
  const hasCompleteParentheses = Boolean(visibleGroup && !hiddenParenthesisSide);
  const canGroupWithNext = safeSelectedValue && !hasCompleteParentheses && selectedValueIndex >= 0 && selectedValueIndex < values.length - 1;
  const handleDeleteValue = (valueId: string) => {
    setForcedGroup(undefined);
    commitState(removeFormulaValueToken(tokenState, valueId), selectedValueId === valueId ? '' : selectedValueId);
  };
  const handleAddParentheses = () => {
    if (!safeSelectedValue || !canGroupWithNext) {
      return;
    }

    if (visibleGroup && hiddenParenthesisSide) {
      setHiddenParenthesisSide('');
      commitState(visibleTokenState, safeSelectedValue.id);
      return;
    }

    const nextState = groupFormulaValueWithNext(tokenState, safeSelectedValue.id);
    setForcedGroup(nextState.groups[0]);
    commitState(nextState, safeSelectedValue.id);
  };
  const handleRemoveParenthesis = () => {
    if (!visibleGroup) {
      return;
    }

    setForcedGroup(undefined);
    setHiddenGroupKey(getFormulaGroupSignature(visibleGroup));
    commitState(clearFormulaGroup(visibleTokenState), safeSelectedValue?.id ?? '', { keepHiddenGroup: true });
  };
  const handleDropOnValue = (toValueId: string) => {
    if (!draggedPieceId || draggedPieceId === toValueId) {
      setDraggedPieceId('');
      return;
    }

    let nextState: FormulaTokenState | undefined;
    if (draggedPieceId === openParenthesisDragId) {
      nextState = moveFormulaGroupStartToValue(visibleTokenState, toValueId);
    } else if (draggedPieceId === closeParenthesisDragId) {
      nextState = moveFormulaGroupEndToValue(visibleTokenState, toValueId);
    } else {
      nextState = reorderFormulaValueToken(visibleTokenState, draggedPieceId, toValueId);
    }

    if (nextState === visibleTokenState) {
      setDraggedPieceId('');
      return;
    }

    setForcedGroup(nextState.groups[0]);
    commitState(nextState, draggedPieceId.startsWith('value-') ? `value-${getFormulaValueIndex(toValueId)}` : safeSelectedValue?.id);
    setDraggedPieceId('');
  };

  return (
    <div className="numericFormulaFields">
      <section className="recipeStudioSection recipeStudioSectionLight composePartsBuilder numericFormulaBuilderSection" aria-label="Editor de fórmula">
        <div className="numericFormulaLinearBuilder">
          <div className="numericFormulaBuilderIntro">
            <div className="composePartsBuilderTitle">
              <strong>Editor de fórmula</strong>
              <p className="composeStudioHint">Agregá valores y ajustá el operador entre cada uno.</p>
            </div>
          </div>
          <div className="numericFormulaFormulaActionsRow">
            <div className="numericFormulaHeader">
              <span className="labelWithInfo">
                <span>Fórmula</span>
                {visibleWarning ? <WarningTooltip content={visibleWarning} ariaLabel="Aviso de fórmula" /> : null}
              </span>
              <strong className="numericFormulaPreview" aria-label="Fórmula construida">{formulaText}</strong>
            </div>
            <div className="composeStudioActions">
              {!hasCompleteParentheses ? (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  className="composeStudioActionButton"
                  disabled={!canGroupWithNext}
                  title={!canGroupWithNext ? 'Seleccioná un valor con otro valor a la derecha.' : undefined}
                  onClick={handleAddParentheses}
                >
                  Agregar paréntesis
                </ActionButton>
              ) : null}
              <ActionButton
                action="add"
                variant="secondary"
                className="composeStudioActionButton"
                onClick={() => {
                  const nextState = addFormulaValueToken(visibleTokenState, createDefaultOperand(inputColumns, false, values.length));
                  const nextValues = getFormulaValueTokens(nextState);
                  const nextValue = nextValues[nextValues.length - 1];
                  setForcedGroup(nextState.groups[0]);
                  commitState(nextState, nextValue?.id);
                }}
              >
                Agregar valor
              </ActionButton>
            </div>
          </div>

          <div className="numericFormulaTokenList" aria-label="Valores y operadores de fórmula">
            {renderFormulaTokenSequence({
              values,
              operators,
              group: visibleGroup,
              safeSelectedValueId: safeSelectedValue?.id,
              inputColumns,
              canDeleteValue: values.length > 2,
              hiddenParenthesisSide,
              draggedPieceId,
              onSelectValue: setSelectedValueId,
              onDeleteValue: handleDeleteValue,
              onDragStartPiece: setDraggedPieceId,
              onDragEndPiece: () => setDraggedPieceId(''),
              onDropValue: handleDropOnValue,
              onRemoveParenthesis: handleRemoveParenthesis,
              onOperatorChange: (operatorId, nextOperator) => commitState(updateFormulaOperator(visibleTokenState, operatorId, nextOperator)),
            })}
          </div>
        </div>

        {showRoundingControl && onRoundingChange ? (
          <div className="numericFormulaFooter">
            <Dropdown
              className="compact recipeField numericFormulaRounding"
              label="Decimales / redondeo"
              value={String(rounding ?? 2)}
              options={[
                { value: 'none', label: 'Sin redondeo' },
                { value: '0', label: '0 decimales' },
                { value: '2', label: '2 decimales' },
                { value: '4', label: '4 decimales' },
              ]}
              scrollStrategy="close"
              onChange={(value) => onRoundingChange(parseRounding(value))}
            />
          </div>
        ) : null}
      </section>

      {safeSelectedValue ? (
        <section className="recipeStudioSection composeTokenInspector composeTokenInspectorFlat numericFormulaInspector" aria-label="Valor seleccionado">
            <div className="composeTokenInspectorHeader">
              <span>Valor seleccionado</span>
              <strong>{getFormulaValueLabel(selectedValueIndex)}</strong>
            </div>
            <div className="numericFormulaInspectorFields">
              <StepOperandFields
                label="Valor"
                operand={safeSelectedValue.operand}
                inputColumns={inputColumns}
                allowPreviousResult={allowPreviousResult}
                compatibilityHint={compatibilityHint}
                onChange={(operand) => commitState(updateFormulaValueOperand(tokenState, safeSelectedValue.id, operand), safeSelectedValue.id)}
              />
            </div>
          </section>
      ) : null}
    </div>
  );
}

function FormulaValueCard({
  value,
  index,
  selected,
  dragging,
  inputColumns,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  value: FormulaValueToken;
  index: number;
  selected: boolean;
  dragging: boolean;
  inputColumns: InputColumn[];
  onSelect: () => void;
  onDelete?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const kind = getFormulaValueKind(value.operand);
  const handleDragStart = (event: DragEvent<HTMLDivElement | HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', value.id);
    onDragStart();
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  return (
    <div
      className={`numericFormulaValueCard compositionTokenCard compositionToken-${kind}${selected ? ' selected' : ' unselected'}${dragging ? ' sortableDragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <button type="button" className={`compositionToken compositionToken-${kind}${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
        <span>{getFormulaValueLabel(index)}</span>
        <small>{describeOperand(value.operand, inputColumns)}</small>
      </button>
      <div className="compositionTokenActions">
        <button
          type="button"
          className="dragHandle numericFormulaDragHandle"
          aria-label={`Arrastrar valor ${index + 1}`}
          title="Arrastrar valor"
          draggable
          onClick={(event) => event.preventDefault()}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          <span aria-hidden="true">::</span>
        </button>
        {onDelete ? (
          <InfoTooltip content="Eliminar valor">
            <DeleteButton title="Eliminar valor" onClick={onDelete} />
          </InfoTooltip>
        ) : null}
      </div>
    </div>
  );
}

function FormulaParenthesisToken({
  side,
  dragging,
  onDragStart,
  onDragEnd,
  onRemove,
}: {
  side: FormulaParenthesisSide;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove: () => void;
}) {
  const symbol = side === 'open' ? '(' : ')';
  const label = side === 'open' ? 'apertura' : 'cierre';
  const dragId = side === 'open' ? openParenthesisDragId : closeParenthesisDragId;
  const handleDragStart = (event: DragEvent<HTMLDivElement | HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragId);
    onDragStart();
  };

  return (
    <div
      className={`numericFormulaParenthesisToken${dragging ? ' sortableDragging' : ''}`}
      aria-label={`Paréntesis de ${label}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <span className="numericFormulaParenthesisSymbol" aria-hidden="true">{symbol}</span>
      <div className="numericFormulaParenthesisActions">
        <button
          type="button"
          className="dragHandle numericFormulaDragHandle numericFormulaParenthesisHandle"
          aria-label={`Arrastrar paréntesis de ${label}`}
          title={`Arrastrar paréntesis de ${label}`}
          draggable
          onClick={(event) => event.preventDefault()}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          <AppIcon name="reorder" aria-hidden="true" focusable="false" />
        </button>
        <InfoTooltip content="Eliminar paréntesis">
          <DeleteButton title="Eliminar paréntesis" onClick={onRemove} />
        </InfoTooltip>
      </div>
    </div>
  );
}

function renderFormulaTokenSequence({
  values,
  operators,
  group,
  safeSelectedValueId,
  inputColumns,
  canDeleteValue,
  hiddenParenthesisSide,
  draggedPieceId,
  onSelectValue,
  onDeleteValue,
  onDragStartPiece,
  onDragEndPiece,
  onDropValue,
  onRemoveParenthesis,
  onOperatorChange,
}: {
  values: FormulaValueToken[];
  operators: ReturnType<typeof getFormulaOperatorTokens>;
  group: FormulaGroup | undefined;
  safeSelectedValueId: string | undefined;
  inputColumns: InputColumn[];
  canDeleteValue: boolean;
  hiddenParenthesisSide: FormulaParenthesisSide | '';
  draggedPieceId: string;
  onSelectValue: (valueId: string) => void;
  onDeleteValue: (valueId: string) => void;
  onDragStartPiece: (pieceId: string) => void;
  onDragEndPiece: () => void;
  onDropValue: (valueId: string) => void;
  onRemoveParenthesis: (side: FormulaParenthesisSide) => void;
  onOperatorChange: (operatorId: string, operator: NumericFormulaOperator) => void;
}) {
  const items: ReactNode[] = [];
  const groupStartIndex = group ? getFormulaValueIndex(group.startValueId) : -1;
  const groupEndIndex = group ? getFormulaValueIndex(group.endValueId) : -1;

  const renderCard = (value: FormulaValueToken, index: number) => (
    <FormulaValueCard
      key={value.id}
      value={value}
      index={index}
      selected={value.id === safeSelectedValueId}
      dragging={value.id === draggedPieceId}
      inputColumns={inputColumns}
      onSelect={() => onSelectValue(value.id)}
      onDelete={canDeleteValue ? () => onDeleteValue(value.id) : undefined}
      onDragStart={() => onDragStartPiece(value.id)}
      onDragEnd={onDragEndPiece}
      onDrop={() => onDropValue(value.id)}
    />
  );
  const renderParenthesis = (side: FormulaParenthesisSide) => (
    <FormulaParenthesisToken
      key={`parenthesis-${side}`}
      side={side}
      dragging={draggedPieceId === (side === 'open' ? openParenthesisDragId : closeParenthesisDragId)}
      onDragStart={() => onDragStartPiece(side === 'open' ? openParenthesisDragId : closeParenthesisDragId)}
      onDragEnd={onDragEndPiece}
      onRemove={() => onRemoveParenthesis(side)}
    />
  );
  const renderOperator = (operatorIndex: number) => {
    const operator = operators[operatorIndex];
    if (!operator) {
      return null;
    }

    return (
      <Dropdown<NumericFormulaOperator>
        key={operator.id}
        className="compact numericFormulaInlineOperator"
        label={`Operador ${operatorIndex + 1}`}
        value={operator.operator}
        options={operatorOptions}
        scrollStrategy="close"
        onChange={(nextOperator) => onOperatorChange(operator.id, nextOperator)}
      />
    );
  };

  values.forEach((value, index) => {
    if (group && !hiddenParenthesisSide && index === groupStartIndex && groupEndIndex > groupStartIndex) {
      const groupedItems: ReactNode[] = [renderParenthesis('open')];
      for (let groupIndex = groupStartIndex; groupIndex <= groupEndIndex; groupIndex += 1) {
        groupedItems.push(
          <div key={values[groupIndex].id} className="numericFormulaTokenSlot">
            {renderCard(values[groupIndex], groupIndex)}
          </div>,
        );
        if (groupIndex < groupEndIndex) {
          groupedItems.push(renderOperator(groupIndex));
        }
      }
      groupedItems.push(renderParenthesis('close'));
      items.push(
        <div key={group.id} className="numericFormulaGroupShell" aria-label="Grupo de fórmula">
          <span className="numericFormulaGroupChip">Grupo</span>
          {groupedItems}
        </div>,
      );
      if (operators[groupEndIndex]) {
        items.push(renderOperator(groupEndIndex));
      }
      return;
    }
    if (group && !hiddenParenthesisSide && index > groupStartIndex && index <= groupEndIndex) {
      return;
    }
    if (group && index === groupStartIndex && groupEndIndex > groupStartIndex && hiddenParenthesisSide !== 'open') {
      items.push(renderParenthesis('open'));
    }
    items.push(
      <div key={value.id} className="numericFormulaTokenSlot">
        {renderCard(value, index)}
      </div>,
    );
    if (group && index === groupEndIndex && groupEndIndex > groupStartIndex && hiddenParenthesisSide !== 'close') {
      items.push(renderParenthesis('close'));
    }
    if (operators[index]) {
      items.push(renderOperator(index));
    }
  });

  return items;
}

function describeFormulaTokenState(state: FormulaTokenState, inputColumns: InputColumn[], hiddenParenthesisSide: FormulaParenthesisSide | '' = '') {
  const values = getFormulaValueTokens(state);
  const operators = getFormulaOperatorTokens(state);
  const group = state.groups[0];

  return values.map((value, index) => {
    const parts = [
      group?.startValueId === value.id && hiddenParenthesisSide !== 'open' ? '(' : '',
      describeOperand(value.operand, inputColumns),
      group?.endValueId === value.id && hiddenParenthesisSide !== 'close' ? ')' : '',
      operators[index] ? ` ${formulaDisplayOperatorLabels[operators[index].operator]} ` : '',
    ];
    return parts.join('');
  }).join('');
}

export function createDefaultNumericFormula(inputColumns: InputColumn[], allowPreviousResult = false): NumericFormula {
  return tokenStateToNumericFormula(createDefaultFormulaTokenState(
    createDefaultOperand(inputColumns, allowPreviousResult, 0),
    createDefaultOperand(inputColumns, false, 1),
  ));
}

export function describeNumericFormula(node: NumericFormulaNode, inputColumns: InputColumn[]): string {
  if (node.kind === 'operand') {
    return describeOperand(node.operand, inputColumns);
  }

  const left = describeNumericFormula(node.left, inputColumns);
  const right = describeNumericFormula(node.right, inputColumns);
  return `${wrapFormulaSide(node.left, left, node.operator, 'left')} ${formulaDisplayOperatorLabels[node.operator]} ${wrapFormulaSide(node.right, right, node.operator, 'right')}`;
}

export function getNumericFormulaUiWarning(formula: NumericFormula | undefined): string {
  if (!formula?.expression) {
    return 'Completá la fórmula.';
  }

  const incompleteOperand = collectOperands(formula.expression).find(isIncompleteOperand);
  if (incompleteOperand) {
    return incompleteOperand.type === 'input' ? 'Seleccioná una columna válida.' : 'Completá la fórmula.';
  }

  const invalidFixedOperand = collectOperands(formula.expression)
    .filter((operand): operand is Extract<StepOperand, { type: 'fixedText' }> => operand.type === 'fixedText')
    .find((operand) => operand.value.trim() !== '' && getFixedNumericValue(operand) === null);
  if (invalidFixedOperand) {
    return 'El valor no es numérico.';
  }

  if (hasFixedZeroDivisor(formula.expression)) {
    return 'No se puede dividir por cero.';
  }

  return '';
}

function createDefaultOperand(inputColumns: InputColumn[], allowPreviousResult: boolean, inputColumnIndex = 0): StepOperand {
  if (allowPreviousResult) {
    return { type: 'previousResult' };
  }

  return inputColumns[inputColumnIndex]?.id
    ? { type: 'input', inputColumnId: inputColumns[inputColumnIndex].id }
    : { type: 'fixedText', value: '' };
}

function describeOperand(operandValue: StepOperand, inputColumns: InputColumn[]) {
  if (operandValue.type === 'previousResult') {
    return 'Resultado anterior';
  }

  if (operandValue.type === 'input') {
    const inputColumn = inputColumns.find((column) => column.id === operandValue.inputColumnId);
    return inputColumn ? getInputColumnLabel(inputColumn) : 'Columna';
  }

  if (operandValue.type === 'rangeText') {
    return operandValue.selectedText.trim() || 'Texto de rango';
  }

  return operandValue.value.trim() || 'Valor';
}

function getFormulaValueKind(operandValue: StepOperand) {
  if (operandValue.type === 'previousResult') {
    return 'previous';
  }

  if (operandValue.type === 'fixedText') {
    return 'text';
  }

  return 'input';
}

function getFormulaValueLabel(index: number) {
  return [
    'Primer valor',
    'Segundo valor',
    'Tercer valor',
    'Cuarto valor',
    'Quinto valor',
    'Sexto valor',
    'Séptimo valor',
    'Octavo valor',
    'Noveno valor',
    'Décimo valor',
  ][index] ?? `Valor ${index + 1}`;
}

function getFormulaGroupSignature(group: FormulaGroup) {
  return `${group.startValueId}:${group.endValueId}`;
}

function getFormulaValueIndex(valueId: string) {
  const rawIndex = Number(valueId.replace('value-', ''));
  return Number.isFinite(rawIndex) ? rawIndex : -1;
}

function wrapFormulaSide(
  node: NumericFormulaNode,
  text: string,
  parentOperator: NumericFormulaOperator,
  side: 'left' | 'right',
) {
  if (node.kind !== 'binary') {
    return text;
  }

  if (shouldWrapFormulaSide(node.operator, parentOperator, side)) {
    return `(${text})`;
  }

  return text;
}

function shouldWrapFormulaSide(operator: NumericFormulaOperator, parentOperator: NumericFormulaOperator, side: 'left' | 'right') {
  const precedence: Record<NumericFormulaOperator, number> = {
    add: 1,
    subtract: 1,
    multiply: 2,
    divide: 2,
  };

  if (precedence[operator] < precedence[parentOperator]) {
    return true;
  }

  return side === 'right' && (parentOperator === 'subtract' || parentOperator === 'divide') && precedence[operator] === precedence[parentOperator];
}

function collectOperands(node: NumericFormulaNode): StepOperand[] {
  if (node.kind === 'operand') {
    return [node.operand];
  }

  return [...collectOperands(node.left), ...collectOperands(node.right)];
}

function isIncompleteOperand(operandValue: StepOperand) {
  return (
    (operandValue.type === 'input' && !operandValue.inputColumnId)
    || (operandValue.type === 'fixedText' && operandValue.value.trim() === '' && !Number.isFinite(operandValue.numericFallback))
  );
}

function hasFixedZeroDivisor(node: NumericFormulaNode): boolean {
  if (node.kind === 'operand') {
    return false;
  }

  if (node.operator === 'divide' && node.right.kind === 'operand' && node.right.operand.type === 'fixedText') {
    return getFixedNumericValue(node.right.operand) === 0;
  }

  return hasFixedZeroDivisor(node.left) || hasFixedZeroDivisor(node.right);
}

function getFixedNumericValue(operandValue: Extract<StepOperand, { type: 'fixedText' }>) {
  const parsed = parseNumericValue(operandValue.value);
  if (parsed !== null) {
    return parsed;
  }

  return typeof operandValue.numericFallback === 'number' && Number.isFinite(operandValue.numericFallback)
    ? operandValue.numericFallback
    : null;
}
