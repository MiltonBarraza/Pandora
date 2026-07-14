import { readFileSync } from 'node:fs';
import { test, expect } from '../support/test';
import { writeProductosEspecialesCsv } from '../fixtures/builders/csvBuilder';

test('sanitiza un CSV con valores escapados y descarga el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const inputCsvPath = testInfo.outputPath('productos-especiales.csv');
  writeProductosEspecialesCsv(inputCsvPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(inputCsvPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('productos-especiales.csv')).toBeVisible();
  await expect(page.getByText('El archivo CSV se procesa como una única hoja.')).toBeVisible();

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Producto');
  await expect(activeColumns).toContainText('Descripción');
  await expect(activeColumns).toContainText('Precio');

  await page.getByRole('button', { name: 'Agregar columnas activas' }).click();

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Código');
  await expect(finalPreview).toContainText('Producto');
  await expect(finalPreview).toContainText('Descripción');
  await expect(finalPreview).toContainText('Precio');
  await expect(finalPreview).toContainText('Pincel, ancho');
  await expect(finalPreview).toContainText('Rodillo "Pro"');
  await expect(finalPreview).toContainText('Para pared, techo y madera');
  await expect(finalPreview).toContainText('Lija ámbar');
  await expect(finalPreview).toContainText('10.5');
  await expect(finalPreview).toContainText('20');
  await expect(finalPreview).toContainText('5');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar CSV' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('productos-especiales-descargado.csv');
  await download.saveAs(downloadedPath);

  expect(download.suggestedFilename()).toBe('Archivo preparado - productos-especiales.csv');

  const downloadedBuffer = readFileSync(downloadedPath);
  const hasUtf8Bom = downloadedBuffer.length >= 3
    && downloadedBuffer[0] === 0xef
    && downloadedBuffer[1] === 0xbb
    && downloadedBuffer[2] === 0xbf;
  const downloadedText = downloadedBuffer.toString('utf8').replace(/^\uFEFF/, '');

  expect(hasUtf8Bom).toBe(false);
  expect(downloadedText).toContain(',');
  expect(downloadedText).toContain('\r\n');
  expect(parseCsv(downloadedText)).toEqual([
    ['Código', 'Producto', 'Descripción', 'Precio'],
    ['A1', 'Pincel, ancho', 'Mango de madera', '10.5'],
    ['B2', 'Rodillo "Pro"', 'Para pared, techo y madera', '20'],
    ['C3', 'Lija ámbar', '', '5'],
  ]);
});

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
