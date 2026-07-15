import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { selectDropdownOption } from '../support/dropdown';
import { writeDateRecipeWorkbook } from '../fixtures/builders/workbookBuilder';

const expectedRows = [
  ['Código', 'Fecha normalizada'],
  ['F1', '2026-01-05'],
  ['F2', '2025-11-17'],
  ['F3', ''],
  ['F4', 'FECHA INVALIDA'],
];

test('normaliza fechas y aplica el fallback esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('fechas-para-normalizar.xlsx');
  writeDateRecipeWorkbook(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('fechas-para-normalizar.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja', exact: true })).toContainText('Fechas');

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Fecha');

  const outputColumns = page.getByRole('region', { name: '6. Columnas de salida' });

  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill('Código');
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Directa desde entrada');
  await selectDropdownOption(page, outputColumns, 'Columna de entrada', 'A - Código');

  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill('Fecha normalizada');
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Crear valor personalizado');
  await outputColumns.getByRole('button', { name: 'Editar' }).click();

  const recipeDialog = page.getByRole('dialog', { name: 'Columna: "Fecha normalizada"' });
  await selectDropdownOption(page, recipeDialog, 'Tipo de operación', 'Trabajar con fechas');
  await selectDropdownOption(page, recipeDialog, 'Acción', 'Formatear fecha');
  await selectDropdownOption(page, recipeDialog, 'Qué fecha usar', 'B - Fecha');
  await selectDropdownOption(page, recipeDialog, 'Formato de entrada', 'DD/MM/AAAA');
  await selectDropdownOption(page, recipeDialog, 'Formato de salida', 'AAAA-MM-DD');
  await selectDropdownOption(page, recipeDialog, 'Si no es una fecha válida', 'Usar texto fijo');
  await recipeDialog.getByLabel('Texto si no es fecha válida').fill('FECHA INVALIDA');
  await expect(recipeDialog.getByLabel('Texto si no es fecha válida')).toHaveValue('FECHA INVALIDA');
  await expect(recipeDialog).toContainText('Vista previa');
  await expect(recipeDialog).toContainText('2026-01-05');

  await recipeDialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(recipeDialog).toBeHidden();

  await expect(outputColumns).toContainText('Código');
  await expect(outputColumns).toContainText('Fecha normalizada');
  await expect(outputColumns).toContainText('Vista previa: 2026-01-05');

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Código');
  await expect(finalPreview).toContainText('Fecha normalizada');
  await expect(finalPreview.getByRole('columnheader', { name: 'Fecha', exact: true })).toHaveCount(0);
  await expect(finalPreview.getByRole('row', { name: /F1.*2026-01-05/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /F2.*2025-11-17/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /^F3$/ })).toBeVisible();
  await expect(finalPreview.getByRole('row', { name: /F4.*FECHA INVALIDA/ })).toBeVisible();
  await expect(finalPreview).not.toContainText('05/01/2026');
  await expect(finalPreview).not.toContainText('17/11/2025');
  await expect(finalPreview).not.toContainText('fecha inválida');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('fechas-normalizadas-descargadas.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  expect(rows).toEqual(expectedRows);
  expect(rows).toHaveLength(5);
  expect(rows.slice(1)).toHaveLength(4);
  expect(rows.every((row) => row.length === 2)).toBe(true);
  expect(rows[3][1]).toBe('');
  expect(JSON.stringify(rows)).not.toContain('undefined');
  expect(JSON.stringify(rows)).not.toContain('null');
  expect(rows[0]).not.toContain('Fecha');
});
