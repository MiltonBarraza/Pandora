import { test, expect } from '../support/test';
import { writeInvalidXlsx } from '../fixtures/builders/invalidFileBuilder';
import { writeProductosMinimoWorkbook } from '../fixtures/builders/workbookBuilder';

test('muestra un error y no continúa al cargar un XLSX inválido', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const invalidFilePath = testInfo.outputPath('archivo-corrupto.xlsx');
  writeInvalidXlsx(invalidFilePath);

  await page.getByLabel('Archivo para preparar').setInputFiles(invalidFilePath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByRole('alert')).toHaveText('No se pudo leer el archivo. Revisá que sea .xlsx, .xls, .xlsm o .csv.');
  await expect(page.getByText('archivo-corrupto.xlsx')).toBeHidden();
  await expect(page.getByRole('heading', { name: '2. Hoja y configuración' })).toBeHidden();
  await expect(page.getByRole('region', { name: 'Columnas activas' })).toBeHidden();
  await expect(page.getByRole('region', { name: '8. Vista final' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Descargar Excel' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeHidden();

  const validFilePath = testInfo.outputPath('productos-minimo.xlsx');
  writeProductosMinimoWorkbook(validFilePath);

  await page.getByLabel('Archivo para preparar').setInputFiles(validFilePath);
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByText('productos-minimo.xlsx')).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Hoja y configuración' })).toBeVisible();
});
