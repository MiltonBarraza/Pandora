import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import {
  getManualRangeFixedTextValue,
  getManualRangeInputSource,
  getManualRangeRangeTextHelpText,
  getManualRangeRangeTextSource,
  getManualRangeSelectedTextOptions,
  getManualRangeValueSourceType,
  manualRangeValueSourceOptions,
  type ManualRangeValueSourceType,
} from '../../domain/import/manualRangeModel';
import type { InputColumn, InputRow, ManualRangeValue } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';

type RangeValueEditorProps = {
  range: ManualRangeValue;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onValueSourceTypeChange: (type: ManualRangeValueSourceType) => void;
  onFixedTextChange: (value: string) => void;
  onInputColumnChange: (inputColumnId: string) => void;
  onRangeTextChange: (patch: { inputColumnId?: string; selectedText?: string }) => void;
};

export function RangeValueEditor({
  range,
  inputColumns,
  manualRangeRows,
  onValueSourceTypeChange,
  onFixedTextChange,
  onInputColumnChange,
  onRangeTextChange,
}: RangeValueEditorProps) {
  const valueSourceType = getManualRangeValueSourceType(range);
  const inputSource = getManualRangeInputSource(range);
  const rangeTextSource = getManualRangeRangeTextSource(range);
  const selectedTextOptions = getManualRangeSelectedTextOptions(manualRangeRows, range, rangeTextSource);
  const rangeTextHelpText = getManualRangeRangeTextHelpText(manualRangeRows, range, rangeTextSource);
  const inputColumnOptions = inputColumns.length === 0
    ? [{ value: '', label: 'Sin columnas activas' }]
    : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }));

  return (
    <div className="manualRangeValueFields">
      <Dropdown<ManualRangeValueSourceType>
        className="compact"
        label="Valor"
        value={valueSourceType}
        options={manualRangeValueSourceOptions}
        scrollStrategy="close"
        onChange={onValueSourceTypeChange}
      />
      {valueSourceType === 'input' ? (
        <Dropdown
          className="compact"
          label="Columna de entrada"
          value={inputSource.inputColumnId}
          options={inputColumnOptions}
          scrollStrategy="close"
          onChange={onInputColumnChange}
        />
      ) : valueSourceType === 'rangeText' ? (
        <>
          <Dropdown
            className="compact"
            label="Buscar textos en"
            value={rangeTextSource.inputColumnId}
            options={inputColumnOptions}
            scrollStrategy="close"
            onChange={(inputColumnId) => onRangeTextChange({ inputColumnId })}
          />
          <Dropdown
            className="compact"
            label="Texto encontrado"
            value={rangeTextSource.selectedText}
            options={selectedTextOptions.length === 0
              ? [{ value: '', label: 'Sin textos encontrados', disabled: true }]
              : selectedTextOptions.map((text) => ({ value: text, label: text }))}
            disabled={selectedTextOptions.length === 0}
            scrollStrategy="close"
            onChange={(selectedText) => onRangeTextChange({ selectedText })}
          />
          {rangeTextHelpText ? <p className="manualRangeValueHelp">{rangeTextHelpText}</p> : null}
        </>
      ) : (
        <label className="field compact">
          <span>Texto fijo</span>
          <input
            value={getManualRangeFixedTextValue(range)}
            onChange={(event) => onFixedTextChange(event.target.value)}
          />
        </label>
      )}
    </div>
  );
}
