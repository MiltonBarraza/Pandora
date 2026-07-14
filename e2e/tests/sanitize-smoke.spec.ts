import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { writeProductosMinimoWorkbook } from '../fixtures/builders/workbookBuilder';

test('sanitiza un XLSX simple y descarga el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const inputWorkbookPath = testInfo.outputPath('productos-minimo.xlsx');
  writeProductosMinimoWorkbook(inputWorkbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(inputWorkbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('productos-minimo.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja' })).toContainText('Productos');

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Nombre');
  await expect(activeColumns).toContainText('Precio');

  await page.getByRole('button', { name: 'Agregar columnas activas' }).click();

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Código');
  await expect(finalPreview).toContainText('Nombre');
  await expect(finalPreview).toContainText('Precio');
  await expect(finalPreview).toContainText('A1');
  await expect(finalPreview).toContainText('Pincel');
  await expect(finalPreview).toContainText('10');
  await expect(finalPreview).toContainText('B2');
  await expect(finalPreview).toContainText('Rodillo');
  await expect(finalPreview).toContainText('20');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('archivo-preparado-descargado.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

  expect(rows).toEqual([
    ['Código', 'Nombre', 'Precio'],
    ['A1', 'Pincel', '10'],
    ['B2', 'Rodillo', '20'],
  ]);
  expect(rows).toHaveLength(3);
});
