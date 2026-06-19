import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type SheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({ sheetNames, selectedSheet, onSelectSheet }: SheetSelectorProps) {
  return (
    <Dropdown
      label="Hoja"
      labelInfo={<InfoTooltip content="Elegí qué hoja querés procesar." />}
      value={selectedSheet}
      options={sheetNames.map((sheetName) => ({ value: sheetName, label: sheetName }))}
      placeholder="Seleccionar hoja"
      disabled={sheetNames.length === 0}
      scrollStrategy="lock"
      onChange={onSelectSheet}
    />
  );
}
