import { readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { selectDropdownOption } from '../support/dropdown';
import { writeManualRangeRecipeWorkbook } from '../fixtures/builders/workbookBuilder';

const expectedRows = [
  ['Producto', 'Cantidad', 'Categoría'],
  ['Pincel', '2', 'Pintura'],
  ['Rodillo', '3', 'Pintura'],
  ['Espátula', '1', 'Herramientas'],
  ['Lija', '5', 'Herramientas'],
];

test('asigna valores mediante rangos manuales y exporta el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('productos-por-categoria.xlsx');
  writeManualRangeRecipeWorkbook(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('productos-por-categoria.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja', exact: true })).toContainText('Productos');

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Producto');
  await expect(activeColumns).toContainText('Cantidad');

  const outputColumns = page.getByRole('region', { name: '6. Columnas de salida' });
  await addDirectOutputColumn(page, outputColumns, 'Producto', 'A - Producto');
  await addDirectOutputColumn(page, outputColumns, 'Cantidad', 'B - Cantidad');

  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill('Categoría');
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Crear valor personalizado');
  await outputColumns.getByRole('button', { name: 'Editar' }).click();

  const recipeDialog = page.getByRole('dialog', { name: 'Columna: "Categoría"' });
  await selectDropdownOption(page, recipeDialog, 'Tipo de operación', 'Trabajar con rangos');
  await expect(recipeDialog.getByText('Vista de filas para rangos')).toBeVisible();

  await expectRowContains(recipeDialog, 2, 'Pincel');
  await expectRowContains(recipeDialog, 3, 'Rodillo');
  await expectRowContains(recipeDialog, 4, 'Espátula');
  await expectRowContains(recipeDialog, 5, 'Lija');

  await createManualRange(recipeDialog, 2, 3);
  await configureRangeValue(page, recipeDialog, '2 - 3', 'Pintura');
  await expect(recipeDialog.getByRole('button', { name: /2 - 3.*Pintura/ })).toBeVisible();

  await createManualRange(recipeDialog, 4, 5);
  await configureRangeValue(page, recipeDialog, '4 - 5', 'Herramientas');
  await expect(recipeDialog.getByRole('button', { name: /4 - 5.*Herramientas/ })).toBeVisible();

  await expect(recipeDialog.getByRole('button', { name: /\d - \d Texto fijo:/ })).toHaveCount(2);
  await expect(recipeDialog.getByRole('button', { name: 'Seleccionar fila 2' })).toContainText('Pintura');
  await expect(recipeDialog.getByRole('button', { name: 'Seleccionar fila 3' })).toContainText('Pintura');
  await expect(recipeDialog.getByRole('button', { name: 'Seleccionar fila 4' })).toContainText('Herramientas');
  await expect(recipeDialog.getByRole('button', { name: 'Seleccionar fila 5' })).toContainText('Herramientas');
  await expect(recipeDialog).not.toContainText('Se superpone con otro rango');
  await expect(recipeDialog).not.toContainText('No hay resultados estimados para las filas visibles.');

  await recipeDialog.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(recipeDialog).toBeHidden();

  await expect(outputColumns).toContainText('Producto');
  await expect(outputColumns).toContainText('Cantidad');
  await expect(outputColumns).toContainText('Categoría');
  await expect(outputColumns).toContainText('2 rangos creados');

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview.getByRole('columnheader')).toHaveCount(3);
  await expect(finalPreview.getByRole('columnheader', { name: 'Producto' })).toBeVisible();
  await expect(finalPreview.getByRole('columnheader', { name: 'Cantidad' })).toBeVisible();
  await expect(finalPreview.getByRole('columnheader', { name: 'Categoría' })).toBeVisible();
  await expect(finalPreview.getByRole('row')).toHaveCount(5);
  await expect(finalPreview.getByRole('row', { name: /Pincel.*2.*Pintura/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Rodillo.*3.*Pintura/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Espátula.*1.*Herramientas/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /Lija.*5.*Herramientas/ })).toBeVisible();
  await expect(finalPreview).not.toContainText('undefined');
  await expect(finalPreview).not.toContainText('null');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('productos-categorizados-descargados.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  expect(rows).toEqual(expectedRows);
  expect(rows).toHaveLength(5);
  expect(rows.slice(1)).toHaveLength(4);
  expect(rows.every((row) => row.length === 3)).toBe(true);
  expect(JSON.stringify(rows)).not.toContain('undefined');
  expect(JSON.stringify(rows)).not.toContain('null');
  expect(JSON.stringify(rows)).not.toContain('Fecha');
});

async function addDirectOutputColumn(page: Page, outputColumns: Locator, name: string, inputColumn: string) {
  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill(name);
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Directa desde entrada');
  await selectDropdownOption(page, outputColumns, 'Columna de entrada', inputColumn);
}

async function expectRowContains(dialog: Locator, rowNumber: number, value: string) {
  await expect(dialog.getByRole('button', { name: `Seleccionar fila ${rowNumber}` })).toContainText(value);
}

async function createManualRange(dialog: Locator, startRow: number, endRow: number) {
  await dialog.getByRole('button', { name: `Seleccionar fila ${startRow}` }).click();
  await dialog.getByRole('button', { name: `Seleccionar fila ${endRow}` }).click();
  await dialog.getByRole('button', { name: 'Crear rango' }).click();
  await expect(dialog.getByRole('button', { name: `Editar rango ${startRow} - ${endRow}` })).toBeVisible();
}

async function configureRangeValue(page: Page, dialog: Locator, rangeLabel: string, value: string) {
  await dialog.getByRole('button', { name: `Editar rango ${rangeLabel}` }).click();

  const rangeDialog = page.getByRole('dialog', { name: 'Configurar rango' });
  await expect(rangeDialog).toBeVisible();
  await selectDropdownOption(page, rangeDialog, 'Acción', 'Usar texto fijo');
  const fixedTextStep = rangeDialog.getByRole('group', { name: /Paso 1 · Usar texto fijo/ });
  await fixedTextStep.getByRole('textbox').fill(value);
  await expect(fixedTextStep.getByRole('textbox')).toHaveValue(value);
  await rangeDialog.getByRole('button', { name: 'Aceptar' }).click();
  await expect(rangeDialog).toBeHidden();
}
