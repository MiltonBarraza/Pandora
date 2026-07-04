import { useEffect, useState } from 'react';
import { normalizeCombineColumnName } from '../../domain/combine/combineColumnMappings';
import { isSourceMetadataColumn } from '../../domain/combine/sourceMetadata';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombinedRow,
  SourceMetadataOptions,
} from '../../types/combine';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { CombineSourceMetadata } from './CombineSourceMetadata';

type CombineExportActionsProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  combinedRows: CombinedRow[];
  outputFileName: string;
  onOutputFileNameChange: (fileName: string) => void;
  sourceMetadataOptions: SourceMetadataOptions;
  onSourceMetadataOptionsChange: (options: SourceMetadataOptions) => void;
};

export function CombineExportActions({
  sources,
  outputColumns,
  mappings,
  combinedRows,
  outputFileName,
  onOutputFileNameChange,
  sourceMetadataOptions,
  onSourceMetadataOptionsChange,
}: CombineExportActionsProps) {
  const [nameMode, setNameMode] = useState<'default' | 'custom'>(() => getCombineNameMode(outputFileName));
  const [includeBaseText, setIncludeBaseText] = useState(true);
  const [includeDate, setIncludeDate] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);
  const disabledReason = getExportDisabledReason(sources, outputColumns, combinedRows);
  const hasEmptyNames = outputColumns.some((column) => column.name.trim() === '');
  const hasDuplicateNames = hasDuplicateColumnNames(outputColumns);
  const unmappedColumnCount = countUnmappedOutputColumns(sources, outputColumns, mappings);
  const hasUnmappedColumns = unmappedColumnCount > 0;
  const baseText = nameMode === 'default' ? 'Archivo combinado' : outputFileName;
  const finalFileName = buildCombineFinalFileName({ baseText, includeBaseText, includeDate, includeTime });

  useEffect(() => {
    if (nameMode === 'default' && getCombineNameMode(outputFileName) === 'custom') {
      setNameMode('custom');
    }
  }, [nameMode, outputFileName]);

  const downloadExcel = async () => {
    if (disabledReason) {
      return;
    }
    const { exportCombinedXlsx } = await import('../../domain/combine/exportCombinedXlsx');
    exportCombinedXlsx({ outputColumns, combinedRows, fileName: finalFileName });
  };
  const downloadCsv = async () => {
    if (disabledReason) {
      return;
    }
    const { exportCombinedCsv } = await import('../../domain/combine/exportCombinedCsv');
    exportCombinedCsv({ outputColumns, combinedRows, fileName: finalFileName });
  };

  return (
    <>
      <section className="panel combineFlowPanel combineFileNamePanel">
        <h2>6. Nombre del archivo</h2>
        <div className="manager combineExportNameManager">
          <div className="segmentedControl">
            <label>
              <input
                type="radio"
                name="combine-file-name-mode"
                checked={nameMode === 'default'}
                onChange={() => {
                  setNameMode('default');
                  onOutputFileNameChange('Archivo combinado');
                }}
              />
              Nombre predeterminado
            </label>
            <label>
              <input
                type="radio"
                name="combine-file-name-mode"
                checked={nameMode === 'custom'}
                onChange={() => setNameMode('custom')}
              />
              Nombre personalizado
            </label>
          </div>

          {nameMode === 'custom' ? (
            <label className="field combineExportBaseName">
              <span>Nombre base</span>
              <input
                value={outputFileName}
                placeholder="Archivo combinado"
                onChange={(event) => onOutputFileNameChange(event.target.value)}
              />
            </label>
          ) : null}

          <div className="presetBar combineExportNameOptions">
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={includeBaseText}
                onChange={(event) => setIncludeBaseText(event.target.checked)}
              />
              Incluir texto base
            </label>
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={(event) => {
                  setIncludeDate(event.target.checked);
                  if (!event.target.checked) {
                    setIncludeTime(false);
                  }
                }}
              />
              Incluir fecha actual
            </label>
            <TimeCheckbox
              checked={includeDate && includeTime}
              disabled={!includeDate}
              onChange={(checked) => setIncludeTime(checked)}
            />
          </div>

          <div className="filenamePreview combineFinalName">
            <div className="combineFinalNameCopy">
              <strong>Nombre final</strong>
              <span>{finalFileName}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel combineFlowPanel combineExportPanel">
        <h2>7. Descargar archivo</h2>
        <div className="combineExportSummaryRow">
          <p className="muted combineExportSummary">
            Se exportarán {combinedRows.length} {combinedRows.length === 1 ? 'fila' : 'filas'} y{' '}
            {outputColumns.length} {outputColumns.length === 1 ? 'columna' : 'columnas'} desde{' '}
            {sources.length} {sources.length === 1 ? 'archivo' : 'archivos'}.
          </p>
          {hasUnmappedColumns ? (
            <InfoTooltip content={buildUnmappedExportTooltip(unmappedColumnCount)} placement="top">
              <span className="combineUnmappedChip">Sin asignar</span>
            </InfoTooltip>
          ) : null}
        </div>

        {hasEmptyNames ? <p className="combineColumnWarning">Columnas sin nombre usarán “Columna sin nombre”.</p> : null}
        {hasDuplicateNames ? <p className="combineColumnWarning">Nombres duplicados se conservarán en el Excel.</p> : null}

        <div className="combineExportOperationRow">
          <CombineSourceMetadata
            options={sourceMetadataOptions}
            onChange={onSourceMetadataOptionsChange}
          />

          <div className="actions combineFinalDownloadActions">
            <ActionButton action="download" disabled={Boolean(disabledReason)} onClick={() => void downloadExcel()}>
              Descargar Excel combinado
            </ActionButton>
            <ActionButton action="download" variant="secondary" disabled={Boolean(disabledReason)} onClick={() => void downloadCsv()}>
              Exportar CSV
            </ActionButton>
          </div>
        </div>
        {disabledReason ? <p className="muted combineExportDisabledReason">{disabledReason}</p> : null}
      </section>
    </>
  );
}

function TimeCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const control = (
    <label className={`checkboxField${disabled ? ' isDisabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      Incluir hora actual
    </label>
  );

  return disabled ? (
    <InfoTooltip content="Primero activá ‘Incluir fecha actual’." placement="top">
      {control}
    </InfoTooltip>
  ) : control;
}

export function buildCombineFinalFileName({
  baseText,
  includeBaseText,
  includeDate,
  includeTime,
  now = new Date(),
}: {
  baseText: string;
  includeBaseText: boolean;
  includeDate: boolean;
  includeTime: boolean;
  now?: Date;
}) {
  const parts = [
    includeBaseText ? sanitizeCombineFileNamePart(baseText) : '',
    includeDate ? formatCombineDatePart(now, includeTime) : '',
  ].filter(Boolean);

  return parts.join(' - ') || 'Archivo combinado';
}

function getCombineNameMode(fileName: string): 'default' | 'custom' {
  return fileName.trim() === '' || fileName === 'Archivo combinado' ? 'default' : 'custom';
}

function sanitizeCombineFileNamePart(value: string) {
  return value
    .trim()
    .replace(/(?:\.(?:xlsx|csv))+$/i, '')
    .replace(/[\/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCombineDatePart(value: Date, includeTime: boolean) {
  const date = [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');

  if (!includeTime) {
    return date;
  }

  return `${date}_${String(value.getHours()).padStart(2, '0')}-${String(value.getMinutes()).padStart(2, '0')}`;
}

function getExportDisabledReason(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  combinedRows: CombinedRow[],
) {
  if (sources.length === 0) {
    return 'Cargá al menos un archivo para exportar.';
  }
  if (outputColumns.length === 0) {
    return 'Definí al menos una columna de salida para exportar.';
  }
  if (combinedRows.length === 0) {
    return 'No hay filas combinadas para exportar.';
  }
  return '';
}

function hasDuplicateColumnNames(outputColumns: CombineOutputColumn[]) {
  const names = outputColumns
    .map((column) => normalizeCombineColumnName(column.name))
    .filter(Boolean);
  return new Set(names).size !== names.length;
}

function countUnmappedOutputColumns(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  mappings: CombineColumnMapping[],
) {
  const mappedPairs = new Set(
    mappings
      .filter((mapping) => Boolean(mapping.sourceColumnId))
      .map((mapping) => `${mapping.sourceId}\u0000${mapping.outputColumnId}`),
  );
  return outputColumns
    .filter((column) => !isSourceMetadataColumn(column.id))
    .filter((column) => sources.some((source) => (
      !mappedPairs.has(`${source.id}\u0000${column.id}`)
    )))
    .length;
}

function buildUnmappedExportTooltip(unmappedColumnCount: number) {
  return `${unmappedColumnCount} ${unmappedColumnCount === 1 ? 'columna sin asignar' : 'columnas sin asignar'}. Las columnas sin asignar generarán celdas vacías.`;
}
