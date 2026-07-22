import { useEffect, useState, type ReactNode } from 'react';
import type { InputColumn, InputRow, StepSource } from '../../types/import';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { Dropdown, type DropdownOption } from '../ui/Dropdown/Dropdown';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';

type ColumnTextPickerProps = {
  inputColumns: InputColumn[];
  rows: InputRow[];
  value: string;
  columnLabel?: string;
  columnLabelInfo?: ReactNode;
  valueLabel?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  isValueAllowed?: (value: string) => boolean;
  filteredValuesHelp?: string;
  invalidCurrentValueHelp?: string;
  invalidOptionsLabel?: string;
  fieldClassName?: string;
  onSelect: (value: string) => void;
};

export const invalidPickerValuesLabel = 'Valores no válidos';

export function ColumnTextPicker({
  inputColumns,
  rows,
  value,
  columnLabel = 'Buscar textos en',
  columnLabelInfo,
  valueLabel = 'Texto encontrado',
  emptyLabel = 'Sin textos disponibles',
  searchPlaceholder = 'Buscar texto',
  isValueAllowed,
  filteredValuesHelp,
  invalidCurrentValueHelp,
  invalidOptionsLabel = invalidPickerValuesLabel,
  fieldClassName = 'manualRangeValueDetailField',
  onSelect,
}: ColumnTextPickerProps) {
  const [inputColumnId, setInputColumnId] = useState(inputColumns[0]?.id ?? '');
  const textOptions = getUniqueColumnTextOptions(rows, inputColumnId, isValueAllowed);
  const unfilteredOptions = isValueAllowed ? getUniqueColumnTextOptions(rows, inputColumnId) : textOptions;
  const omittedInvalidValues = unfilteredOptions.length > textOptions.length;
  const hasNoValidOptions = textOptions.length === 0;
  const noValidOptionsWarning = hasNoValidOptions
    ? getInvalidPickerTooltip(emptyLabel, omittedInvalidValues ? filteredValuesHelp : undefined)
    : '';
  const hasInvalidCurrentValue = Boolean(value.trim() && isValueAllowed && !isValueAllowed(value.trim()));
  const selectedValue = textOptions.some((option) => option.value === value) ? value : '';
  const fieldClasses = `compact ${fieldClassName}`;
  const valueLabelWarning = noValidOptionsWarning || (omittedInvalidValues && filteredValuesHelp ? filteredValuesHelp : '');

  useEffect(() => {
    if (inputColumnId && inputColumns.some((inputColumn) => inputColumn.id === inputColumnId)) {
      return;
    }

    setInputColumnId(inputColumns[0]?.id ?? '');
  }, [inputColumnId, inputColumns]);

  return (
    <>
      <Dropdown
        className={fieldClasses}
        label={columnLabel}
        labelInfo={columnLabelInfo}
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
        labelInfo={valueLabelWarning ? <WarningTooltip content={valueLabelWarning} ariaLabel="Aviso de compatibilidad" /> : undefined}
        value={selectedValue}
        options={textOptions.length > 0
          ? textOptions
          : [{ value: '', label: invalidOptionsLabel, disabled: true }]}
        disabled={textOptions.length === 0}
        searchable
        resetSearchOnOpen
        searchPlaceholder={searchPlaceholder}
        scrollStrategy="close"
        onChange={onSelect}
      />
      {hasInvalidCurrentValue && invalidCurrentValueHelp ? <p className="columnValuePickerWarning">{invalidCurrentValueHelp}</p> : null}
    </>
  );
}

export function getInvalidPickerTooltip(...messages: Array<string | undefined>) {
  return Array.from(new Set(messages.map((message) => message?.trim()).filter(Boolean))).join(' ');
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
