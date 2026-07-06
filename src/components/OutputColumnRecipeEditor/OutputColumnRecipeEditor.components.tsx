import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import type { InputColumn, OutputColumn, OutputRecipe } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel, operationTypeLabel } from './OutputColumnRecipeEditor.constants';
import { getOutputRecipeTypeOptions, getOutputRecipeTypeSelectorValue } from './OutputColumnRecipeEditor.recipeHelpers';

export function RecipeMainFields({
  column,
  activeInputColumns,
  onTypeChange,
  onDirectInputColumnChange,
  onFixedTextChange,
}: {
  column: OutputColumn;
  activeInputColumns: InputColumn[];
  onTypeChange: (nextType: OutputRecipe['type']) => void;
  onDirectInputColumnChange: (inputColumnId: string) => void;
  onFixedTextChange: (value: string) => void;
}) {
  return (
    <div className="recipeMainFields">
      <Dropdown<OutputRecipe['type']>
        className="compact"
        label={operationTypeLabel}
        labelInfo={<InfoTooltip content="Definí cómo se va a llenar esta columna." />}
        scrollStrategy="close"
        value={getOutputRecipeTypeSelectorValue(column.recipe)}
        options={getOutputRecipeTypeOptions(column.recipe)}
        onChange={onTypeChange}
      />

      {column.recipe.type === 'direct' ? (
        <Dropdown
          className="compact"
          label="Columna de entrada"
          labelInfo={<InfoTooltip content="Elegí la columna del Excel que contiene este dato." />}
          value={column.recipe.inputColumnId}
          options={activeInputColumns.length === 0
            ? [{ value: '', label: noActiveColumnsLabel }]
            : activeInputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
          scrollStrategy="close"
          onChange={onDirectInputColumnChange}
        />
      ) : null}

      {column.recipe.type === 'fixedText' ? (
        <label className="field compact">
          <span className="labelWithInfo">
            <span>Texto fijo</span>
            <InfoTooltip content="Usa el mismo texto en todas las filas." />
          </span>
          <input value={column.recipe.value} onChange={(event) => onFixedTextChange(event.target.value)} />
        </label>
      ) : null}
    </div>
  );
}

export function CustomValueSummary({
  preview,
  partsSummary,
  adjustments,
  onEdit,
}: {
  preview: string;
  partsSummary: string;
  adjustments: string[];
  onEdit: () => void;
}) {
  const manualRangeAdjustment = adjustments.find((adjustment) => /^\d+ rangos?/i.test(adjustment));
  const rangeCount = manualRangeAdjustment?.match(/^\d+/)?.[0];
  const joinsValues = adjustments.some((adjustment) => adjustment.toLocaleLowerCase().includes('concatenar'));
  const operation = manualRangeAdjustment
    ? 'Valores por rangos'
    : joinsValues
      ? 'Unir valores'
      : adjustments.length > 0
        ? 'Transformar valor'
        : 'Crear valor personalizado';
  const description = manualRangeAdjustment
    ? 'Asigna valores según rangos de filas configurados.'
    : joinsValues
      ? 'Une partes configuradas para crear el valor final.'
      : adjustments.length > 0
        ? 'Aplica operaciones al valor configurado.'
        : 'Crea un valor a partir de los datos elegidos.';
  const reference = rangeCount
    ? `${rangeCount} ${rangeCount === '1' ? 'rango creado' : 'rangos creados'}`
    : preview
      ? `Vista previa: ${preview}`
      : partsSummary;

  return (
    <div className="recipeSubBlock constructorSummary">
      <div>
        <strong className="headingWithInfo">
          <span>Crear valor personalizado</span>
          <InfoTooltip content="Combina datos y transformaciones para crear este valor." />
        </strong>
        <dl className="customValueSummaryList">
          <div>
            <dt>Tipo de operación</dt>
            <dd>{operation}</dd>
          </div>
          <div>
            <dt>Qué hace</dt>
            <dd>{description}</dd>
          </div>
          <div>
            <dt>Referencia</dt>
            <dd>{reference}</dd>
          </div>
        </dl>
      </div>
      <ActionButton action="edit" variant="secondary" onClick={onEdit}>
        Editar
      </ActionButton>
    </div>
  );
}
