import { Dropdown } from '../ui/Dropdown/Dropdown';

type SheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({ sheetNames, selectedSheet, onSelectSheet }: SheetSelectorProps) {
  return (
    <Dropdown
      label="Hoja"
      value={selectedSheet}
      options={sheetNames.map((sheetName) => ({ value: sheetName, label: sheetName }))}
      placeholder="Seleccionar hoja"
      disabled={sheetNames.length === 0}
      scrollStrategy="lock"
      onChange={onSelectSheet}
    />
  );
}
