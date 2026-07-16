import { describe, expect, it } from 'vitest';
import type { StepOperand } from '../../../types/import';
import {
  addFormulaValueToken,
  createOperatorToken,
  createValueToken,
  createDefaultFormulaTokenState,
  getFormulaOperatorTokens,
  getFormulaValueTokens,
  groupFormulaValueWithNext,
  numericFormulaNodeToTokens,
  numericFormulaTokensToNode,
  tokenStateToExpression,
  updateFormulaOperator,
  validateNumericFormulaTokens,
} from '../numericFormulaTokens';

const operand = (inputColumnId: string): StepOperand => ({ type: 'input', inputColumnId });

describe('numericFormulaTokens', () => {
  it('adds a value with a default plus operator', () => {
    const state = addFormulaValueToken(createDefaultFormulaTokenState(operand('A'), operand('B')), operand('C'));

    expect(getFormulaValueTokens(state).map((token) => token.operand)).toEqual([operand('A'), operand('B'), operand('C')]);
    expect(getFormulaOperatorTokens(state).map((token) => token.operator)).toEqual(['add', 'add']);
  });

  it('converts linear tokens to a tree with numeric precedence', () => {
    let state = addFormulaValueToken(createDefaultFormulaTokenState(operand('A'), operand('B')), operand('C'));
    state = updateFormulaOperator(state, 'operator-0', 'add');
    state = updateFormulaOperator(state, 'operator-1', 'multiply');

    expect(tokenStateToExpression(state)).toMatchObject({
      operator: 'add',
      left: { operand: { inputColumnId: 'A' } },
      right: {
        operator: 'multiply',
        left: { operand: { inputColumnId: 'B' } },
        right: { operand: { inputColumnId: 'C' } },
      },
    });
  });

  it('converts A plus B times C tokens to a tree with numeric precedence', () => {
    const state = {
      tokens: [
        createValueToken(0, operand('A')),
        createOperatorToken(0, 'add' as const),
        createValueToken(1, operand('B')),
        createOperatorToken(1, 'multiply' as const),
        createValueToken(2, operand('C')),
      ],
      groups: [],
    };

    expect(numericFormulaTokensToNode(state.tokens, state.groups)).toMatchObject({
      operator: 'add',
      left: { operand: { inputColumnId: 'A' } },
      right: {
        operator: 'multiply',
        left: { operand: { inputColumnId: 'B' } },
        right: { operand: { inputColumnId: 'C' } },
      },
    });
  });

  it('converts a visual group to a nested formula node', () => {
    let state = addFormulaValueToken(createDefaultFormulaTokenState(operand('A'), operand('B')), operand('C'));
    state = addFormulaValueToken(state, operand('D'));
    state = updateFormulaOperator(state, 'operator-0', 'subtract');
    state = updateFormulaOperator(state, 'operator-1', 'multiply');
    state = updateFormulaOperator(state, 'operator-2', 'add');
    state = groupFormulaValueWithNext(state, 'value-1');

    expect(tokenStateToExpression(state)).toMatchObject({
      operator: 'add',
      left: {
        operator: 'subtract',
        left: { operand: { inputColumnId: 'A' } },
        right: {
          operator: 'multiply',
          left: { operand: { inputColumnId: 'B' } },
          right: { operand: { inputColumnId: 'C' } },
        },
      },
      right: { operand: { inputColumnId: 'D' } },
    });
  });

  it('converts a left visual group to a nested formula node', () => {
    let state = addFormulaValueToken(createDefaultFormulaTokenState(operand('A'), operand('B')), operand('C'));
    state = updateFormulaOperator(state, 'operator-0', 'add');
    state = updateFormulaOperator(state, 'operator-1', 'divide');
    state = groupFormulaValueWithNext(state, 'value-0');

    expect(tokenStateToExpression(state)).toMatchObject({
      operator: 'divide',
      left: {
        operator: 'add',
        left: { operand: { inputColumnId: 'A' } },
        right: { operand: { inputColumnId: 'B' } },
      },
      right: { operand: { inputColumnId: 'C' } },
    });
  });

  it('converts an existing simple tree to editable tokens', () => {
    const conversion = numericFormulaNodeToTokens({
      kind: 'binary',
      operator: 'add',
      left: { kind: 'operand', operand: operand('A') },
      right: { kind: 'operand', operand: operand('B') },
    });

    expect(conversion.isAdvanced).toBe(false);
    expect(getFormulaValueTokens(conversion.state).map((token) => token.operand)).toEqual([operand('A'), operand('B')]);
    expect(getFormulaOperatorTokens(conversion.state).map((token) => token.operator)).toEqual(['add']);
    expect(conversion.state.groups).toEqual([]);
  });

  it('converts an existing grouped tree to editable tokens with group metadata', () => {
    const conversion = numericFormulaNodeToTokens({
      kind: 'binary',
      operator: 'add',
      left: {
        kind: 'binary',
        operator: 'subtract',
        left: { kind: 'operand', operand: operand('A') },
        right: {
          kind: 'binary',
          operator: 'multiply',
          left: { kind: 'operand', operand: operand('B') },
          right: { kind: 'operand', operand: operand('C') },
        },
      },
      right: { kind: 'operand', operand: operand('D') },
    });

    expect(conversion.isAdvanced).toBe(false);
    expect(getFormulaOperatorTokens(conversion.state).map((token) => token.operator)).toEqual(['subtract', 'multiply', 'add']);
    expect(conversion.state.groups).toEqual([{ id: 'group-0', startValueId: 'value-1', endValueId: 'value-2' }]);
  });

  it('rejects invalid token order and unsupported group count', () => {
    expect(validateNumericFormulaTokens([
      createValueToken(0, operand('A')),
      createOperatorToken(0, 'add'),
      createOperatorToken(1, 'subtract'),
    ], [])).toBe('Completá la fórmula.');

    const state = addFormulaValueToken(addFormulaValueToken(createDefaultFormulaTokenState(operand('A'), operand('B')), operand('C')), operand('D'));
    expect(validateNumericFormulaTokens(state.tokens, [
      { id: 'group-0', startValueId: 'value-0', endValueId: 'value-1' },
      { id: 'group-1', startValueId: 'value-2', endValueId: 'value-3' },
    ])).toBe('Esta fórmula usa una estructura avanzada.');
  });
});
