type SheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({ sheetNames, selectedSheet, onSelectSheet }: SheetSelectorProps) {
  return (
    <label className="field">
      <span>Hoja</span>
      <select value={selectedSheet} onChange={(event) => onSelectSheet(event.target.value)}>
        {sheetNames.map((sheetName) => (
          <option key={sheetName} value={sheetName}>
            {sheetName}
          </option>
        ))}
      </select>
    </label>
  );
}
