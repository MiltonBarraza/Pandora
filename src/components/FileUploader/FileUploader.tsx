import { useRef, useState } from 'react';
import { ReadyCheckIcon } from '../../dev/icons';
import { ActionButton } from '../ui/ActionButton/ActionButton';

type FileUploaderProps = {
  fileName: string;
  emptyHint?: string;
  onFileSelected: (file: File | undefined) => void;
  onFileRemoved: () => void;
};

const acceptedExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];

export function FileUploader({ fileName, emptyHint, onFileSelected, onFileRemoved }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState('');
  const hasFile = fileName !== '';

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const processFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    if (files && files.length > 1) {
      setDropError('Solo se permite un archivo. Se usará el primero.');
    } else {
      setDropError('');
    }

    const lowerName = file.name.toLowerCase();
    const isAccepted = acceptedExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isAccepted) {
      setDropError('Archivo inválido. Subí un .xlsx, .xls, .xlsm o .csv.');
      return;
    }

    onFileSelected(file);
  };

  const removeFile = () => {
    setDropError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemoved();
  };

  return (
    <>
      <div className={`fileUploader ${hasFile ? 'hasFile' : ''}`}>
        <div
          className={`dropZone ${isDragging ? 'isDragging' : ''} ${hasFile ? 'hasFile' : ''}`}
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            processFiles(event.dataTransfer.files);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openFilePicker();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              processFiles(event.target.files);
              event.target.value = '';
            }}
          />
          {hasFile ? (
            <ActionButton
              action="close"
              variant="secondary"
              size="sm"
              type="button"
              className="dropZoneRemoveButton"
              onClick={(event) => {
                event.stopPropagation();
                removeFile();
              }}
              aria-label={`Remover archivo ${fileName}`}
            >
              Remover
            </ActionButton>
          ) : null}
          {hasFile ? <ReadyCheckIcon className="dropZoneReadyIcon" aria-hidden="true" focusable="false" /> : null}
          <strong>{hasFile ? fileName : 'Elegir archivo'}</strong>
          <span className="dropZoneHelp">Arrastrá un archivo aquí de tipo .xlsx, .xls o .xlsm</span>
          <span className="dropZoneHelp dropZoneHelpSecondary">Hacé click para subir uno de tu computadora</span>
          {!hasFile && emptyHint ? <span className="dropZoneHint">{emptyHint}</span> : null}
        </div>
      </div>
      {dropError ? <p className="errorText">{dropError}</p> : null}
    </>
  );
}
