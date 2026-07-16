import type { NumericFormula, NumericFormulaNode, NumericFormulaOperator, StepOperand } from '../../types/import';

export type FormulaValueToken = {
  id: string;
  kind: 'value';
  operand: StepOperand;
};

export type FormulaOperatorToken = {
  id: string;
  kind: 'operator';
  operator: NumericFormulaOperator;
};

export type FormulaToken = FormulaValueToken | FormulaOperatorToken;

export type FormulaGroup = {
  id: string;
  startValueId: string;
  endValueId: string;
};

export type FormulaTokenState = {
  tokens: FormulaToken[];
  groups: FormulaGroup[];
};

export type NumericFormulaTokenConversion = {
  state: FormulaTokenState;
  isAdvanced: boolean;
};

const operatorPrecedence: Record<NumericFormulaOperator, number> = {
  add: 1,
  subtract: 1,
  multiply: 2,
  divide: 2,
};

export function createDefaultFormulaTokenState(firstOperand: StepOperand, secondOperand: StepOperand): FormulaTokenState {
  return {
    tokens: [
      createValueToken(0, firstOperand),
      createOperatorToken(0, 'add'),
      createValueToken(1, secondOperand),
    ],
    groups: [],
  };
}

export function createValueToken(index: number, operand: StepOperand): FormulaValueToken {
  return {
    id: getValueTokenId(index),
    kind: 'value',
    operand,
  };
}

export function createOperatorToken(index: number, operator: NumericFormulaOperator): FormulaOperatorToken {
  return {
    id: getOperatorTokenId(index),
    kind: 'operator',
    operator,
  };
}

export function getValueTokenId(index: number) {
  return `value-${index}`;
}

export function getOperatorTokenId(index: number) {
  return `operator-${index}`;
}

export function getFormulaValueTokens(state: FormulaTokenState): FormulaValueToken[] {
  return state.tokens.filter((token): token is FormulaValueToken => token.kind === 'value');
}

export function getFormulaOperatorTokens(state: FormulaTokenState): FormulaOperatorToken[] {
  return state.tokens.filter((token): token is FormulaOperatorToken => token.kind === 'operator');
}

export function normalizeFormulaTokenState(state: FormulaTokenState): FormulaTokenState {
  const values = getFormulaValueTokens(state);
  const operators = getFormulaOperatorTokens(state);
  const tokens: FormulaToken[] = [];

  values.forEach((value, index) => {
    tokens.push(createValueToken(index, value.operand));
    if (index < values.length - 1) {
      tokens.push(createOperatorToken(index, operators[index]?.operator ?? 'add'));
    }
  });

  const normalizedValueIds = new Set(values.map((_, index) => getValueTokenId(index)));
  const groups = state.groups
    .map((group) => ({
      ...group,
      startValueId: normalizeValueId(group.startValueId, values.length),
      endValueId: normalizeValueId(group.endValueId, values.length),
    }))
    .filter((group) => (
      normalizedValueIds.has(group.startValueId)
      && normalizedValueIds.has(group.endValueId)
      && getValueTokenIndex(group.endValueId) > getValueTokenIndex(group.startValueId)
    ))
    .slice(0, 1);

  return { tokens, groups };
}

export function addFormulaValueToken(state: FormulaTokenState, operand: StepOperand): FormulaTokenState {
  const normalized = normalizeFormulaTokenState(state);
  const values = getFormulaValueTokens(normalized);

  return normalizeFormulaTokenState({
    ...normalized,
    tokens: [
      ...normalized.tokens,
      createOperatorToken(Math.max(0, values.length - 1), 'add'),
      createValueToken(values.length, operand),
    ],
  });
}

export function removeFormulaValueToken(state: FormulaTokenState, valueId: string): FormulaTokenState {
  const normalized = normalizeFormulaTokenState(state);
  const values = getFormulaValueTokens(normalized);

  if (values.length <= 2) {
    return normalized;
  }

  const nextValues = values.filter((value) => value.id !== valueId);
  const operators = getFormulaOperatorTokens(normalized);
  const removedIndex = Math.max(0, values.findIndex((value) => value.id === valueId));
  const nextOperators = operators.filter((_, index) => (
    removedIndex === 0 ? index !== 0 : index !== removedIndex - 1
  ));

  return normalizeFormulaTokenState({
    tokens: nextValues.flatMap((value, index) => (
      index < nextValues.length - 1
        ? [value, nextOperators[index] ?? createOperatorToken(index, 'add')]
        : [value]
    )),
    groups: normalized.groups.filter((group) => group.startValueId !== valueId && group.endValueId !== valueId),
  });
}

