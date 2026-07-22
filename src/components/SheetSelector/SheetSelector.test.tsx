// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SheetSelector } from './SheetSelector';

afterEach(cleanup);

describe('SheetSelector range warning', () => {
  it('renders a warning beside the sheet label when the range was trimmed', () => {
    render(
      <SheetSelector
        sheetNames={['Hoja 1']}
        selectedSheet="Hoja 1"
        rangeMetadata={{
          originalRef: 'A1:XET109',
          effectiveRef: 'A1:M20',
          wasTrimmed: true,
          shouldShowTrimWarning: true,
          ignoredTrailingColumns: 16361,
          ignoredTrailingRows: 89,
        }}
        onSelectSheet={vi.fn()}
      />,
    );

    expect(screen.getByText('Hoja').parentElement?.querySelectorAll('.infoTooltip')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Advertencia sobre rango de la hoja' })).not.toBeNull();
  });

  it('does not render a warning for a normal sheet', () => {
    render(
      <SheetSelector
        sheetNames={['Hoja 1']}
        selectedSheet="Hoja 1"
        rangeMetadata={{
          originalRef: 'A1:M20',
          effectiveRef: 'A1:M20',
          wasTrimmed: false,
          shouldShowTrimWarning: false,
          ignoredTrailingColumns: 0,
          ignoredTrailingRows: 0,
        }}
        onSelectSheet={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Advertencia sobre rango de la hoja' })).toBeNull();
  });

  it('does not render a warning for a minor trim', () => {
    render(
      <SheetSelector
        sheetNames={['Hoja 1']}
        selectedSheet="Hoja 1"
        rangeMetadata={{
          originalRef: 'A1:P100',
          effectiveRef: 'A1:M100',
          wasTrimmed: true,
          shouldShowTrimWarning: false,
          ignoredTrailingColumns: 3,
          ignoredTrailingRows: 0,
        }}
        onSelectSheet={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Advertencia sobre rango de la hoja' })).toBeNull();
  });
});
