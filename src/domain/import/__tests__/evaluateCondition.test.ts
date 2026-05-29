import { describe, expect, it } from 'vitest';
import { evaluateTextCondition, evaluateTransformCondition } from '../evaluateCondition';

describe('evaluateCondition', () => {
  it('evaluates text conditions', () => {
    expect(evaluateTextCondition('Pintura Latex', 'contains', 'latex')).toBe(true);
    expect(evaluateTextCondition('Pintura Latex', 'notContains', 'madera')).toBe(true);
    expect(evaluateTextCondition('ABC123', 'equals', 'abc123')).toBe(true);
    expect(evaluateTextCondition('ABC123', 'notEquals', 'XYZ')).toBe(true);
    expect(evaluateTextCondition('ABC123', 'startsWith', 'ABC')).toBe(true);
    expect(evaluateTextCondition('ABC123', 'endsWith', '123')).toBe(true);
    expect(evaluateTextCondition('', 'isEmpty')).toBe(true);
    expect(evaluateTextCondition('x', 'isNotEmpty')).toBe(true);
  });

  it('evaluates transform conditions against input and output values', () => {
    expect(
      evaluateTransformCondition({
        inputValues: { code: 'ABC123', price: '$ 1.200,50' },
        outputValues: { adjusted: '1500' },
        condition: { target: 'input', columnId: 'code', operator: 'startsWith', value: 'ABC' },
      }),
    ).toEqual({ matches: true });

    expect(
      evaluateTransformCondition({
        inputValues: { code: 'ABC123' },
        outputValues: { adjusted: '1500' },
        condition: { target: 'output', columnId: 'adjusted', operator: 'greaterThan', value: '1000', valueType: 'number' },
      }),
    ).toEqual({ matches: true });
  });

  it('returns warning when numeric transform condition cannot be evaluated', () => {
    expect(
      evaluateTransformCondition({
        inputValues: { price: 'abc' },
        outputValues: {},
        condition: { target: 'input', columnId: 'price', operator: 'greaterThan', value: '1000', valueType: 'number' },
      }),
    ).toEqual({
      matches: false,
      warning: 'No se pudo evaluar la condicion de transformacion',
    });
  });
});
