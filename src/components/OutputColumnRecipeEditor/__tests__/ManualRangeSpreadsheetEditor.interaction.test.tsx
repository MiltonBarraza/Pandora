// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { InputColumn, InputRow, OutputRecipe } from '../../../types/import';
import { Modal } from '../../Modal/Modal';
import { ManualRangeAdvancedRangeModal, validateManualRangeBounds } from '../ManualRangeAdvancedRangeModal';
import { ManualRangeSpreadsheetEditor } from '../ManualRangeSpreadsheetEditor';
import { getManualRangePreviewValueForRow } from '../ManualRangeSpreadsheetEditor.helpers';

const inputColumns: InputColumn[] = [{
  id: 'input-code',
  columnIndex: 0,
  columnLetter: 'A',
  label: 'Código',
  active: true,
  sampleValues: [],
  nonEmptyCount: 2,
}];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-code': 'P-1' } },
  { rowNumber: 12, values: { 'input-code': 'P-2' } },
];

const range = {
  id: 'range-8-12',
  startRowNumber: 8,
  endRowNumber: 12,
  valueRecipe: { source: { type: 'fixedText' as const, value: 'A' }, steps: [] },
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('ManualRangeAdvancedRangeModal validation', () => {
  it('validates required, positive integer, and ordered bounds', () => {
    expect(validateManualRangeBounds('', '12').error).toContain('Completá');
    expect(validateManualRangeBounds('0', '12').error).toContain('mayores o iguales a 1');
    expect(validateManualRangeBounds('abc', '12').error).toContain('números enteros');
    expect(validateManualRangeBounds('13', '12').error).toContain('menor o igual');
    expect(validateManualRangeBounds('8', '12')).toEqual({ startRowNumber: 8, endRowNumber: 12, error: null });
  });

  it('allows temporary empty input, blocks invalid accept, and accepts corrected bounds', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    const startInput = screen.getByLabelText('Inicio') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fin') as HTMLInputElement;
    const acceptButton = screen.getByRole('button', { name: 'Aceptar' }) as HTMLButtonElement;

    await user.clear(startInput);
    expect(startInput.value).toBe('');
    expect(acceptButton.disabled).toBe(true);
    await user.click(acceptButton);
    expect(onChange).not.toHaveBeenCalled();

    await user.type(startInput, '13');
    expect(acceptButton.disabled).toBe(true);
    await user.clear(startInput);
    await user.type(startInput, '9');
    await user.clear(endInput);
    await user.type(endInput, '12');
    expect(acceptButton.disabled).toBe(false);
    await user.click(acceptButton);

    expect(onChange).toHaveBeenCalledWith({
      type: 'manualRange',
      ranges: [expect.objectContaining({ id: range.id, startRowNumber: 9, endRowNumber: 12 })],
    });
  });
});

describe('overlapping manual range ordering', () => {
  it('sorts directly when ranges do not overlap', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { ...range, id: 'later', startRowNumber: 20, endRowNumber: 22 },
        { ...range, id: 'earlier', startRowNumber: 8, endRowNumber: 12 },
      ],
    };
    render(
      <ManualRangeSpreadsheetEditor
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ordenar por inicio' }));
    expect(screen.queryByRole('heading', { name: 'Ordenar rangos solapados' })).toBeNull();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ranges: [expect.objectContaining({ id: 'earlier' }), expect.objectContaining({ id: 'later' })],
    }));
  });

  it('asks before sorting overlaps, keeps parent open on Escape, and sorts only after confirm', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [
        { ...range, id: 'priority-first', startRowNumber: 10, endRowNumber: 15, valueRecipe: { source: { type: 'fixedText', value: 'Primero' }, steps: [] } },
        { ...range, id: 'earlier-overlap', startRowNumber: 8, endRowNumber: 12, valueRecipe: { source: { type: 'fixedText', value: 'Segundo' }, steps: [] } },
      ],
    };
    render(
      <Modal open title="Editor padre" onClose={() => undefined}>
        <ManualRangeSpreadsheetEditor
          recipe={recipe}
          inputColumns={inputColumns}
          manualRangeRows={manualRangeRows}
          onChange={onChange}
        />
      </Modal>,
    );

    expect(getManualRangePreviewValueForRow(10, recipe.ranges)).toBe('Primero');
    await user.click(screen.getByRole('button', { name: 'Ordenar por inicio' }));
    expect(screen.getByRole('heading', { name: 'Ordenar rangos solapados' })).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Cancelar' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: 'Ordenar rangos solapados' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Editor padre' })).not.toBeNull();
    expect(screen.getByText('Vista de filas para rangos')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ordenar por inicio' }));
    await user.click(screen.getByRole('button', { name: 'Ordenar' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ranges: [expect.objectContaining({ id: 'earlier-overlap' }), expect.objectContaining({ id: 'priority-first' })],
    }));
    const sortedRecipe = onChange.mock.calls[0][0] as Extract<OutputRecipe, { type: 'manualRange' }>;
    expect(getManualRangePreviewValueForRow(10, sortedRecipe.ranges)).toBe('Segundo');
  });
});