export function updateFormulaValueOperand(state: FormulaTokenState, valueId: string, operand: StepOperand): FormulaTokenState {
  return normalizeFormulaTokenState({
    ...state,
    tokens: state.tokens.map((token) => (
      token.kind === 'value' && token.id === valueId ? { ...token, operand } : token
    )),
  });
}

export function updateFormulaOperator(state: FormulaTokenState, operatorId: string, operator: NumericFormulaOperator): FormulaTokenState {
  return normalizeFormulaTokenState({
    ...state,
    tokens: state.tokens.map((token) => (
      token.kind === 'operator' && token.id === operatorId ? { ...token, operator } : token
    )),
  });
}

export function groupFormulaValueWithNext(state: FormulaTokenState, valueId: string): FormulaTokenState {
  const normalized = normalizeFormulaTokenState(state);
  const values = getFormulaValueTokens(normalized);
  const valueIndex = values.findIndex((value) => value.id === valueId);
  if (valueIndex < 0 || valueIndex >= values.length - 1) {
    return normalized;
  }

  return {
    ...normalized,
    groups: [{
      id: 'group-0',
      startValueId: values[valueIndex].id,
      endValueId: values[valueIndex + 1].id,
    }],
  };
}

export function clearFormulaGroup(state: FormulaTokenState): FormulaTokenState {
  return {
    ...state,
    groups: [],
  };
}

export function numericFormulaToTokenState(formula: NumericFormula | undefined, fallback: FormulaTokenState): FormulaTokenState {
  if (!formula?.expression) {
    return normalizeFormulaTokenState(fallback);
  }

  return numericFormulaNodeToTokens(formula.expression, fallback).state;
}

export function numericFormulaNodeToTokens(expression: NumericFormulaNode, fallback?: FormulaTokenState): NumericFormulaTokenConversion {
  const values: FormulaValueToken[] = [];
  const operators: FormulaOperatorToken[] = [];
  const groups: FormulaGroup[] = [];

  const visit = (node: NumericFormulaNode, parentOperator?: NumericFormulaOperator, side?: 'left' | 'right') => {
    const startIndex = values.length;
    if (node.kind === 'operand') {
      values.push(createValueToken(values.length, node.operand));
      return;
    }

    visit(node.left, node.operator, 'left');
    operators.push(createOperatorToken(operators.length, node.operator));
    visit(node.right, node.operator, 'right');

    const endIndex = values.length - 1;
    if (parentOperator && side && endIndex > startIndex && shouldCreateVisualGroup(node.operator, parentOperator, side)) {
      groups.push({
        id: `group-${groups.length}`,
        startValueId: getValueTokenId(startIndex),
        endValueId: getValueTokenId(endIndex),
      });
    }
  };

  visit(expression);

  if (values.length < 2) {
    return {
      state: normalizeFormulaTokenState(fallback ?? { tokens: values, groups: [] }),
      isAdvanced: false,
    };
  }

  return {
    state: normalizeFormulaTokenState({
      tokens: values.flatMap((value, index) => (
        index < values.length - 1
          ? [value, operators[index] ?? createOperatorToken(index, 'add')]
          : [value]
      )),
      groups,
    }),
    isAdvanced: groups.length > 1,
  };
}

export function numericFormulaTokensToNode(tokens: FormulaToken[], groups: FormulaGroup[]): NumericFormulaNode {
  return tokenStateToExpression({ tokens, groups });
}

export function tokenStateToNumericFormula(state: FormulaTokenState): NumericFormula {
  return {
    version: 1,
    expression: tokenStateToExpression(state),
  };
}

export function tokenStateToExpression(state: FormulaTokenState): NumericFormulaNode {
  const normalized = normalizeFormulaTokenState(state);
  const values = getFormulaValueTokens(normalized);
  const operators = getFormulaOperatorTokens(normalized);

  if (values.length === 0) {
    return { kind: 'operand', operand: { type: 'fixedText', value: '' } };
  }

  const group = normalized.groups[0];
  const groupStart = group ? getValueTokenIndex(group.startValueId) : -1;
  const groupEnd = group ? getValueTokenIndex(group.endValueId) : -1;
  const outputValues: NumericFormulaNode[] = [];
  const outputOperators: NumericFormulaOperator[] = [];

  let index = 0;
  while (index < values.length) {
    if (group && index === groupStart && groupEnd > groupStart) {
      outputValues.push(buildExpressionFromValueRange(values, operators, groupStart, groupEnd));
      index = groupEnd + 1;
      continue;
    }

    outputValues.push({ kind: 'operand', operand: values[index].operand });
    index += 1;
  }

  operators.forEach((operator, operatorIndex) => {
    if (group && operatorIndex >= groupStart && operatorIndex < groupEnd) {
      return;
    }

    outputOperators.push(operator.operator);
  });

  return buildExpressionFromNodes(outputValues, outputOperators);
}

