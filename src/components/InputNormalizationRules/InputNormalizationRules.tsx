import { useState } from 'react';
import type { InputColumn, InputNormalizationCondition, InputNormalizationRule, RangeValueApplyMode } from '../../types/import';
import type { RawRow } from '../../types/import';
import { getInputNormalizationRuleImpacts, getInputNormalizationRuleRanges, type InputFillDownRange, type InputRangeGroupRange, type InputRangeValueRange } from '../../domain/import/inputNormalization';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { Modal } from '../Modal/Modal';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type InputNormalizationRulesProps = {
  inputColumns: InputColumn[];
  rawRows: RawRow[];
  rawRowNumbers?: number[];
  headerRowIndex: number | null;
  rules: InputNormalizationRule[];
  onChange: (rules: InputNormalizationRule[]) => void;
};

export const inputNormalizationSectionTitle = 'Completar datos por rangos';
export const inputNormalizationSectionInfo = 'Usá esta opción cuando el Excel tenga títulos o valores que aplican a varias filas, pero no se repiten en cada una.';
export const inputNormalizationEmptyMessage = 'No hay reglas de rangos configuradas.';
export const inputNormalizationEmptyHint = 'Agregá una regla si el Excel tiene títulos o grupos que aplican a varias filas.';
export const inputNormalizationRuleTypeOptions: Array<{ value: InputNormalizationRule['type']; label: string }> = [
  { value: 'fillDown', label: 'Completar vacíos con el valor superior' },
  { value: 'rangeGroup', label: 'Usar títulos de grupo' },
  { value: 'rangeValue', label: 'Capturar dato del rango' },
];
export const inputNormalizationRuleHelpText: Record<InputNormalizationRule['type'], string> = {
  fillDown: 'Usala cuando una columna tiene un valor arriba y celdas vacías debajo que pertenecen a ese mismo valor.',
  rangeGroup: 'Usala cuando una columna contiene títulos de grupo, pero también puede tener otros textos que no deberían iniciar un nuevo grupo.',
  rangeValue: 'Usala para tomar un dato adicional que aparece dentro de una fila del rango y guardarlo en otra columna.',
};
const maxVisibleRanges = 5;
const conditionOperatorOptions: Array<{ value: InputNormalizationCondition['operator']; label: string }> = [
  { value: 'isEmpty', label: 'está vacía' },
  { value: 'isNotEmpty', label: 'no está vacía' },
];
const rangeValueApplyModeOptions: Array<{ value: RangeValueApplyMode; label: string }> = [
  { value: 'matchingRowsOnly', label: 'Sólo filas desde donde aparece' },
  { value: 'allRowsInRange', label: 'Todas las filas del rango' },
];

