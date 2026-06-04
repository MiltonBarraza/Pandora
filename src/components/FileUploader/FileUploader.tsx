import { useState } from 'react';

type FileUploaderProps = {
  fileName: string;
  onFileSelected: (file: File | undefined) => void;
};

const acceptedExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];

export function FileUploader({ fileName, onFileSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState('');

  const processFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    if (files && files.length > 1) {
      setDropError('Solo se permite un archivo. Se usara el primero.');
    } else {
      setDropError('');
    }

    const lowerName = file.name.toLowerCase();
    const isAccepted = acceptedExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isAccepted) {
      setDropError('Archivo invalido. Subi un .xlsx, .xls, .xlsm o .csv.');
      return;
    }

    onFileSelected(file);
  };

  return (
    <>
    <label
      className={`dropZone ${isDragging ? 'isDragging' : ''}`}
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
    >
      <input
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv"
        onChange={(event) => processFiles(event.target.files)}
      />
      <strong>{fileName || 'Elegir archivo'}</strong>
      <span>Arrastra un archivo aca o hace click. .xlsx, .xls, .xlsm o .csv</span>
    </label>
    {dropError ? <p className="errorText">{dropError}</p> : null}
    </>
  );
}