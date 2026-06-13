import type {
  ConcatPart,
  ExportedImportSettings,
  InputColumnRemap,
  OutputRecipe,
  RecipePart,
  SettingsRemapResult,
  StepOperand,
  StepSource,
  TransformCondition,
  TransformStep,
} from '../../types/import';
import { isVirtualInputColumnId } from './inputColumnLabels';
import { collectSettingsReferences } from './settingsReferences';

export function applyInputColumnRemapToSettings(
  settings: ExportedImportSettings,
  remap: InputColumnRemap,
): SettingsRemapResult {
  const referencesBeforeRemap = collectSettingsReferences(settings).references.filter((reference) => reference.target === 'input');
  const nextSettings = cloneJson(settings);

  if (hasInputColumnRemap(remap)) {
    nextSettings.config.inputColumnAliases = remapInputColumnAliases(nextSettings.config.inputColumnAliases, remap);
    nextSettings.config.columnVisibility = nextSettings.config.columnVisibility.map((column) => ({
      ...column,
      inputColumnId: remapInputColumnId(column.inputColumnId, remap),
    }));
    nextSettings.config.inputIgnoreRules = nextSettings.config.inputIgnoreRules.map((rule) => ({
      ...rule,
      columnId: remapInputColumnId(rule.columnId, remap),
    }));
    nextSettings.config.inputNormalizationRules = nextSettings.config.inputNormalizationRules?.map((rule) => {
      if (rule.type === 'fillDown') {
        return {
          ...rule,
          columnId: remapInputColumnId(rule.columnId, remap),
        };
      }

      if (rule.type === 'rangeGroup') {
        return {
          ...rule,
          groupColumnId: remapInputColumnId(rule.groupColumnId, remap),
          groupStartCondition: {
            ...rule.groupStartCondition,
            columnId: remapInputColumnId(rule.groupStartCondition.columnId, remap),
          },
          applyToRowCondition: {
            ...rule.applyToRowCondition,
            columnId: remapInputColumnId(rule.applyToRowCondition.columnId, remap),
          },
          targetColumnId: remapInputColumnId(rule.targetColumnId, remap),
        };
      }

      return {
        ...rule,
        valueColumnId: remapInputColumnId(rule.valueColumnId, remap),
        captureCondition: {
          ...rule.captureCondition,
          columnId: remapInputColumnId(rule.captureCondition.columnId, remap),
        },
        targetColumnId: remapInputColumnId(rule.targetColumnId, remap),
      };
    });
    nextSettings.config.outputColumns = nextSettings.config.outputColumns.map((column) => ({
      ...column,
      recipe: remapOutputRecipe(column.recipe, remap),
    }));
  }

  return {
    settings: nextSettings,
    changedReferences: referencesBeforeRemap.filter((reference) => !isVirtualInputColumnId(reference.columnId) && hasOwnRemap(reference.columnId, remap) && remap[reference.columnId] !== reference.columnId),
    unresolvedReferences: referencesBeforeRemap.filter((reference) => isUnresolvedInputReference(reference.columnId, settings, remap)),
  };
}

export function remapInputColumnId(columnId: string, remap: InputColumnRemap) {
  if (isVirtualInputColumnId(columnId)) {
    return columnId;
  }

  return hasOwnRemap(columnId, remap) ? remap[columnId] : columnId;
}

export function hasInputColumnRemap(remap: InputColumnRemap) {
  return Object.keys(remap).length > 0;
}

function remapOutputRecipe(recipe: OutputRecipe, remap: InputColumnRemap): OutputRecipe {
  if (recipe.type === 'direct') {
    return {
      ...recipe,
      inputColumnId: remapInputColumnId(recipe.inputColumnId, remap),
      steps: remapTransformSteps(recipe.steps, remap),
    };
  }

  if (recipe.type === 'fixedText') {
    return {
      ...recipe,
      steps: remapTransformSteps(recipe.steps, remap),
    };
  }

  if (recipe.type === 'combine') {
    return {
      ...recipe,
      parts: recipe.parts.map((part) => remapRecipePart(part, remap)),
      steps: remapTransformSteps(recipe.steps, remap),
    };
  }

  return recipe;
}

function remapRecipePart(part: RecipePart, remap: InputColumnRemap): RecipePart {
  if (part.type === 'input') {
    return {
      ...part,
      inputColumnId: remapInputColumnId(part.inputColumnId, remap),
      steps: remapTransformSteps(part.steps, remap),
    };
  }

  return {
    ...part,
    steps: remapTransformSteps(part.steps, remap),
  };
}

function remapTransformSteps(steps: TransformStep[] | undefined, remap: InputColumnRemap) {
  return steps?.map((step) => remapTransformStep(step, remap));
}

function remapTransformStep(step: TransformStep, remap: InputColumnRemap): TransformStep {
  return {
    ...step,
    source: remapStepSource(step.source, remap),
    leftOperand: remapStepOperand(step.leftOperand, remap),
    rightOperand: remapStepOperand(step.rightOperand, remap),
    condition: remapCondition(step.condition, remap),
    parts: step.parts?.map((part) => remapConcatPart(part, remap)),
  };
}

function remapConcatPart(part: ConcatPart, remap: InputColumnRemap): ConcatPart {
  return {
    ...part,
    source: remapStepSource(part.source, remap) ?? part.source,
    steps: remapTransformSteps(part.steps, remap),
  };
}

function remapStepSource<TSource extends StepSource | undefined>(source: TSource, remap: InputColumnRemap): TSource {
  if (source?.type !== 'input') {
    return source;
  }

  return {
    ...source,
    inputColumnId: remapInputColumnId(source.inputColumnId, remap),
  } as TSource;
}

function remapStepOperand<TOperand extends StepOperand | undefined>(operand: TOperand, remap: InputColumnRemap): TOperand {
  if (operand?.type !== 'input') {
    return operand;
  }

  return {
    ...operand,
    inputColumnId: remapInputColumnId(operand.inputColumnId, remap),
  } as TOperand;
}

function remapCondition<TCondition extends TransformCondition | undefined>(condition: TCondition, remap: InputColumnRemap): TCondition {
  if (condition?.target !== 'input') {
    return condition;
  }

  return {
    ...condition,
    columnId: remapInputColumnId(condition.columnId, remap),
  } as TCondition;
}

function remapInputColumnAliases(inputColumnAliases: Record<string, string>, remap: InputColumnRemap) {
  return Object.fromEntries(
    Object.entries(inputColumnAliases).map(([columnId, alias]) => [
      remapInputColumnId(columnId, remap),
      alias,
    ]),
  );
}

function hasOwnRemap(columnId: string, remap: InputColumnRemap) {
  return Object.prototype.hasOwnProperty.call(remap, columnId);
}

function isUnresolvedInputReference(columnId: string, settings: ExportedImportSettings, remap: InputColumnRemap) {
  if (isVirtualInputColumnId(columnId)) {
    return !settings.config.virtualInputColumns?.some((column) => column.id === columnId);
  }

  return !hasOwnRemap(columnId, remap);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
