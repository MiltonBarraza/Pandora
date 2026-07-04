import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type SheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  disabled?: boolean;
  isProcessing?: boolean;
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({
  sheetNames,
  selectedSheet,
  disabled = false,
  isProcessing = false,
  onSelectSheet,
}: SheetSelectorProps) {
  return (
    <div className="sheetSelectorWithStatus">
      <Dropdown
        label="Hoja"
        labelInfo={<InfoTooltip content="Elegí qué hoja querés procesar." />}
        value={selectedSheet}
        options={sheetNames.map((sheetName) => ({ value: sheetName, label: sheetName }))}
        placeholder="Seleccionar hoja"
        disabled={disabled || isProcessing || sheetNames.length === 0}
        scrollStrategy="lock"
        onChange={onSelectSheet}
      />
      {isProcessing ? (
        <span className="processingIndicator sheetProcessingStatus" role="status" aria-live="polite">
          <span className="processingSpinner" aria-hidden="true" />
          Procesando hoja...
        </span>
      ) : null}
    </div>
  );
}
