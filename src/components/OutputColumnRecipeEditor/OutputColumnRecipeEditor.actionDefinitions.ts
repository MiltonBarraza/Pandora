import type { NumericOperation, TransformStep, TransformStepMode, TransformStepType } from '../../types/import';
import { pickCellTextLabel, pickColumnTextLabel, useValueAsIsLabel } from './OutputColumnRecipeEditor.constants';
import type { VisibleStepAction } from './OutputColumnRecipeEditor.stepPolicy';

export const previousResultSourceLabel = 'Resultado del paso anterior';
export const previousResultActionLabel = 'Usar resultado anterior';
export const previousResultFieldLabel = 'Resultado anterior';

export const recipeStepModeLabels: Record<TransformStepMode, string> = {
  text: 'Trabajar con texto',
  number: 'Trabajar con números',
  conversion: 'Conversión',
  date: 'Trabajar con fechas',
  manualRange: 'Trabajar con rangos',
};

export const recipeStepActionLabels: Record<Exclude<VisibleStepAction, 'unconfigured'>, string> = {
  useValueAsIs: useValueAsIsLabel,
  useInputColumn: 'Usar columna de entrada',
  useFixedText: 'Usar texto fijo',
  pickColumnText: pickColumnTextLabel,
  useNumberInputColumn: 'Usar número desde columna',
  useFixedNumber: 'Usar número fijo',
  pickNumberCell: 'Elegir número desde celda',
  useDateInputColumn: 'Usar fecha desde columna',
  useFixedDate: 'Usar fecha fija',
  pickDateCell: 'Elegir fecha desde celda',
  useRangeText: 'Texto encontrado en el rango',
  usePreviousResult: previousResultActionLabel,
  trim: 'Limpiar espacios',
  uppercase: 'Convertir a mayúsculas',
  lowercase: 'Convertir a minúsculas',
  addPrefix: 'Agregar prefijo',
  addSuffix: 'Agregar sufijo',
  removeText: 'Quitar texto',
  replaceText: 'Reemplazar texto',
  concat: 'Concatenar',
  numericFormula: 'Calcular fórmula',
  numericOperation: 'Operación numérica',
  extractNumber: 'Usar número del texto',
  toNumber: 'Convertir a número',
  toText: 'Convertir a texto',
  formatDate: 'Formatear fecha',
  manualRange: recipeStepModeLabels.manualRange,
};

export const recipeStepTypeLabels: Record<TransformStepType, string> = {
  noop: recipeStepActionLabels.useValueAsIs,
  trim: recipeStepActionLabels.trim,
  uppercase: recipeStepActionLabels.uppercase,
  lowercase: recipeStepActionLabels.lowercase,
  addPrefix: recipeStepActionLabels.addPrefix,
  addSuffix: recipeStepActionLabels.addSuffix,
  removeText: recipeStepActionLabels.removeText,
  replaceText: recipeStepActionLabels.replaceText,
  manualRange: recipeStepActionLabels.manualRange,
  concat: recipeStepActionLabels.concat,
  extractNumber: recipeStepActionLabels.extractNumber,
  toNumber: recipeStepActionLabels.toNumber,
  toText: recipeStepActionLabels.toText,
  formatDate: recipeStepActionLabels.formatDate,
  numericFormula: recipeStepActionLabels.numericFormula,
  numericOperation: recipeStepActionLabels.numericOperation,
};

export const numericOperationLabels: Record<NonNullable<TransformStep['operation']>, string> = {
  addPercentage: 'Sumar %',
  subtractPercentage: 'Restar %',
  removeIncludedPercentage: 'Quitar % incluido',
};

export const cellValuePickerActionLabels = {
  text: pickCellTextLabel,
  number: 'Elegir valor desde celda',
  date: 'Elegir fecha desde celda',
} as const;

export function getRecipeStepModeLabel(mode: TransformStepMode) {
  return recipeStepModeLabels[mode];
}

export function getRecipeStepActionLabel(action: Exclude<VisibleStepAction, 'unconfigured'>) {
  return recipeStepActionLabels[action];
}

export function getNumericOperationLabel(operation: NumericOperation) {
  return numericOperationLabels[operation];
}