export function InputNormalizationRules({ inputColumns, rawRows, rawRowNumbers, headerRowIndex, rules, onChange }: InputNormalizationRulesProps) {
  const [openRangesRuleId, setOpenRangesRuleId] = useState<string | null>(null);
  const activeColumns = inputColumns.filter((column) => column.active);
  const impactByRuleId = new Map(
    getInputNormalizationRuleImpacts(rawRows, rules, inputColumns, headerRowIndex).map((impact) => [impact.ruleId, impact]),
  );
  const rangesByRuleId = new Map(
    getInputNormalizationRuleRanges(rawRows, rules, inputColumns, headerRowIndex, rawRowNumbers).map((result) => [result.ruleId, result.ranges]),
  );
  const openRangesRule = rules.find((rule) => rule.id === openRangesRuleId);
  const openRanges = openRangesRule ? rangesByRuleId.get(openRangesRule.id) ?? [] : [];

  const addRule = () => {
    onChange([
      ...rules,
      createFillDownNormalizationRule(),
    ]);
  };

  const updateRule = (id: string, patch: Partial<InputNormalizationRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } as InputNormalizationRule : rule)));
  };

  const updateRuleType = (rule: InputNormalizationRule, type: InputNormalizationRule['type']) => {
    if (rule.type === type) {
      return;
    }

    onChange(rules.map((item) => (item.id === rule.id ? createInputNormalizationRule(type, rule.id) : item)));
  };

  return (
    <div className="rules">
      <div className="sectionHeader">
        <p>Estas reglas completan datos faltantes usando valores superiores, como títulos de grupo o rangos del Excel.</p>
        <InfoTooltip content="Agregá una regla manual para Excels con rangos o grupos.">
          <ActionButton action="add" onClick={addRule}>Agregar regla</ActionButton>
        </InfoTooltip>
      </div>

      {rules.length === 0 ? (
        <p className="muted">
          {inputNormalizationEmptyMessage} {inputNormalizationEmptyHint}
        </p>
      ) : null}

      {rules.map((rule) => (
        <div className="ignoreRuleCard" key={rule.id}>
          <div className="ignoreRuleFields">
            <Dropdown<InputNormalizationRule['type']>
              className="compact"
              label="Regla"
              labelInfo={<InfoTooltip content="Si una celda está vacía, usa el último valor encontrado arriba en esa columna." />}
              value={rule.type}
              options={inputNormalizationRuleTypeOptions}
              scrollStrategy="close"
              onChange={(type) => updateRuleType(rule, type)}
            />

            {rule.type === 'fillDown' ? (
              <Dropdown
                className="compact"
                label="Columna con valores de grupo"
                labelInfo={<InfoTooltip content="Elegí la columna donde un valor puede aplicar a varias filas debajo." />}
                value={rule.columnId}
                placeholder="Seleccionar columna"
                options={getInputColumnOptions(activeColumns)}
                scrollStrategy="close"
                onChange={(columnId) => updateRule(rule.id, { columnId })}
              />
            ) : null}

            {rule.type === 'rangeGroup' ? (
              <RangeGroupRuleFields
                rule={rule}
                inputColumns={activeColumns}
                onChange={(patch) => updateRule(rule.id, patch)}
              />
            ) : null}

            {rule.type === 'rangeValue' ? (
              <RangeValueRuleFields
                rule={rule}
                inputColumns={activeColumns}
                onChange={(patch) => updateRule(rule.id, patch)}
              />
            ) : null}

            <label className="checkboxField ruleHint">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}
              />
              Habilitada
            </label>
          </div>
          <DeleteButton onClick={() => onChange(rules.filter((item) => item.id !== rule.id))} />
          {!isInputNormalizationRuleComplete(rule) ? <p className="muted ruleFeedback">Seleccioná las columnas para aplicar la regla.</p> : null}
          {isInputNormalizationRuleComplete(rule) ? (
            <div className="ruleFeedback">
              <p className="muted">
                {getInputNormalizationRuleSummary(rule, inputColumns, impactByRuleId.get(rule.id)?.completedCellCount ?? 0)}
              </p>
              {rule.enabled ? (
                <InputNormalizationRanges
                  ranges={rangesByRuleId.get(rule.id) ?? []}
                  onShowAll={() => setOpenRangesRuleId(rule.id)}
                />
              ) : null}
            </div>
          ) : null}
          <p className="muted ruleHelpText">{inputNormalizationRuleHelpText[rule.type]}</p>
        </div>
      ))}
      <Modal
        open={Boolean(openRangesRule)}
        title="Rangos encontrados"
        size="xl"
        onClose={() => setOpenRangesRuleId(null)}
      >
        <InputNormalizationRangesTable ranges={openRanges} />
      </Modal>
    </div>
  );
}

function RangeGroupRuleFields({
  rule,
  inputColumns,
  onChange,
}: {
  rule: Extract<InputNormalizationRule, { type: 'rangeGroup' }>;
  inputColumns: InputColumn[];
  onChange: (patch: Partial<InputNormalizationRule>) => void;
}) {
  const columnOptions = getInputColumnOptions(inputColumns);

  return (
    <>
      <Dropdown
        className="compact"
        label="Columna donde están los títulos de grupo"
        labelInfo={<InfoTooltip content="Elegí la columna donde aparecen los valores que nombran cada grupo o rango." />}
        value={rule.groupColumnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(groupColumnId) => onChange({
          groupColumnId,
          targetColumnId: rule.targetColumnId || groupColumnId,
        })}
      />

      <Dropdown
        className="compact"
        label="Un valor inicia grupo cuando"
        labelInfo={<InfoTooltip content="El grupo cambia solo cuando la fila cumple esta condición." />}
        value={rule.groupStartCondition.columnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(columnId) => onChange({ groupStartCondition: { ...rule.groupStartCondition, columnId } })}
      />

      <Dropdown<InputNormalizationCondition['operator']>
        className="compact"
        label="Condición para iniciar grupo"
        value={rule.groupStartCondition.operator}
        options={conditionOperatorOptions}
        scrollStrategy="close"
        onChange={(operator) => onChange({ groupStartCondition: { ...rule.groupStartCondition, operator } })}
      />

      <Dropdown
        className="compact"
        label="Aplicar ese grupo a filas donde"
        labelInfo={<InfoTooltip content="Las filas que cumplen esta condición reciben el último grupo válido." />}
        value={rule.applyToRowCondition.columnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(columnId) => onChange({ applyToRowCondition: { ...rule.applyToRowCondition, columnId } })}
      />

      <Dropdown<InputNormalizationCondition['operator']>
        className="compact"
        label="Condición para aplicar grupo"
        value={rule.applyToRowCondition.operator}
        options={conditionOperatorOptions}
        scrollStrategy="close"
        onChange={(operator) => onChange({ applyToRowCondition: { ...rule.applyToRowCondition, operator } })}
      />

      <Dropdown
        className="compact"
        label="Guardar el grupo en"
        value={rule.targetColumnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(targetColumnId) => onChange({ targetColumnId })}
      />
    </>
  );
}

