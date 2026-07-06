import type { OutputRecipe, RecipePart, StepSource, TransformStep } from '../../types/import';
import { getVisibleRecipeSteps } from './OutputColumnRecipeEditor.recipeHelpers';

type DeterministicValueState = { isDeterministic: boolean };

const deterministicValueState: DeterministicValueState = { isDeterministic: true };
const dynamicValueState: DeterministicValueState = { isDeterministic: false };

export function createPreviousResultDisplay(isDeterministic: boolean, value: string, examples: string[]) {
  if (isDeterministic) {
    return { value, helpText: 'Este valor viene del paso anterior.' };
  }

  return {
    value: 'Valor dinámico',
    helpText: examples.length > 0
      ? `Este valor cambia según la fila. Ejemplos:\n${examples.map((example) => `- ${example}`).join('\n')}`
      : 'Este valor cambia según la fila.',
  };
}

export function isDeterministicPreviousResultRecipe(recipe: Extract<OutputRecipe, { type: 'combine' }>) {
  const visibleSteps = getVisibleRecipeSteps(recipe);
  if (hasRowDependentControlFlow(visibleSteps)) {
    return false;
  }

  let state = getDeterministicRecipePartsState(recipe.parts, recipe.separator ?? '');
  for (const step of visibleSteps) state = getDeterministicStepState(step, state);
  return state.isDeterministic;
}

export function isDeterministicStepChain(source: StepSource, steps: TransformStep[], rangeTextIsDynamic = false) {
  let state = getDeterministicSourceState(source, dynamicValueState, rangeTextIsDynamic);
  for (const step of steps) state = getDeterministicStepState(step, state, rangeTextIsDynamic);
  return state.isDeterministic;
}

function hasRowDependentControlFlow(steps: TransformStep[]): boolean {
  return steps.some((step) => (
    Boolean(step.condition)
    || step.type === 'manualRange'
    || (step.type === 'concat' && (step.parts ?? []).some((part) => hasRowDependentControlFlow(part.steps ?? [])))
  ));
}

function getDeterministicRecipePartsState(parts: RecipePart[], separator: string): DeterministicValueState {
  for (const part of parts) {
    const sourceState = part.type === 'text' ? deterministicValueState : dynamicValueState;
    if (!getDeterministicStepsState(part.steps ?? [], sourceState).isDeterministic) return dynamicValueState;
  }
  return typeof separator === 'string' ? deterministicValueState : dynamicValueState;
}

function getDeterministicStepsState(steps: TransformStep[], initialState: DeterministicValueState, rangeTextIsDynamic = false) {
  let state = initialState;
  for (const step of steps) state = getDeterministicStepState(step, state, rangeTextIsDynamic);
  return state;
}

function getDeterministicStepState(step: TransformStep, currentState: DeterministicValueState, rangeTextIsDynamic = false): DeterministicValueState {
  if (step.condition || step.type === 'manualRange') return dynamicValueState;
  if (step.type === 'concat') {
    for (const part of step.parts ?? []) {
      const sourceState = getDeterministicSourceState(part.source, currentState, rangeTextIsDynamic);
      if (!getDeterministicStepsState(part.steps ?? [], sourceState, rangeTextIsDynamic).isDeterministic) return dynamicValueState;
    }
    return deterministicValueState;
  }
  if (step.type === 'numericOperation') {
    const leftState = getDeterministicSourceState(step.leftOperand ?? { type: 'previousResult' }, currentState, rangeTextIsDynamic);
    const rightState = getDeterministicSourceState(step.rightOperand ?? { type: 'fixedText', value: String(step.amount ?? '') }, currentState, rangeTextIsDynamic);
    return leftState.isDeterministic && rightState.isDeterministic ? deterministicValueState : dynamicValueState;
  }
  if (!isDeterministicStepType(step.type)) return dynamicValueState;
  return getDeterministicSourceState(step.source, currentState, rangeTextIsDynamic);
}

function getDeterministicSourceState(source: StepSource | undefined, previousState: DeterministicValueState, rangeTextIsDynamic = false): DeterministicValueState {
  if (!source || source.type === 'previousResult') return previousState;
  if (source.type === 'fixedText') return deterministicValueState;
  if (source.type === 'rangeText') return rangeTextIsDynamic ? dynamicValueState : deterministicValueState;
  return dynamicValueState;
}

function isDeterministicStepType(type: TransformStep['type']) {
  return ['noop', 'trim', 'uppercase', 'lowercase', 'addPrefix', 'addSuffix', 'removeText', 'replaceText', 'formatDate', 'extractNumber', 'toNumber', 'toText'].includes(type);
}
