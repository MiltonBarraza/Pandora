import { readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { selectDropdownOption } from '../support/dropdown';
import { writeSuggestedRangesWorkbook } from '../fixtures/builders/workbookBuilder';

const expectedRows = [
  ['Producto', 'Categoría sugerida', 'Bloque sugerido'],
  ['Pincel', 'Pintura', 'Grupo A'],
  ['Rodillo', 'Pintura', 'Grupo A'],
  ['Brocha', 'Pintura', ''],
  ['Martillo', 'Herramientas', 'Grupo B'],
  ['Lija', 'Herramientas', 'Grupo B'],
  ['Espátula', 'Herramientas', 'Grupo B'],
];

test('aplica los dos criterios de rangos sugeridos y exporta el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('productos-rangos-sugeridos.xlsx');
  writeSuggestedRangesWorkbook(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('productos-rangos-sugeridos.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja', exact: true })).toContainText('Productos');

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Producto');
  await expect(activeColumns).toContainText('Inicio categoría');
  await expect(activeColumns).toContainText('Bloque');

  const outputColumns = page.getByRole('region', { name: '6. Columnas de salida' });
  await addDirectOutputColumn(page, outputColumns, 'Producto', 'A - Producto');

  await addManualRangeOutputColumn(page, outputColumns, 'Categoría sugerida');
  const categoryDialog = page.getByRole('dialog', { name: 'Columna: "Categoría sugerida"' });
  await configureSuggestedRanges(page, categoryDialog, {
    inputColumn: 'Inicio categoría',
    criterion: 'Cada dato inicia un rango',
    valueMode: 'Valor detectado',
    criterionSummary: /Cada rango termina antes del siguiente dato encontrado/,
    expectedSuggestions: [
      { range: '2 - 4', value: 'Pintura' },
      { range: '5 - 7', value: 'Herramientas' },
    ],
    absentRanges: ['2 - 2', '5 - 5'],
  });
  await expect(categoryDialog.getByRole('button', { name: /2 - 4.*Texto encontrado: Pintura/ })).toBeVisible();
  await expect(categoryDialog.getByRole('button', { name: /5 - 7.*Texto encontrado: Herramientas/ })).toBeVisible();
  await expect(categoryDialog.getByRole('button', { name: 'Seleccionar fila 4' })).toContainText('Pintura');
  await categoryDialog.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(categoryDialog).toBeHidden();

  await addManualRangeOutputColumn(page, outputColumns, 'Bloque sugerido');
  const blockDialog = page.getByRole('dialog', { name: 'Columna: "Bloque sugerido"' });
  await configureSuggestedRanges(page, blockDialog, {
    inputColumn: 'Bloque',
    criterion: 'Bloques consecutivos con datos',
    valueMode: 'Primer valor de columna',
    valueColumn: 'Bloque',
    criterionSummary: /un rango por cada bloque consecutivo con datos/,
    expectedSuggestions: [
      { range: '2 - 3', value: 'Grupo A' },
      { range: '5 - 7', value: 'Grupo B' },
    ],
    absentRanges: ['2 - 4', '4 - 4', '4 - 7'],
  });
  await expect(blockDialog.getByRole('button', { name: /2 - 3.*Texto encontrado: Grupo A/ })).toBeVisible();
  await expect(blockDialog.getByRole('button', { name: /5 - 7.*Texto encontrado: Grupo B/ })).toBeVisible();
  await expect(blockDialog.getByRole('button', { name: 'Seleccionar fila 4' })).not.toContainText('Grupo');
  await blockDialog.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(blockDialog).toBeHidden();

  await expect(outputColumns).toContainText('Producto');
  await expect(outputColumns).toContainText('Categoría sugerida');
  await expect(outputColumns).toContainText('Bloque sugerido');
  await expect(outputColumns).toContainText('2 rangos creados');

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview.getByRole('columnheader')).toHaveCount(3);
  await expect(finalPreview.getByRole('columnheader', { name: 'Producto' })).toBeVisible();
  await expect(finalPreview.getByRole('columnheader', { name: 'Categoría sugerida' })).toBeVisible();
  await expect(finalPreview.getByRole('columnheader', { name: 'Bloque sugerido' })).toBeVisible();
  await expect(finalPreview.getByRole('row')).toHaveCount(7);
  await expect(finalPreview.getByRole('row', { name: /Pincel.*Pintura.*Grupo A/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Rodillo.*Pintura.*Grupo A/ })).toBeVisible();
  const brochaRow = finalPreview.getByRole('row', { name: /Brocha.*Pintura/ });
  await expect(brochaRow).toBeVisible();
  await expect(brochaRow).not.toContainText('Grupo');
  await expect(finalPreview.getByRole('row', { name: /Martillo.*Herramientas.*Grupo B/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Lija.*Herramientas.*Grupo B/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Espátula.*Herramientas.*Grupo B/ })).toBeVisible();
  await expect(finalPreview).not.toContainText('Inicio categoría');
  await expect(finalPreview).not.toContainText('undefined');
  await expect(finalPreview).not.toContainText('null');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('productos-rangos-sugeridos-descargado.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  expect(rows).toEqual(expectedRows);
  expect(rows).toHaveLength(7);
  expect(rows.slice(1)).toHaveLength(6);
  expect(rows.every((row) => row.length === 3)).toBe(true);
  expect(rows[3][2]).toBe('');
  expect(JSON.stringify(rows)).not.toContain('undefined');
  expect(JSON.stringify(rows)).not.toContain('null');
  expect(JSON.stringify(rows)).not.toContain('Inicio categoría');
  expect(rows[0]).not.toContain('Bloque');
});

