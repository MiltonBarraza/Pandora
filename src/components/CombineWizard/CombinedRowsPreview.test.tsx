// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCombinedExportAoA } from '../../domain/combine/exportCombinedXlsx';
import type { CombineSource, CombinedRow } from '../../types/combine';
import { CombinedRowsPreview } from './CombinedRowsPreview';

afterEach(cleanup);

describe('CombinedRowsPreview limits', () => {
  it('renders only 30 rows without limiting the export dataset', () => {
    const rows = Array.from({ length: 45 }, (_, index): CombinedRow => ({
      id: `combined:${index}`,
      sourceId: 'source:1',
      sourceFileName: 'volumen.xlsx',
      values: { output: `Valor ${index + 1}` },
    }));
    const outputColumns = [{ id: 'output', name: 'Resultado' }];
    const { container } = render(
      <CombinedRowsPreview
        sources={sources}
        outputColumns={outputColumns}
        mappings={[{ sourceId: 'source:1', outputColumnId: 'output', sourceColumnId: 'input' }]}
        rows={rows}
        resultSort={{ columnId: null, direction: 'asc' }}
        onResultSortChange={() => undefined}
      />,
    );

    expect(container.querySelectorAll('.combinePreviewTable tbody tr')).toHaveLength(30);
    expect(container.textContent).toContain('Mostrando las primeras 30 de 45 filas combinadas.');
    expect(screen.getByText('Sin ordenar, las filas se combinan siguiendo el orden de los archivos cargados.')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Ascendente' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('radio', { name: 'Descendente' })).toHaveProperty('disabled', true);
    const summary = container.querySelector('.combinePreviewSummary');
    const sortPanel = container.querySelector('.combineResultSortPanel');
    const limit = container.querySelector('.combinePreviewLimit');
    expect(screen.getByText('Resumen:')).not.toBeNull();
    expect(screen.getByText('Archivos').parentElement?.textContent).toBe('Archivos1');
    expect(screen.getByText('Filas').parentElement?.textContent).toBe('Filas45');
    expect(screen.getByText('Columnas').parentElement?.textContent).toBe('Columnas1');
    expect(summary?.compareDocumentPosition(sortPanel as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(sortPanel?.compareDocumentPosition(limit as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const exportAoA = buildCombinedExportAoA({ outputColumns, combinedRows: rows });
    expect(exportAoA).toHaveLength(46);
    expect(exportAoA[45]).toEqual(['Valor 45']);
  });

  it('hides the unsorted order helper when a sort column is selected without changing preview rows', () => {
    const rows: CombinedRow[] = [
      { id: 'combined:1', sourceId: 'source:1', sourceFileName: 'b.xlsx', values: { output: 'B' } },
      { id: 'combined:2', sourceId: 'source:1', sourceFileName: 'a.xlsx', values: { output: 'A' } },
    ];
    const { container } = render(
      <CombinedRowsPreview
        sources={sources}
        outputColumns={[{ id: 'output', name: 'Resultado' }]}
        mappings={[{ sourceId: 'source:1', outputColumnId: 'output', sourceColumnId: 'input' }]}
        rows={rows}
        resultSort={{ columnId: 'output', direction: 'asc' }}
        onResultSortChange={() => undefined}
      />,
    );

    expect(screen.queryByText('Sin ordenar, las filas se combinan siguiendo el orden de los archivos cargados.')).toBeNull();
    expect(Array.from(container.querySelectorAll('.combinePreviewTable tbody tr')).map((row) => row.textContent)).toEqual([
      'b.xlsxB',
      'a.xlsxA',
    ]);
  });

  it('shows unmapped columns as a compact tooltip chip', async () => {
    const { container } = render(
      <CombinedRowsPreview
        sources={sourcesWithRows}
        outputColumns={[{ id: 'output', name: 'Resultado' }]}
        mappings={[{ sourceId: 'source:1', outputColumnId: 'output', sourceColumnId: '' }]}
        rows={[]}
        resultSort={{ columnId: null, direction: 'asc' }}
        onResultSortChange={() => undefined}
      />,
    );

    expect(container.querySelector('.combineMappingNotice')).toBeNull();
    expect(container.querySelector('.combinePreviewSummary')?.firstElementChild?.classList).toContain('summaryMetricGroupLabel');
    expect(screen.queryByText('Las columnas sin asignar generarán celdas vacías.')).toBeNull();

    await userEvent.setup().hover(screen.getByText('Sin asignar'));

    expect(await screen.findByText(/1 columna sin asignar/)).not.toBeNull();
    expect(await screen.findByText(/Las columnas sin asignar generarán celdas vacías/)).not.toBeNull();
  });
});

const sources: CombineSource[] = [{
  id: 'source:1',
  fileName: 'volumen.xlsx',
  columns: [{ id: 'input', name: 'Resultado', index: 0 }],
  rows: [],
}];

const sourcesWithRows: CombineSource[] = [{
  ...sources[0],
  rows: [{ id: 'row:1', values: { input: 'A1' } }],
}];
