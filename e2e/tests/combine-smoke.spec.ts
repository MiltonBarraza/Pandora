import { readFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import {
  writeProductosACombineWorkbook,
  writeProductosBCombineWorkbook,
} from '../fixtures/builders/workbookBuilder';

test('combina dos XLSX por nombre y descarga el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Combinar archivos' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivos' })).toBeVisible();

  const productosAPath = testInfo.outputPath('productos-a.xlsx');
  const productosBPath = testInfo.outputPath('productos-b.xlsx');
  writeProductosACombineWorkbook(productosAPath);
  writeProductosBCombineWorkbook(productosBPath);

  await page.getByLabel('Archivos para combinar', { exact: true }).setInputFiles([productosAPath, productosBPath]);
  await expect(page.getByRole('status', { name: 'Procesando 2 archivos...' })).toBeHidden();

  await expect(page.getByRole('heading', { name: 'Fuentes cargadas' })).toBeVisible();
  await expect(page.getByText('productos-a.xlsx')).toBeVisible();
  await expect(page.getByText('productos-b.xlsx')).toBeVisible();
  await expect(page.getByText(/Hoja usada: Productos A/)).toBeVisible();
  await expect(page.getByText(/Hoja usada: Productos B/)).toBeVisible();
  await expect(page.getByRole('radio', { name: /Por nombre/ })).toBeChecked();

  await page.getByRole('button', { name: 'Generar columnas' }).click();
  await page.getByRole('button', { name: 'Agregar columna' }).click();
  await page.getByLabel('Nombre de columna de salida 4').fill('Stock');
  await page.getByRole('button', { name: 'Reasignar columnas' }).click();
  await page
    .getByRole('dialog', { name: 'Reasignar columnas' })
    .getByRole('button', { name: 'Reasignar columnas' })
    .click();

  const outputColumnInputs = page.getByRole('textbox', { name: /Nombre de columna de salida/ });
  await expect(outputColumnInputs).toHaveCount(4);
  await expect.poll(async () => outputColumnInputs.evaluateAll((inputs) => (
    inputs.map((input) => (input as HTMLInputElement).value)
  ))).toEqual(['Código', 'Producto', 'Precio', 'Stock']);

  const previewTable = page.getByRole('table', { name: 'Vista previa combinada' });
  await expect(previewTable).toBeVisible();
  await expect(previewTable).toContainText('Código');
  await expect(previewTable).toContainText('Producto');
  await expect(previewTable).toContainText('Precio');
  await expect(previewTable).toContainText('Stock');

  await expect.poll(() => tableRows(previewTable)).toEqual([
    ['Archivo', 'Hoja', 'Código', 'Producto', 'Precio', 'Stock'],
    ['productos-a.xlsx', 'Productos A', 'A1', 'Pincel', '10', ''],
    ['productos-a.xlsx', 'Productos A', 'A2', 'Rodillo', '20', ''],
    ['productos-b.xlsx', 'Productos B', 'B1', 'Lija', '', '5'],
    ['productos-b.xlsx', 'Productos B', 'B2', 'Cinta', '', '8'],
  ]);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel combinado' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('archivo-combinado-descargado.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Combinado');

  const sheet = downloadedWorkbook.Sheets.Combinado;
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  expect(rows).toEqual([
    ['Código', 'Producto', 'Precio', 'Stock'],
    ['A1', 'Pincel', '10', ''],
    ['A2', 'Rodillo', '20', ''],
    ['B1', 'Lija', '', '5'],
    ['B2', 'Cinta', '', '8'],
  ]);
  expect(rows).toHaveLength(5);
});

async function tableRows(table: Locator) {
  return table.getByRole('row').evaluateAll((rows) => rows.map((row) => (
    Array.from(row.children).map((cell) => cell.textContent?.trim() ?? '')
  )));
}