async function addDirectOutputColumn(page: Page, outputColumns: Locator, name: string, inputColumn: string) {
  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill(name);
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Directa desde entrada');
  await selectDropdownOption(page, outputColumns, 'Columna de entrada', inputColumn);
}

async function addManualRangeOutputColumn(page: Page, outputColumns: Locator, name: string) {
  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill(name);
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Crear valor personalizado');
  await outputColumns.getByRole('button', { name: 'Editar' }).click();

  const recipeDialog = page.getByRole('dialog', { name: `Columna: "${name}"` });
  await selectDropdownOption(page, recipeDialog, 'Tipo de operación', 'Trabajar con rangos');
  await expect(recipeDialog.getByText('Vista de filas para rangos')).toBeVisible();
}

async function configureSuggestedRanges(
  page: Page,
  recipeDialog: Locator,
  options: {
    inputColumn: string;
    criterion: string;
    valueMode: string;
    valueColumn?: string;
    criterionSummary: RegExp;
    expectedSuggestions: Array<{ range: string; value: string }>;
    absentRanges: string[];
  },
) {
  await recipeDialog.getByRole('button', { name: 'Rangos sugeridos' }).click();
  const suggestedDialog = page.getByRole('dialog', { name: 'Rangos sugeridos' });
  await expect(suggestedDialog).toBeVisible();

  await selectDropdownOption(page, suggestedDialog, 'Criterio', options.criterion);
  await selectDropdownOption(page, suggestedDialog, /Buscar inicios en|Columna que marca el bloque/, options.inputColumn);
  await selectDropdownOption(page, suggestedDialog, 'Guardar como valor', options.valueMode);
  if (options.valueColumn) {
    await selectDropdownOption(page, suggestedDialog, 'Columna para valor', options.valueColumn);
  }
  await suggestedDialog.getByLabel('Desde fila').fill('2');
  await suggestedDialog.getByLabel('Hasta fila').fill('7');

  await expect(suggestedDialog.getByText(options.criterionSummary)).toBeVisible();
  await suggestedDialog.getByRole('button', { name: 'Buscar', exact: true }).click();

  await expect(suggestedDialog.getByText('Se encontraron 2 sugerencias.')).toBeVisible();
  await expect(suggestedDialog.getByText('2 seleccionadas.')).toBeVisible();
  await expect(suggestedDialog.getByRole('checkbox')).toHaveCount(2);

  for (const suggestion of options.expectedSuggestions) {
    await expect(suggestedDialog.getByRole('checkbox', {
      name: new RegExp(`${escapeRegExp(suggestion.range)}.*Texto encontrado: ${escapeRegExp(suggestion.value)}`),
    })).toBeChecked();
  }

  for (const absentRange of options.absentRanges) {
    await expect(suggestedDialog).not.toContainText(absentRange);
  }

  await suggestedDialog.getByRole('button', { name: 'Aplicar seleccionadas' }).click();
  await expect(suggestedDialog).toBeHidden();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
