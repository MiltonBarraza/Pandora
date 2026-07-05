// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
}, {
  id: 'input-name',
  columnIndex: 1,
  columnLetter: 'B',
  label: 'Nombre',
  active: true,
  sampleValues: [],
  nonEmptyCount: 1,
}];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-code': 'P-1', 'input-name': 'Pincel' } },
  { rowNumber: 12, values: { 'input-code': 'P-2', 'input-name': '' } },
];

const range = {
  id: 'range-8-12',
  startRowNumber: 8,
  endRowNumber: 12,
  valueRecipe: { source: { type: 'fixedText' as const, value: 'A' }, steps: [] },
};

const unconfiguredRange = {
  id: 'range-empty',
  startRowNumber: 8,
  endRowNumber: 12,
  valueRecipe: { source: { type: 'fixedText' as const, value: '' }, steps: [] },
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

async function selectDropdownOption(user: ReturnType<typeof userEvent.setup>, label: string, optionName: string) {
  const triggers = screen.getAllByRole('button', { name: label });
  await user.click(triggers[triggers.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

async function selectModalDropdownOption(user: ReturnType<typeof userEvent.setup>, label: RegExp, optionName: string | RegExp) {
  const dialog = screen.getByRole('dialog');
  const triggers = within(dialog).getAllByRole('button', { name: label });
  await user.click(triggers[triggers.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

async function selectModalSearchableDropdownOption(user: ReturnType<typeof userEvent.setup>, label: RegExp, optionName: string | RegExp) {
  const dialog = screen.getByRole('dialog');
  const triggers = within(dialog).getAllByRole('combobox', { name: label });
  await user.click(triggers[triggers.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

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
        visibleColumnIds={['input-code']}
        showResultColumn
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

  it('does not accept edited bounds that overlap another range', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const firstRange = { ...range, id: 'range-8-10', startRowNumber: 8, endRowNumber: 10 };
    const secondRange = { ...range, id: 'range-12-14', startRowNumber: 12, endRowNumber: 14 };
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [firstRange, secondRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={firstRange}
        inputColumns={inputColumns}
        manualRangeRows={[...manualRangeRows, { rowNumber: 14, values: { 'input-code': 'P-3', 'input-name': '' } }]}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={onChange}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    const endInput = screen.getByLabelText('Fin') as HTMLInputElement;
    const acceptButton = screen.getByRole('button', { name: 'Aceptar' }) as HTMLButtonElement;

    await user.clear(endInput);
    await user.type(endInput, '12');

    expect(screen.getByText('Este rango se superpone con el rango 12 - 14.')).not.toBeNull();
    expect(acceptButton.disabled).toBe(true);
    await user.click(acceptButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts edited range data when the interval still only matches itself', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const firstRange = { ...range, id: 'range-8-10', startRowNumber: 8, endRowNumber: 10 };
    const secondRange = { ...range, id: 'range-12-14', startRowNumber: 12, endRowNumber: 14 };
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [firstRange, secondRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={firstRange}
        inputColumns={inputColumns}
        manualRangeRows={[...manualRangeRows, { rowNumber: 10, values: { 'input-code': 'P-10', 'input-name': '' } }]}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={onChange}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const textInput = screen.getByText('Texto').closest('label')?.querySelector('input') as HTMLInputElement;
    await user.clear(textInput);
    await user.type(textInput, 'Nuevo');
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ranges: [
        expect.objectContaining({
          id: 'range-8-10',
          startRowNumber: 8,
          endRowNumber: 10,
          valueRecipe: expect.objectContaining({ source: { type: 'fixedText', value: 'Nuevo' } }),
        }),
        expect.objectContaining({ id: 'range-12-14' }),
      ],
    }));
  });

  it('mirrors main columns and result, then toggles to all columns without mojibake placeholders', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    const table = document.querySelector('.manualRangeCoveredRowsTable') as HTMLTableElement;
    expect(table).not.toBeNull();
    expect(Array.from(table.querySelectorAll('thead th')).map((cell) => cell.textContent)).toEqual(['Fila', 'A', 'Resultado']);
    expect(table.textContent).toContain('A');

    await user.click(screen.getByLabelText('Usar mismas columnas que la tabla principal'));
    expect(Array.from(table.querySelectorAll('thead th')).map((cell) => cell.textContent)).toEqual(['Fila', 'A', 'B', 'Resultado']);
    const secondRowCells = table.querySelectorAll('tbody tr')[1].querySelectorAll('td');
    expect(secondRowCells[1].textContent).toBe('');
    expect(table.textContent).not.toMatch(/â|Ã¢|Â/);
  });
  it('starts the range value editor unconfigured with condition and the new step layout', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Paso 1 .* Sin configurar/)).not.toBeNull();
    expect(within(dialog).getByRole('button', { name: /Tipo de operaci.n/ }).textContent).toContain('Trabajar con texto');
    expect(within(dialog).getByRole('button', { name: /Acci.n/ }).textContent).toContain('Seleccionar');
    expect(within(dialog).getByRole('button', { name: /Condici.n/ })).not.toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Agregar paso' })).not.toBeNull();
    expect(within(dialog).queryByText('Pasos adicionales')).toBeNull();
    expect(within(dialog).queryByText('Sin pasos adicionales.')).toBeNull();
    expect(within(dialog).queryByLabelText('Texto')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Columna de entrada' })).toBeNull();
    expect(document.querySelector('.rangeValueAdditionalHeader')).toBeNull();
  });

  it('does not render the old additional-steps section in range value modes', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    for (const mode of [/Trabajar con n.mero/, 'Trabajar con fechas', /Conversi.n/, 'Trabajar con texto']) {
      await selectModalDropdownOption(user, /Tipo de operaci.n/, mode);
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByText('Pasos adicionales')).toBeNull();
      expect(within(dialog).queryByText('Sin pasos adicionales.')).toBeNull();
      expect(within(dialog).getByRole('button', { name: 'Agregar paso' })).not.toBeNull();
      expect(document.querySelector('.rangeValueAdditionalHeader')).toBeNull();
    }

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    expect(screen.queryByText('Pasos adicionales')).toBeNull();
    expect(screen.queryByText('Sin pasos adicionales.')).toBeNull();
    expect(document.querySelector('.rangeValueAdditionalHeader')).toBeNull();
  });

  it('keeps range value derived inputs in the derived grid after selecting text actions', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const textInput = screen.getByLabelText('Texto');
    expect(textInput.closest('.rangeValueSourceControls')).not.toBeNull();
    expect(textInput.closest('.rangeValuePrimaryControls')).toBeNull();
    expect(screen.getByRole('button', { name: /Condici.n/ })).not.toBeNull();
    expect(screen.queryByText('Pasos adicionales')).toBeNull();

    await selectModalDropdownOption(user, /Acci.n/, 'Usar columna de entrada');
    const columnButton = screen.getByRole('button', { name: 'Columna de entrada' });
    expect(columnButton.closest('.rangeValueSourceControls')).not.toBeNull();
    expect(columnButton.closest('.rangeValuePrimaryControls')).toBeNull();
  });

  it('keeps texto encontrado as the visible action after selecting a found range value', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Texto encontrado en el rango');
    await selectModalSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    const actionButton = within(screen.getByRole('dialog')).getByRole('button', { name: /Acci.n/ });
    expect(actionButton.textContent).toContain('Texto encontrado en el rango');
    expect(actionButton.textContent).not.toContain('Usar texto fijo');
    expect(screen.getByDisplayValue('P-1')).not.toBeNull();
    expect(document.querySelector('.manualRangeCoveredRowsTable')?.textContent).toContain('P-1');
  });

  it('keeps lowercase action when a cell text picker value is selected', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, /Convertir a min.sculas/);
    await selectModalDropdownOption(user, /Qu. valor usar/, 'Elegir texto desde celda');
    await selectModalSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    const actionButton = within(screen.getByRole('dialog')).getByRole('button', { name: /Acci.n/ });
    expect(actionButton.textContent).toMatch(/Convertir a min.sculas/);
    expect(actionButton.textContent).not.toContain('Usar texto fijo');
    const sourceButton = within(screen.getByRole('dialog')).getByRole('button', { name: /Qu. valor usar/ });
    expect(sourceButton.textContent).toContain('Elegir texto desde celda');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-1'));
    expect(document.querySelector('.manualRangeCoveredRowsTable')?.textContent).toContain('p-1');
  });

  it('does not show the text input when a range number operation is selected', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Tipo de operaci.n/, /Trabajar con n.mero/);
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByRole('button', { name: /valor usar/ })).toBeNull();

    const actionButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Acci.n/ });
    await user.click(actionButtons[actionButtons.length - 1]);
    expect(screen.queryByRole('option', { name: /Operaci.n num.rica/ })).toBeNull();
    await user.click(screen.getByRole('option', { name: 'Sumar valor' }));

    expect(screen.queryByLabelText('Texto')).toBeNull();
    expect(screen.queryByLabelText('Texto fijo')).toBeNull();
    expect(screen.getByRole('button', { name: 'Primer valor' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Segundo valor' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Decimales / redondeo' })).not.toBeNull();
  });

  it('does not render mojibake in the range modal labels', () => {
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    const dialogText = screen.getByRole('dialog').textContent ?? '';
    expect(dialogText).toContain('Seleccionar acción');
    expect(dialogText).not.toMatch(/[ÃÂâ]/);
  });

  it('uses the main compose parts UI when choosing concat for a range value', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectDropdownOption(user, 'Acción', 'Concatenar');

    expect(document.querySelector('.composePartsBuilder')).not.toBeNull();
    expect(document.querySelector('.compositionTokenCard')).not.toBeNull();
    expect(document.querySelector('.composeTokenInspector')).not.toBeNull();
    expect(screen.getByText('Editor de partes')).not.toBeNull();
    expect(screen.getByText('Parte seleccionada')).not.toBeNull();
    expect(document.querySelector('.concatPartsSidebar')).toBeNull();
    expect(document.querySelector('.rangeValueConcatWorkspaceFlat')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
    expect(document.querySelectorAll('.compositionTokenCard')).toHaveLength(2);
    expect(document.querySelector('.composeTokenInspectorHeader strong')?.textContent).toBe('Parte 2');

    await user.click(screen.getAllByRole('button', { name: /Parte 1/ })[0]);
    expect(document.querySelector('.composeTokenInspectorHeader strong')?.textContent).toBe('Parte 1');
  });

  it('starts range concat like the main concat editor instead of previous result', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Editor de partes')).not.toBeNull();
    expect(within(dialog).getByText('Parte seleccionada')).not.toBeNull();
    expect(within(dialog).queryByText('Resultado anterior')).toBeNull();
    expect(within(dialog).queryByText(/Paso 1 .* Usar resultado anterior/)).toBeNull();
    expect(document.querySelector('.composeTokenInspector')?.textContent).toContain('Paso 1');
    expect(document.querySelector('.composeTokenInspector')?.textContent).toContain('Sin configurar');
    expect(within(dialog).queryByRole('button', { name: 'Columna de entrada' })).toBeNull();
    expect(document.querySelector('.compositionTokenCard.selected')?.textContent).not.toContain('A');
    expect(within(dialog).getAllByRole('button', { name: /Condici.n/ })).toHaveLength(1);
    expect(within(dialog).queryByText('Pasos adicionales')).toBeNull();
    expect(within(dialog).queryByText('Sin pasos adicionales.')).toBeNull();
    const rangeComposeStudio = document.querySelector('.rangeValueComposeStudio');
    expect(rangeComposeStudio?.closest('.stepFullWidthFields')).not.toBeNull();
    expect(rangeComposeStudio?.closest('.rangeValuePrimaryStepFields')).toBeNull();
    expect(rangeComposeStudio?.closest('.stepExtraFieldsRow')).toBeNull();
    expect(rangeComposeStudio?.parentElement?.classList.contains('stepFullWidthFields')).toBe(true);

    const conditionButtons = within(dialog).getAllByRole('button', { name: /Condici.n/ });
    const conditionButton = conditionButtons[0];
    const addStepButton = within(dialog).getByRole('button', { name: 'Agregar paso' });
    expect(conditionButton.compareDocumentPosition(addStepButton) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(addStepButton.closest('.concatPartStepsActions')?.parentElement?.classList.contains('rangeValuePrimaryLayout')).toBe(true);
  });

  it('updates range concat part actions without getting stuck on previous result', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const fixedTextInput = screen.getByLabelText('Texto fijo');
    expect(fixedTextInput).not.toBeNull();
    expect(fixedTextInput.closest('.rangeValueSourceControls')).not.toBeNull();
    expect(fixedTextInput.closest('.rangeValuePrimaryControls')).toBeNull();
    expect(screen.queryByText('Resultado anterior')).toBeNull();

    await selectModalDropdownOption(user, /Acci.n/, 'Usar columna de entrada');
    expect(screen.getByRole('button', { name: 'Columna de entrada' })).not.toBeNull();

    await selectModalDropdownOption(user, /Acci.n/, 'Agregar sufijo');
    const suffixInput = screen.getByLabelText('Sufijo');
    expect(suffixInput).not.toBeNull();
    expect(suffixInput.closest('.rangeValuePrimaryControls')).toBeNull();
    expect(screen.queryByText('Resultado anterior')).toBeNull();
  });

  it('keeps concat part cell text picker action after selecting a found value', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Acci.n/, 'Elegir texto desde celda');
    await selectModalSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    const actionButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Acci.n/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    expect(actionButtons[actionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    expect(screen.queryByText('Resultado anterior')).toBeNull();
  });

  it('keeps range concat cell text picker value stable after changing actions', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Acci.n/, 'Elegir texto desde celda');
    await selectModalSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    let actionButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Acci.n/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-1'));

    await selectModalDropdownOption(user, /Acci.n/, /Convertir a min.sculas/);
    await selectModalDropdownOption(user, /Qu. valor usar/, 'Elegir texto desde celda');
    await selectModalSearchableDropdownOption(user, /Texto encontrado/, 'P-2');

    actionButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Acci.n/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toMatch(/Convertir a min.sculas/);
    expect(actionButtons[actionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    const sourceButtons = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Qu. valor usar/ });
    expect(sourceButtons[sourceButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-2'));
    expect(document.querySelector('.manualRangeCoveredRowsTable')?.textContent).toContain('p-2');
  });

  it('shows previous result value for additional range value steps', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const textInput = within(screen.getByRole('dialog')).getByText('Texto').closest('label')?.querySelector('input') as HTMLInputElement;
    textInput.focus();
    await user.type(textInput, 'asd', { skipClick: true });
    await waitFor(() => expect((within(screen.getByRole('dialog')).getByText('Texto').closest('label')?.querySelector('input') as HTMLInputElement).value).toBe('asd'));

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar paso' }));
    await selectModalDropdownOption(user, /Acci.n/, /Convertir a may.sculas/);

    expect(screen.getByRole('dialog').querySelector('.previousResultValueField input')?.getAttribute('value')).toBe('Resultado del paso anterior');
    expect(document.querySelector('.manualRangeCoveredRowsTable')?.textContent).toContain('ASD');
  });

  it('shows previous result value for additional range concat part steps', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [unconfiguredRange] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={unconfiguredRange}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const fixedTextInput = within(screen.getByRole('dialog')).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    fixedTextInput.focus();
    await user.type(fixedTextInput, 'asd', { skipClick: true });
    await waitFor(() => expect((within(screen.getByRole('dialog')).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement).value).toBe('asd'));

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar paso' }));
    await selectModalDropdownOption(user, /Acci.n/, /Convertir a may.sculas/);

    expect(screen.getByRole('dialog').querySelector('.previousResultValueField input')?.getAttribute('value')).toBe('Resultado del paso anterior');
    expect(document.querySelector('.manualRangeCoveredRowsTable')?.textContent).toContain('ASD');
  });

  it('keeps the additional-step delete button inside the range concat step card', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Agregar paso' }));

    const inspector = document.querySelector('.composeTokenInspector') as HTMLElement;
    const deleteButton = within(inspector).getByRole('button', { name: 'Eliminar paso' });
    const stepPanel = deleteButton.closest('.stepDetailPanel');
    expect(stepPanel).not.toBeNull();
    expect(stepPanel?.closest('.concatPartStepDivider')).not.toBeNull();
    expect(deleteButton.closest('.stepCardHeader')).toBe(stepPanel?.querySelector('.stepCardHeader'));
  });

  it('shows useful number and date sources inside range concat parts', async () => {
    const user = userEvent.setup();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = { type: 'manualRange', ranges: [range] };
    render(
      <ManualRangeAdvancedRangeModal
        open
        recipe={recipe}
        range={range}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        visibleColumnIds={['input-code']}
        showResultColumn
        onChange={() => undefined}
        onClose={() => undefined}
        onRemove={() => undefined}
      />,
    );

    await selectModalDropdownOption(user, /Acci.n/, 'Concatenar');
    await selectModalDropdownOption(user, /Tipo de operaci.n/, /Trabajar con n.mero/);
    expect(screen.queryByText('Resultado anterior')).toBeNull();
    await selectModalDropdownOption(user, /Acci.n/, 'Usar valor tal cual');
    expect(screen.getByRole('button', { name: /valor usar/ })).not.toBeNull();
    await selectModalDropdownOption(user, /valor usar/, 'Valor fijo');
    await waitFor(() => expect(screen.getByLabelText('Valor fijo')).not.toBeNull());

    await selectModalDropdownOption(user, /Tipo de operaci.n/, 'Trabajar con fechas');
    expect(screen.queryByText('Resultado anterior')).toBeNull();
    await selectModalDropdownOption(user, /Acci.n/, 'Usar valor tal cual');
    expect(screen.getByRole('button', { name: /fecha usar/ })).not.toBeNull();
    await selectModalDropdownOption(user, /fecha usar/, 'Fecha fija');
    await waitFor(() => expect(screen.getByLabelText('Fecha fija')).not.toBeNull());
  });
});

