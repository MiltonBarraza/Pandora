import { useState } from 'react';
import type { InputColumn, InputRow, StepSource } from '../../types/import';
import { getInputColumnLabel } from '../../domain/import/inputColumnLabels';
import { Dropdown, type DropdownOption } from '../ui/Dropdown/Dropdown';
import { noActiveColumnsLabel } from './OutputColumnRecipeEditor.constants';

type ColumnTextPickerProps = {
  inputColumns: InputColumn[];
  rows: InputRow[];
  value: string;
  onSelect: (value: string) => void;
};

export function ColumnTextPicker({ inputColumns, rows, value, onSelect }: ColumnTextPickerProps) {
  const [inputColumnId, setInputColumnId] = useState(inputColumns[0]?.id ?? '');
  const textOptions = getUniqueColumnTextOptions(rows, inputColumnId);
  const selectedValue = textOptions.some((option) => option.value === value) ? value : '';

  return (
    <>
      <Dropdown
        className="compact manualRangeValueDetailField"
        label="Buscar textos en"
        value={inputColumnId}
        options={inputColumns.length === 0
          ? [{ value: '', label: noActiveColumnsLabel, disabled: true }]
          : inputColumns.map((inputColumn) => ({ value: inputColumn.id, label: getInputColumnLabel(inputColumn) }))}
        disabled={inputColumns.length === 0}
        scrollStrategy="close"
        onChange={setInputColumnId}
      />
      <Dropdown
        className="compact manualRangeValueDetailField"
        label="Texto encontrado"
        value={selectedValue}
        options={textOptions.length > 0
          ? textOptions
          : [{ value: '', label: 'Sin textos disponibles', disabled: true }]}
        disabled={textOptions.length === 0}
        searchable
        searchPlaceholder="Buscar texto"
        scrollStrategy="close"
        onChange={onSelect}
      />
    </>
  );
}

export function getUniqueColumnTextOptions(rows: InputRow[], inputColumnId: string): DropdownOption[] {
  if (!inputColumnId) {
    return [];
  }

  const seen = new Set<string>();
  const options: DropdownOption[] = [];
  rows.forEach((row) => {
    const value = String(row.values[inputColumnId] ?? '');
    const normalizedValue = value.trim();
    if (!normalizedValue || seen.has(normalizedValue)) {
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
