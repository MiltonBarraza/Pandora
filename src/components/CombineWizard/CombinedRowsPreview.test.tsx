// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
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
      />,
    );

    expect(container.querySelectorAll('.combinePreviewTable tbody tr')).toHaveLength(30);
    expect(container.textContent).toContain('Mostrando las primeras 30 de 45 filas combinadas.');

    const exportAoA = buildCombinedExportAoA({ outputColumns, combinedRows: rows });
    expect(exportAoA).toHaveLength(46);
    expect(exportAoA[45]).toEqual(['Valor 45']);
  });
});

const sources: CombineSource[] = [{
  id: 'source:1',
  fileName: 'volumen.xlsx',
  columns: [{ id: 'input', name: 'Resultado', index: 0 }],
  rows: [],
}];
