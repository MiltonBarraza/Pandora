import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { writeMultiSheetWorkbook } from '../fixtures/builders/workbookBuilder';

test('permite elegir una hoja y exporta únicamente sus datos', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('catalogo-multihoja.xlsx');
  writeMultiSheetWorkbook(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();
  await expect(page.getByText('catalogo-multihoja.xlsx')).toBeVisible();

  const sheetSelector = page.getByRole('button', { name: 'Hoja', exact: true });
  await expect(sheetSelector).toContainText('Resumen');
  await expect(page.getByText('Métrica')).toBeVisible();
  await expect(page.getByText('Valor')).toBeVisible();

  await sheetSelector.click();
  await expect(page.getByRole('option', { name: 'Resumen' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Productos' })).toBeVisible();
  await page.getByRole('option', { name: 'Productos' }).click();
  await expect(sheetSelector).toContainText('Productos');
  await expect(page.getByRole('status', { name: 'Procesando hoja...' })).toBeHidden();

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Columna: A');
  await expect(activeColumns).toContainText('Columna: B');
  await expect(activeColumns).toContainText('Columna: C');
  await expect(page.getByText('Métrica')).toBeHidden();
  await expect(page.getByText('Valor')).toBeHidden();

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Producto');
  await expect(activeColumns).toContainText('Precio');
  await expect(activeColumns).not.toContainText('Métrica');
  await expect(activeColumns).not.toContainText('Valor');

  await page.getByRole('button', { name: 'Agregar columnas activas' }).click();

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Código');
  await expect(finalPreview).toContainText('Producto');
  await expect(finalPreview).toContainText('Precio');
  await expect(finalPreview).toContainText('P1');
  await expect(finalPreview).toContainText('Brocha');
  await expect(finalPreview).toContainText('15');
  await expect(finalPreview).toContainText('P2');
  await expect(finalPreview).toContainText('Espátula');
  await expect(finalPreview).toContainText('25');
  await expect(finalPreview).not.toContainText('Total');
  await expect(finalPreview).not.toContainText('Estado');
  await expect(finalPreview).not.toContainText('Activo');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('catalogo-productos-descargado.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

  expect(rows).toEqual([
    ['Código', 'Producto', 'Precio'],
    ['P1', 'Brocha', '15'],
    ['P2', 'Espátula', '25'],
  ]);
  expect(JSON.stringify(rows)).not.toContain('Métrica');
  expect(JSON.stringify(rows)).not.toContain('Valor');
  expect(JSON.stringify(rows)).not.toContain('Total');
  expect(JSON.stringify(rows)).not.toContain('Estado');
  expect(JSON.stringify(rows)).not.toContain('Activo');
});