export function validateFormulaTokenState(state: FormulaTokenState): string {
  return validateNumericFormulaTokens(state.tokens, state.groups);
}

export function validateNumericFormulaTokens(tokens: FormulaToken[], groups: FormulaGroup[]): string {
  if (tokens.length === 0) {
    return 'Agregá al menos dos valores.';
  }

  const startsWithValue = tokens[0]?.kind === 'value';
  const endsWithValue = tokens[tokens.length - 1]?.kind === 'value';
  const alternates = tokens.every((token, index) => token.kind === (index % 2 === 0 ? 'value' : 'operator'));
  if (!startsWithValue || !endsWithValue || !alternates) {
    return 'Completá la fórmula.';
  }

  if (groups.length > 1) {
    return 'Esta fórmula usa una estructura avanzada.';
  }

  const normalized = normalizeFormulaTokenState({ tokens, groups });
  const values = getFormulaValueTokens(normalized);
  if (values.length < 2) {
    return 'Agregá al menos dos valores.';
  }

  const emptyValue = values.find((value) => (
    (value.operand.type === 'input' && !value.operand.inputColumnId)
    || (value.operand.type === 'fixedText' && value.operand.value.trim() === '' && !Number.isFinite(value.operand.numericFallback))
  ));
  if (emptyValue) {
    return emptyValue.operand.type === 'input' ? 'Seleccioná una columna válida.' : 'Completá la fórmula.';
  }

  const invalidGroup = normalized.groups.find((group) => getValueTokenIndex(group.endValueId) <= getValueTokenIndex(group.startValueId));
  if (invalidGroup) {
    return 'El grupo de paréntesis no es válido.';
  }

  return '';
}

function buildExpressionFromValueRange(
  values: FormulaValueToken[],
  operators: FormulaOperatorToken[],
  startIndex: number,
  endIndex: number,
): NumericFormulaNode {
  const nodes = values.slice(startIndex, endIndex + 1).map((value): NumericFormulaNode => ({ kind: 'operand', operand: value.operand }));
  const rangeOperators = operators.slice(startIndex, endIndex).map((operator) => operator.operator);
  return buildExpressionFromNodes(nodes, rangeOperators);
}

function buildExpressionFromNodes(nodes: NumericFormulaNode[], operators: NumericFormulaOperator[]): NumericFormulaNode {
  const valueStack = [...nodes];
  const operatorStack = [...operators];

  applyOperatorsByPrecedence(valueStack, operatorStack, 2);
  applyOperatorsByPrecedence(valueStack, operatorStack, 1);

  return valueStack[0] ?? { kind: 'operand', operand: { type: 'fixedText', value: '' } };
}

function applyOperatorsByPrecedence(nodes: NumericFormulaNode[], operators: NumericFormulaOperator[], precedence: number) {
  for (let index = 0; index < operators.length;) {
    if (operatorPrecedence[operators[index]] !== precedence) {
      index += 1;
      continue;
    }

    const [operator] = operators.splice(index, 1);
    const left = nodes[index];
    const right = nodes[index + 1];
    nodes.splice(index, 2, {
      kind: 'binary',
      operator,
      left,
      right,
    });
  }
}

function shouldCreateVisualGroup(
  operator: NumericFormulaOperator,
  parentOperator: NumericFormulaOperator,
  side: 'left' | 'right',
) {
  if (operatorPrecedence[operator] < operatorPrecedence[parentOperator]) {
    return true;
  }

  if (side === 'right' && (parentOperator === 'subtract' || parentOperator === 'divide') && operatorPrecedence[operator] === operatorPrecedence[parentOperator]) {
    return true;
  }

  return side === 'right'
    && parentOperator === 'subtract'
    && operatorPrecedence[operator] > operatorPrecedence[parentOperator];
}

function normalizeValueId(valueId: string, valueCount: number) {
  return getValueTokenId(Math.min(Math.max(0, getValueTokenIndex(valueId)), Math.max(0, valueCount - 1)));
}

function getValueTokenIndex(valueId: string) {
  const rawIndex = Number(valueId.replace('value-', ''));
  return Number.isFinite(rawIndex) ? rawIndex : 0;
}
