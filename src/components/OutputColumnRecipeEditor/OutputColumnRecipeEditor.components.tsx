import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import type { InputColumn, OutputColumn, OutputRecipe } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { noActiveColumnsLabel, recipeIntentLabel } from './OutputColumnRecipeEditor.constants';
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
        label={recipeIntentLabel}
        labelInfo={<InfoTooltip content="Elegí si querés copiar una columna, escribir un texto fijo o armar un valor con reglas." />}
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
            <InfoTooltip content="Usá texto fijo cuando todas las filas deban mostrar exactamente este valor." />
          </span>
          <input value={column.recipe.value} onChange={(event) => onFixedTextChange(event.target.value)} />
        </label>
      ) : null}
    </div>
  );
}

export function CustomValueSummary({
  preview,
  partsLabel,
  partsSummary,
  adjustments,
  onEdit,
}: {
  preview: string;
  partsLabel: string;
  partsSummary: string;
  adjustments: string[];
  onEdit: () => void;
}) {
  return (
    <div className="recipeSubBlock constructorSummary">
      <div>
        <strong className="headingWithInfo">
          <span>Crear valor personalizado</span>
          <InfoTooltip content="Combina datos y transformaciones para crear este valor." />
        </strong>
        <dl className="customValueSummaryList">
          <div>
            <dt>Vista previa</dt>
            <dd>{preview}</dd>
          </div>
          {partsLabel ? (
            <div>
              <dt>{partsLabel}</dt>
              <dd>{partsSummary}</dd>
            </div>
          ) : null}
          <div>
            <dt>Transformaciones</dt>
            <dd>
              {adjustments.length > 0 ? (
                <span className="summaryPillList">
                  {adjustments.map((adjustment, index) => (
                    <span key={`${adjustment}-${index}`} className="summaryPill">{adjustment}</span>
                  ))}
                </span>
              ) : (
                'Sin transformaciones'
              )}
            </dd>
          </div>
        </dl>
      </div>
      <button type="button" onClick={onEdit}>
        Editar valor personalizado
      </button>
    </div>
  );
}
