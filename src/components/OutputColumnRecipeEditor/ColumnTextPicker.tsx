import { useState } from 'react';
import type { InputColumn, InputRow, StepSource } from '../../types/import';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { Dropdown, type DropdownOption } from '../ui/Dropdown/Dropdown';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';

type ColumnTextPickerProps = {
  inputColumns: InputColumn[];
  rows: InputRow[];
  value: string;
  columnLabel?: string;
  valueLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  isValueAllowed?: (value: string) => boolean;
  filteredValuesHelp?: string;
  invalidCurrentValueHelp?: string;
  fieldClassName?: string;
  onSelect: (value: string) => void;
};

export function ColumnTextPicker({
  inputColumns,
  rows,
  value,
  columnLabel = 'Buscar textos en',
  valueLabel = 'Texto encontrado',
  emptyLabel = 'Sin textos disponibles',
  searchPlaceholder = 'Buscar texto',
  isValueAllowed,
  filteredValuesHelp,
  invalidCurrentValueHelp,
  fieldClassName = 'manualRangeValueDetailField',
  onSelect,
}: ColumnTextPickerProps) {
  const [inputColumnId, setInputColumnId] = useState(inputColumns[0]?.id ?? '');
  const textOptions = getUniqueColumnTextOptions(rows, inputColumnId, isValueAllowed);
  const unfilteredOptions = isValueAllowed ? getUniqueColumnTextOptions(rows, inputColumnId) : textOptions;
  const omittedInvalidValues = unfilteredOptions.length > textOptions.length;
  const hasInvalidCurrentValue = Boolean(value.trim() && isValueAllowed && !isValueAllowed(value.trim()));
  const selectedValue = textOptions.some((option) => option.value === value) ? value : '';
  const fieldClasses = `compact ${fieldClassName}`;

  return (
    <>
      <Dropdown
        className={fieldClasses}
        label={columnLabel}
        value={inputColumnId}
        options={inputColumns.length === 0
          ? [{ value: '', label: noActiveColumnsLabel, disabled: true }]
          : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
        disabled={inputColumns.length === 0}
        scrollStrategy="close"
        onChange={setInputColumnId}
      />
      <Dropdown
        className={fieldClasses}
        label={valueLabel}
        value={selectedValue}
        options={textOptions.length > 0
          ? textOptions
          : [{ value: '', label: emptyLabel, disabled: true }]}
        disabled={textOptions.length === 0}
        searchable
        searchPlaceholder={searchPlaceholder}
        scrollStrategy="close"
        onChange={onSelect}
      />
      {hasInvalidCurrentValue && invalidCurrentValueHelp ? <p className="columnValuePickerWarning">{invalidCurrentValueHelp}</p> : null}
      {omittedInvalidValues && filteredValuesHelp ? <p className="columnValuePickerHelp">{filteredValuesHelp}</p> : null}
    </>
  );
}

export function getUniqueColumnTextOptions(
  rows: InputRow[],
  inputColumnId: string,
  isValueAllowed: (value: string) => boolean = () => true,
): DropdownOption[] {
  if (!inputColumnId) {
    return [];
  }

  const seen = new Set<string>();
  const options: DropdownOption[] = [];
  rows.forEach((row) => {
    const value = String(row.values[inputColumnId] ?? '');
    const normalizedValue = value.trim();
    if (!normalizedValue || !isValueAllowed(normalizedValue) || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    options.push({ value, label: value });
  });
  return options;
}

export function createFixedTextSourceFromColumnText(value: string): Extract<StepSource, { type: 'fixedText' }> {
  return { type: 'fixedText', value };
}
