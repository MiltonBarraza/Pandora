import type { ConcatPart, NumericFormula, NumericFormulaNode, OutputColumn, OutputRecipe, RangeValueRecipe, RecipePart, TransformStep } from '../../types/import';

export function duplicateOutputColumn(column: OutputColumn): OutputColumn {
  return {
    id: crypto.randomUUID(),
    label: `${column.label || 'Sin nombre'} copia`,
    order: column.order,
    enabled: true,
    recipe: cloneRecipeWithNewIds(column.recipe),
  };
}

function cloneRecipeWithNewIds(recipe: OutputRecipe): OutputRecipe {
  if (recipe.type === 'combine') {
    return {
      ...recipe,
      parts: recipe.parts.map(clonePartWithNewIds),
      steps: cloneStepsWithNewIds(recipe.steps),
    };
  }

  if (recipe.type === 'manualRange') {
    return {
      ...recipe,
      ranges: cloneManualRangesWithNewIds(recipe.ranges),
      condition: recipe.condition ? { ...recipe.condition } : undefined,
    };
  }

  if ('steps' in recipe) {
    return {
      ...recipe,
      steps: cloneStepsWithNewIds(recipe.steps),
    };
  }

  return { ...recipe };
}

function clonePartWithNewIds(part: RecipePart): RecipePart {
  if (part.type === 'input') {
    return {
      ...part,
      id: crypto.randomUUID(),
      steps: cloneStepsWithNewIds(part.steps),
    };
  }

  return {
    ...part,
    id: crypto.randomUUID(),
    steps: cloneStepsWithNewIds(part.steps),
  };
}

function cloneManualRangesWithNewIds(ranges: Extract<OutputRecipe, { type: 'manualRange' }>['ranges']) {
  return ranges.map((range) => ({
    ...range,
    id: crypto.randomUUID(),
    valueRecipe: cloneRangeValueRecipeWithNewIds(range.valueRecipe),
    valueSource: range.valueSource ? { ...range.valueSource } : undefined,
  }));
}

function cloneStepsWithNewIds(steps?: TransformStep[]): TransformStep[] | undefined {
  return steps?.map((step) => ({
    ...step,
    id: crypto.randomUUID(),
    source: step.source ? { ...step.source } : undefined,
    leftOperand: step.leftOperand ? { ...step.leftOperand } : undefined,
    rightOperand: step.rightOperand ? { ...step.rightOperand } : undefined,
    formula: cloneNumericFormula(step.formula),
    parts: cloneConcatPartsWithNewIds(step.parts),
    ranges: step.ranges ? cloneManualRangesWithNewIds(step.ranges) : undefined,
    manualRangeCondition: step.manualRangeCondition ? { ...step.manualRangeCondition } : undefined,
    condition: step.condition ? { ...step.condition } : undefined,
  }));
}

function cloneNumericFormula(formula?: NumericFormula): NumericFormula | undefined {
  if (!formula) {
    return undefined;
  }

  return {
    ...formula,
    expression: cloneNumericFormulaNode(formula.expression),
    displayGroups: formula.displayGroups?.map((group) => ({ ...group })),
  };
}

function cloneNumericFormulaNode(node: NumericFormulaNode): NumericFormulaNode {
  if (node.kind === 'operand') {
    return {
      ...node,
      operand: { ...node.operand },
    };
  }

  return {
    ...node,
    left: cloneNumericFormulaNode(node.left),
    right: cloneNumericFormulaNode(node.right),
  };
}

function cloneRangeValueRecipeWithNewIds(recipe?: RangeValueRecipe): RangeValueRecipe | undefined {
  if (!recipe) {
    return undefined;
  }

  return {
    source: { ...recipe.source },
    steps: cloneStepsWithNewIds(recipe.steps),
  };
}

function cloneConcatPartsWithNewIds(parts?: ConcatPart[]): ConcatPart[] | undefined {
  return parts?.map((part) => ({
    ...part,
    id: crypto.randomUUID(),
    source: { ...part.source },
    steps: cloneStepsWithNewIds(part.steps),
  }));
}
