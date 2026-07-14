import type { SheetRangeMetadata } from '../../types/import';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';

type SheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  disabled?: boolean;
  isProcessing?: boolean;
  rangeMetadata?: SheetRangeMetadata | null;
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({
  sheetNames,
  selectedSheet,
  disabled = false,
  isProcessing = false,
  rangeMetadata,
  onSelectSheet,
}: SheetSelectorProps) {
  const rangeWarning = rangeMetadata?.shouldShowTrimWarning
    ? `Esta hoja tenía columnas vacías registradas al final. Pandora las omitió automáticamente para evitar lentitud. Excel informaba hasta ${rangeMetadata.originalRef}, pero se usó ${rangeMetadata.effectiveRef}.`
    : null;

  return (
    <div className="sheetSelectorWithStatus">
      <Dropdown
        className="mainControlWidth"
        label="Hoja"
        labelInfo={(
          <>
            <InfoTooltip content="Elegí qué hoja querés procesar." />
            {rangeWarning ? <WarningTooltip content={rangeWarning} ariaLabel="Advertencia sobre rango de la hoja" /> : null}
          </>
        )}
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
