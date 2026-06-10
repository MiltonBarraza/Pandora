import type { ConditionOperator, TransformCondition } from '../../types/import';
import { parseNumericValue } from './numericOperations';

type ConditionResult = {
  matches: boolean;
  warning?: string;
};

const numericOperators = new Set<ConditionOperator>([
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'numericEquals',
  'numericNotEquals',
]);

export function evaluateTransformCondition({
  inputValues,
  outputValues,
  condition,
}: {
  inputValues: Record<string, string>;
  outputValues: Record<string, string>;
  condition?: TransformCondition;
}): ConditionResult {
  if (!condition) {
    return { matches: true };
  }

  const values = condition.target === 'input' ? inputValues : outputValues;
  const value = values[condition.columnId] ?? '';

  if (numericOperators.has(condition.operator) || condition.valueType === 'number') {
    const result = evaluateNumericCondition(value, condition.operator, condition.value);
    return result.warning
      ? { matches: false, warning: 'No se pudo evaluar la condición de transformación' }
      : result;
  }

  return { matches: evaluateTextCondition(value, condition.operator, condition.value) };
}

export function evaluateTextCondition(value: string, operator: ConditionOperator, expectedValue = '') {
  const current = value.trim().toLowerCase();
  const expected = expectedValue.trim().toLowerCase();

  if (operator === 'contains') {
    return current.includes(expected);
  }

  if (operator === 'notContains') {
    return !current.includes(expected);
  }

  if (operator === 'equals') {
    return current === expected;
  }

  if (operator === 'notEquals') {
    return current !== expected;
  }

  if (operator === 'startsWith') {
    return current.startsWith(expected);
  }

  if (operator === 'endsWith') {
    return current.endsWith(expected);
  }

  if (operator === 'isEmpty') {
    return current === '';
  }

  if (operator === 'isNotEmpty') {
    return current !== '';
  }

  return false;
}

export function evaluateNumericCondition(value: string, operator: ConditionOperator, expectedValue = ''): ConditionResult {
  const current = parseNumericValue(value);
  const expected = parseNumericValue(expectedValue);

  if (current === null || expected === null) {
    return {
      matches: false,
      warning: 'No se pudo evaluar la condición numérica: valor inválido',
    };
  }

  if (operator === 'greaterThan') {
    return { matches: current > expected };
  }

  if (operator === 'greaterThanOrEqual') {
    return { matches: current >= expected };
  }

  if (operator === 'lessThan') {
    return { matches: current < expected };
  }

  if (operator === 'lessThanOrEqual') {
    return { matches: current <= expected };
  }

  if (operator === 'numericEquals') {
    return { matches: current === expected };
  }

  if (operator === 'numericNotEquals') {
    return { matches: current !== expected };
  }

  return { matches: false };
}

export function conditionNeedsValue(operator: ConditionOperator) {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}