function RangeValueRuleFields({
  rule,
  inputColumns,
  onChange,
}: {
  rule: Extract<InputNormalizationRule, { type: 'rangeValue' }>;
  inputColumns: InputColumn[];
  onChange: (patch: Partial<InputNormalizationRule>) => void;
}) {
  const columnOptions = getInputColumnOptions(inputColumns);

  return (
    <>
      <Dropdown
        className="compact"
        label="Tomar dato desde"
        labelInfo={<InfoTooltip content="Elegí la columna donde aparecen subtítulos, descripciones u otros datos dentro de un rango." />}
        value={rule.valueColumnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(valueColumnId) => onChange({
          valueColumnId,
          targetColumnId: rule.targetColumnId || valueColumnId,
        })}
      />

      <Dropdown
        className="compact"
        label="Capturarlo cuando"
        labelInfo={<InfoTooltip content="El dato se captura cuando esta condición se cumple en la fila." />}
        value={rule.captureCondition.columnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(columnId) => onChange({ captureCondition: { ...rule.captureCondition, columnId } })}
      />

      <Dropdown<InputNormalizationCondition['operator']>
        className="compact"
        label="Condición para capturar"
        value={rule.captureCondition.operator}
        options={conditionOperatorOptions}
        scrollStrategy="close"
        onChange={(operator) => onChange({ captureCondition: { ...rule.captureCondition, operator } })}
      />

      <Dropdown
        className="compact"
        label="Guardar dato en"
        value={rule.targetColumnId}
        placeholder="Seleccionar columna"
        options={columnOptions}
        scrollStrategy="close"
        onChange={(targetColumnId) => onChange({ targetColumnId })}
      />

      <Dropdown<RangeValueApplyMode>
        className="compact"
        label="Aplicar dato a"
        labelInfo={<InfoTooltip content="Podés aplicar el dato sólo desde la fila donde aparece o a todas las filas producto del mismo rango." />}
        value={rule.applyMode ?? 'matchingRowsOnly'}
        options={rangeValueApplyModeOptions}
        scrollStrategy="close"
        onChange={(applyMode) => onChange({ applyMode })}
      />
    </>
  );
}

type InputNormalizationDisplayRange = InputFillDownRange | InputRangeGroupRange | InputRangeValueRange;

function InputNormalizationRanges({ ranges, onShowAll }: { ranges: InputNormalizationDisplayRange[]; onShowAll: () => void }) {
  if (ranges.length === 0) {
    return <p className="muted">No se encontraron rangos para esta columna.</p>;
  }

  return (
    <div className="normalizationRangeSummary">
      <p className="muted">{getInputNormalizationRangesCountText(ranges)}</p>
      <button type="button" className="secondary" onClick={onShowAll}>
        Ver todos
      </button>
    </div>
  );
}

