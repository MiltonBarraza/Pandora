import { useMemo, useState } from 'react';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { parseNumericValue } from '../../domain/import/numericOperations';
import type { InputColumn, NumericFormula, NumericFormulaNode, NumericFormulaOperator, StepOperand, TransformStep } from '../../types/import';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
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
  numericFormulaNodeToTokens,
  numericFormulaToTokenState,
  removeFormulaValueToken,
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
  rounding: TransformStep['rounding'];
  inputColumns: InputColumn[];
  allowPreviousResult: boolean;
  compatibilityHint?: string;
  warning?: string;
  onFormulaChange: (formula: NumericFormula) => void;
  onRoundingChange: (rounding: TransformStep['rounding']) => void;
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

export function NumericFormulaEditor({
  formula,
  rounding,
  inputColumns,
  allowPreviousResult,
  compatibilityHint = '',
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
  const safeSelectedValue = values.find((value) => value.id === selectedValueId) ?? values[0];
  const formulaText = describeFormulaTokenState(tokenState, inputColumns);
  const tokenWarning = validateFormulaTokenState(tokenState);
  const visibleWarning = warning || tokenWarning || conversionWarning;

  const commitState = (nextState: FormulaTokenState, nextSelectedValueId = selectedValueId) => {
    const nextValues = getFormulaValueTokens(nextState);
    const safeNextSelectedValueId = nextValues.some((value) => value.id === nextSelectedValueId)
      ? nextSelectedValueId
      : nextValues[0]?.id ?? '';
    setSelectedValueId(safeNextSelectedValueId);
    onFormulaChange(tokenStateToNumericFormula(nextState));
  };

  const selectedValueIndex = safeSelectedValue ? values.findIndex((value) => value.id === safeSelectedValue.id) : -1;
  const canGroupWithNext = safeSelectedValue && selectedValueIndex >= 0 && selectedValueIndex < values.length - 1;
  const canDeleteSelectedValue = safeSelectedValue && values.length > 2;
  const activeGroup = getGroupForValue(tokenState.groups, safeSelectedValue?.id ?? '');

  return (
    <div className="numericFormulaFields">
      <section className="recipeStudioSection recipeStudioSectionLight composePartsBuilder numericFormulaBuilderSection" aria-label="Editor de fórmula">
        <div className="numericFormulaHeader">
          <span className="labelWithInfo">
            <span>Fórmula</span>
            {visibleWarning ? <WarningTooltip content={visibleWarning} ariaLabel="Aviso de fórmula" /> : null}
          </span>
          <strong className="numericFormulaPreview" aria-label="Fórmula construida">{formulaText}</strong>
        </div>

        <div className="numericFormulaLinearBuilder">
          <div className="composePartsBuilderHeader">
            <div className="composePartsBuilderTitle">
              <strong>Editor de fórmula</strong>
              <p className="composeStudioHint">Agregá valores y ajustá el operador entre cada uno.</p>
            </div>
            <div className="composeStudioActions">
              <ActionButton
                action="add"
                variant="secondary"
                className="composeStudioActionButton"
                onClick={() => {
                  const nextState = addFormulaValueToken(tokenState, createDefaultOperand(inputColumns, false, values.length));
                  const nextValues = getFormulaValueTokens(nextState);
                  const nextValue = nextValues[nextValues.length - 1];
                  commitState(nextState, nextValue?.id);
                }}
              >
                Agregar valor
              </ActionButton>
            </div>
          </div>

          <div className="numericFormulaTokenList" aria-label="Valores y operadores de fórmula">
            {values.map((value, index) => {
              const groupStart = tokenState.groups.some((group) => group.startValueId === value.id);
              const groupEnd = tokenState.groups.some((group) => group.endValueId === value.id);
              const operator = operators[index];
              return (
                <div key={value.id} className="numericFormulaTokenSlot">
                  {groupStart ? <span className="numericFormulaParen" aria-hidden="true">(</span> : null}
                  <FormulaValueCard
                    value={value}
                    index={index}
                    selected={value.id === safeSelectedValue?.id}
                    inputColumns={inputColumns}
                    onSelect={() => setSelectedValueId(value.id)}
                  />
                  {groupEnd ? <span className="numericFormulaParen" aria-hidden="true">)</span> : null}
                  {operator ? (
                    <Dropdown<NumericFormulaOperator>
                      className="compact numericFormulaInlineOperator"
                      label={`Operador ${index + 1}`}
                      value={operator.operator}
                      options={operatorOptions}
                      scrollStrategy="close"
                      onChange={(nextOperator) => commitState(updateFormulaOperator(tokenState, operator.id, nextOperator))}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

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
            <div className="numericFormulaInspectorActions">
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={!canGroupWithNext}
                onClick={() => safeSelectedValue && commitState(groupFormulaValueWithNext(tokenState, safeSelectedValue.id), safeSelectedValue.id)}
              >
                Agrupar con siguiente
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={!activeGroup}
                onClick={() => commitState(clearFormulaGroup(tokenState), safeSelectedValue.id)}
              >
                Quitar grupo
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={!canDeleteSelectedValue}
                onClick={() => safeSelectedValue && commitState(removeFormulaValueToken(tokenState, safeSelectedValue.id))}
              >
                Eliminar valor
              </ActionButton>
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
  inputColumns,
  onSelect,
}: {
  value: FormulaValueToken;
  index: number;
  selected: boolean;
  inputColumns: InputColumn[];
  onSelect: () => void;
}) {
  const kind = getFormulaValueKind(value.operand);
  return (
    <div className={`numericFormulaValueCard compositionTokenCard compositionToken-${kind}${selected ? ' selected' : ' unselected'}`}>
      <button type="button" className={`compositionToken compositionToken-${kind}${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
        <span>{getFormulaValueLabel(index)}</span>
        <small>{describeOperand(value.operand, inputColumns)}</small>
      </button>
    </div>
  );
}

function describeFormulaTokenState(state: FormulaTokenState, inputColumns: InputColumn[]) {
  const values = getFormulaValueTokens(state);
  const operators = getFormulaOperatorTokens(state);
  const group = state.groups[0];

  return values.map((value, index) => {
    const parts = [
      group?.startValueId === value.id ? '(' : '',
      describeOperand(value.operand, inputColumns),
      group?.endValueId === value.id ? ')' : '',
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

function getGroupForValue(groups: FormulaGroup[], valueId: string) {
  return groups.find((group) => group.startValueId === valueId || group.endValueId === valueId);
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
