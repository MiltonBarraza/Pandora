import type { NormalizedRow, TransformationCondition, TransformationRule } from '../../types/import';
import { evaluateCondition } from './evaluateCondition';
import { normalizeWhitespace } from './normalizeText';
import { applyNumericOperation, formatNumericResult, parseNumericValue } from './numericOperations';

export function applyTransformations(row: NormalizedRow, rules: TransformationRule[]): NormalizedRow {
  const values = { ...row.values };
  const warnings = [...(row.warnings ?? [])];

  rules.forEach((rule) => {
    const conditionResult = evaluateCondition(values, normalizeCondition(rule.condition, rule.sourceColumn));
    if (conditionResult.warning) {
      warnings.push(conditionResult.warning);
    }
    if (!conditionResult.matches) {
      return;
    }

    if (rule.type === 'numericOperation') {
      const warning = applyNumericRule(values, rule);
      if (warning) {
        warnings.push(warning);
      }
      return;
    }

    const sourceValue = values[rule.sourceColumn] ?? '';
    const currentTargetValue = values[rule.targetCategoryId] ?? sourceValue;
    values[rule.targetCategoryId] = applyRule(currentTargetValue, sourceValue, values, rule);
  });

  return { ...row, values, warnings };
}

function applyNumericRule(values: Record<string, string>, rule: TransformationRule): string | null {
  const config = rule.numericConfig;
  if (!config) {
    return null;
  }

  const sourceValue = values[rule.sourceColumn] ?? '';
  const targetCategoryId = config.outputMode === 'newColumn'
    ? config.outputCategoryId ?? rule.targetCategoryId
    : rule.sourceColumn;

  if (isBlank(sourceValue) && !rule.applyToEmptyValues) {
    return null;
  }

  const parsedSource = parseNumericValue(sourceValue);
  if (parsedSource === null) {
    return 'No se pudo aplicar operación numérica: valor inválido';
  }

  if (config.operation === 'divide' && config.amount === 0) {
    return 'No se puede dividir por cero';
  }

  const result = applyNumericOperation(parsedSource, config.operation, config.amount);
  values[targetCategoryId] = formatNumericResult(result, config.rounding ?? 2);
  return null;
}

function applyRule(
  currentValue: string,
  sourceValue: string,
  values: Record<string, string>,
  rule: TransformationRule,
): string {
  switch (rule.type) {
    case 'addPrefix':
      if (isBlank(currentValue) && !rule.applyToEmptyValues) {
        return currentValue;
      }
      return `${rule.value ?? ''}${currentValue}`;
    case 'addSuffix':
      if (isBlank(currentValue) && !rule.applyToEmptyValues) {
        return currentValue;
      }
      return `${currentValue}${rule.value ?? ''}`;
    case 'removeText':
      return currentValue.split(rule.value ?? '').join('');
    case 'replaceText':
      return currentValue.split(rule.searchValue ?? '').join(rule.replaceValue ?? '');
    case 'trim':
      return normalizeWhitespace(currentValue);
    case 'uppercase':
      return currentValue.toUpperCase();
    case 'lowercase':
      return currentValue.toLowerCase();
    case 'conditionalPrefix':
      if (isBlank(currentValue) && !rule.applyToEmptyValues) {
        return currentValue;
      }
      return `${matchesCondition(sourceValue, rule.condition) ? rule.value ?? '' : rule.replaceValue ?? ''}${currentValue}`;
    case 'copyColumn':
      return sourceValue;
    case 'combineColumns': {
      const secondaryValue = values[rule.secondarySourceColumn ?? ''] ?? '';
      if (isBlank(sourceValue) && isBlank(secondaryValue) && !rule.applyToEmptyValues) {
        return currentValue;
      }
      return [sourceValue, secondaryValue].filter(Boolean).join(rule.value ?? ' ');
    }
    default:
      return currentValue;
  }
}

function isBlank(value: string) {
  return value.trim() === '';
}

function matchesCondition(value: string, condition?: TransformationCondition) {
  if (!condition) {
    return false;
  }

  if (condition.operator === 'startsWith') {
    return value.startsWith(condition.value ?? '');
  }

  if (condition.operator === 'contains') {
    return value.includes(condition.value ?? '');
  }

  return value === (condition.value ?? '');
}

function normalizeCondition(condition: TransformationCondition | undefined, fallbackSourceColumn: string) {
  if (!condition) {
    return undefined;
  }

  const legacyCondition = condition as TransformationCondition & { type?: 'startsWith' | 'contains' | 'equals' };
  return {
    sourceColumn: condition.sourceColumn ?? fallbackSourceColumn,
    operator: condition.operator ?? legacyCondition.type ?? 'contains',
    value: condition.value,
    valueType: condition.valueType,
  };
}
