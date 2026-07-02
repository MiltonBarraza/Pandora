import { useRef, useState } from 'react';

type MultipleFileUploaderProps = {
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
};

export function MultipleFileUploader({ disabled = false, onFilesSelected }: MultipleFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFiles = (files: FileList | null) => {
    if (files?.length) {
      onFilesSelected(Array.from(files));
    }
  };

  return (
    <div className="fileUploader combineFileUploader">
      <div
        className={`dropZone${isDragging ? ' isDragging' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) {
            selectFiles(event.dataTransfer.files);
          }
        }}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          multiple
          tabIndex={-1}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            selectFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <strong>{disabled ? 'Leyendo archivos…' : 'Cargar archivos'}</strong>
        <span className="dropZoneHelp">Arrastrá uno o varios archivos .xlsx, .xls, .xlsm o .csv</span>
        <span className="dropZoneHelp dropZoneHelpSecondary">O hacé click para seleccionarlos desde tu computadora</span>
      </div>
    </div>
  );
}