function InputNormalizationRangesTable({ ranges }: { ranges: InputNormalizationDisplayRange[] }) {
  if (ranges.length === 0) {
    return <p className="muted">No se encontraron rangos para esta columna.</p>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Valor</th>
            <th>Fila inicial</th>
            <th>Fila final</th>
            <th>Celdas completadas</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={`${range.sourceRowNumber}-${range.value}`}>
              <td>{range.value}</td>
              <td>{range.startRowNumber}</td>
              <td>{range.endRowNumber}</td>
              <td>{getRangeAppliedCount(range)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function createFillDownNormalizationRule(id: string = crypto.randomUUID()): InputNormalizationRule {
  return {
    id,
    type: 'fillDown',
    columnId: '',
    enabled: true,
  };
}

export function createRangeGroupNormalizationRule(id: string = crypto.randomUUID()): InputNormalizationRule {
  return {
    id,
    type: 'rangeGroup',
    enabled: true,
    groupColumnId: '',
    groupStartCondition: {
      columnId: '',
      operator: 'isEmpty',
    },
    applyToRowCondition: {
      columnId: '',
      operator: 'isNotEmpty',
    },
    targetColumnId: '',
  };
}

export function createRangeValueNormalizationRule(id: string = crypto.randomUUID()): InputNormalizationRule {
  return {
    id,
    type: 'rangeValue',
    enabled: true,
    valueColumnId: '',
    captureCondition: {
      columnId: '',
      operator: 'isNotEmpty',
    },
    applyMode: 'matchingRowsOnly',
    targetColumnId: '',
  };
}

export function createInputNormalizationRule(type: InputNormalizationRule['type'], id: string = crypto.randomUUID()) {
  if (type === 'fillDown') {
    return createFillDownNormalizationRule(id);
  }

  return type === 'rangeGroup'
    ? createRangeGroupNormalizationRule(id)
    : createRangeValueNormalizationRule(id);
}

export function getInputNormalizationRuleSummary(rule: InputNormalizationRule, inputColumns: InputColumn[], completedCellCount = 0) {
  const columnLetter = getRuleColumnLetter(rule, inputColumns);
  if (!rule.enabled) {
    return `Columna ${columnLetter}: regla deshabilitada.`;
  }

  if (completedCellCount === 0) {
    if (rule.type === 'rangeGroup') {
      return 'No se aplicaron grupos con esta configuración.';
    }

    return rule.type === 'rangeValue'
      ? 'No se capturaron datos con esta configuración.'
      : `Columna ${columnLetter}: no se completaron celdas.`;
  }

  if (rule.type === 'rangeGroup') {
    return `Columna ${columnLetter}: se aplicaron grupos a ${completedCellCount} filas.`;
  }

  if (rule.type === 'rangeValue') {
    return `Columna ${columnLetter}: se capturaron datos para ${completedCellCount} filas.`;
  }

  const cellLabel = completedCellCount === 1 ? 'celda' : 'celdas';
  return `Columna ${columnLetter}: se completaron ${completedCellCount} ${cellLabel} usando el valor superior.`;
}

export function getInputNormalizationRangesCountText(ranges: InputNormalizationDisplayRange[]) {
  return `Rangos encontrados: ${ranges.length}`;
}

export function getInputNormalizationRangeText(range: InputNormalizationDisplayRange) {
  if ('appliedCount' in range) {
    return `${range.value}: aplicado a ${range.appliedCount} filas producto`;
  }

  if (range.startRowNumber === range.endRowNumber) {
    return `${range.value}: fila ${range.startRowNumber}`;
  }

  return `${range.value}: filas ${range.startRowNumber} a ${range.endRowNumber}`;
}

export function getVisibleInputNormalizationRanges(ranges: InputNormalizationDisplayRange[]) {
  return {
    visibleRanges: ranges.slice(0, maxVisibleRanges),
    hiddenCount: Math.max(0, ranges.length - maxVisibleRanges),
  };
}

function getRuleColumnLetter(rule: InputNormalizationRule, inputColumns: InputColumn[]) {
  const columnId = rule.type === 'fillDown' ? rule.columnId : rule.targetColumnId;
  return inputColumns.find((column) => column.id === columnId)?.columnLetter ?? columnId;
}

function getInputColumnOptions(inputColumns: InputColumn[]) {
  return inputColumns.map((column) => ({
    value: column.id,
    label: getInputColumnLabel(column),
  }));
}

function isInputNormalizationRuleComplete(rule: InputNormalizationRule) {
  if (rule.type === 'fillDown') {
    return rule.columnId !== '';
  }

  if (rule.type === 'rangeValue') {
    return (
      rule.valueColumnId !== '' &&
      rule.captureCondition.columnId !== '' &&
      rule.targetColumnId !== ''
    );
  }

  return (
    rule.groupColumnId !== '' &&
    rule.groupStartCondition.columnId !== '' &&
    rule.applyToRowCondition.columnId !== '' &&
    rule.targetColumnId !== ''
  );
}

function getRangeAppliedCount(range: InputNormalizationDisplayRange) {
  return 'appliedCount' in range ? range.appliedCount : range.filledCount;
}