describe('overlapping manual range ordering', () => {
  it('does not create a manual selection that overlaps an existing range', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{ ...range, id: 'range-8-12', startRowNumber: 8, endRowNumber: 12 }],
    };
    render(
      <ManualRangeSpreadsheetEditor
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={[
          { rowNumber: 7, values: { 'input-code': 'P-0', 'input-name': '' } },
          ...manualRangeRows,
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 7' }));
    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 8' }));

    expect(screen.getByText('Este rango se superpone con el rango 8 - 12.')).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Crear rango' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('creates contiguous manual selections that do not overlap existing ranges', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const recipe: Extract<OutputRecipe, { type: 'manualRange' }> = {
      type: 'manualRange',
      ranges: [{ ...range, id: 'range-8-12', startRowNumber: 8, endRowNumber: 12 }],
    };
    render(
      <ManualRangeSpreadsheetEditor
        recipe={recipe}
        inputColumns={inputColumns}
        manualRangeRows={[
          ...manualRangeRows,
          { rowNumber: 13, values: { 'input-code': 'P-3', 'input-name': '' } },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 13' }));
    await user.click(screen.getByRole('button', { name: 'Crear rango' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      ranges: [
        expect.objectContaining({ id: 'range-8-12' }),
        expect.objectContaining({ startRowNumber: 13, endRowNumber: 13 }),
      ],
    }));
  });

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
