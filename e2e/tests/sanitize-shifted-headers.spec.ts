import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { writeWorkbookWithShiftedHeaders } from '../fixtures/builders/workbookBuilder';

test('procesa encabezados desplazados y excluye las filas de metadata', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('ventas-con-metadata.xlsx');
  writeWorkbookWithShiftedHeaders(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('ventas-con-metadata.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja', exact: true })).toContainText('Ventas');
  await expect(page.getByRole('button', { name: 'Fila de encabezados' })).toBeVisible();
  await expect(page.getByLabel('Primera fila de datos')).toBeVisible();

  const headerRowSelector = page.getByRole('button', { name: 'Fila de encabezados' });
  await headerRowSelector.click();
  await page.getByRole('option', { name: 'Fila 15' }).click();
  await expect(headerRowSelector).toContainText('Fila 15');

  const startRowInput = page.getByLabel('Primera fila de datos');
  await startRowInput.fill('16');
  await startRowInput.press('Enter');
  await expect(startRowInput).toHaveValue('16');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Cliente');
  await expect(activeColumns).toContainText('Importe');
  await expect(activeColumns).not.toContainText('Reporte de ventas trimestral');
  await expect(activeColumns).not.toContainText('Sucursal Centro');
  await expect(activeColumns).not.toContainText('Período 2026-Q2');
  await expect(activeColumns).not.toContainText('Generado automáticamente');

  await page.getByRole('button', { name: 'Agregar columnas activas' }).click();

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Código');
  await expect(finalPreview).toContainText('Cliente');
  await expect(finalPreview).toContainText('Importe');
  await expect(finalPreview).toContainText('V1');
  await expect(finalPreview).toContainText('Comercio Uno');
  await expect(finalPreview).toContainText('100.5');
  await expect(finalPreview).toContainText('V2');
  await expect(finalPreview).toContainText('Comercio Dos');
  await expect(finalPreview).toContainText('200');
  await expect(finalPreview).not.toContainText('Reporte de ventas trimestral');
  await expect(finalPreview).not.toContainText('Sucursal Centro');
  await expect(finalPreview).not.toContainText('Período 2026-Q2');
  await expect(finalPreview).not.toContainText('Generado automáticamente');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('ventas-preparadas-descargado.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

  expect(rows).toEqual([
    ['Código', 'Cliente', 'Importe'],
    ['V1', 'Comercio Uno', '100.5'],
    ['V2', 'Comercio Dos', '200'],
  ]);
  expect(JSON.stringify(rows)).not.toContain('Reporte de ventas trimestral');
  expect(JSON.stringify(rows)).not.toContain('Sucursal Centro');
  expect(JSON.stringify(rows)).not.toContain('Período 2026-Q2');
  expect(JSON.stringify(rows)).not.toContain('Generado automáticamente');
});
