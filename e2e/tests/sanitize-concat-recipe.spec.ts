import { readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import { test, expect } from '../support/test';
import { writeConcatRecipeWorkbook } from '../fixtures/builders/workbookBuilder';

const expectedRows = [
  ['Etiqueta'],
  ['A1 - PINCEL / 20 mm'],
  ['B2 - RODILLO / 10 cm'],
];

test('crea una etiqueta concatenada y exporta el resultado esperado', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trabajá tus planillas en un solo lugar' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar archivo' }).click();
  await expect(page.getByRole('status', { name: /Cargando herramienta/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: '1. Archivo' })).toBeVisible();

  const workbookPath = testInfo.outputPath('productos-con-etiqueta.xlsx');
  writeConcatRecipeWorkbook(workbookPath);

  await page.getByLabel('Archivo para preparar').setInputFiles(workbookPath);
  await expect(page.getByRole('status', { name: 'Procesando archivo...' })).toBeHidden();

  await expect(page.getByText('productos-con-etiqueta.xlsx')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoja', exact: true })).toContainText('Productos');

  await page.getByRole('button', { name: 'Fila de encabezados' }).click();
  await page.getByRole('option', { name: 'Fila 1' }).click();
  await page.getByLabel('Primera fila de datos').fill('2');
  await page.getByLabel('Primera fila de datos').press('Enter');

  const activeColumns = page.getByRole('region', { name: 'Columnas activas' });
  await expect(activeColumns).toContainText('Código');
  await expect(activeColumns).toContainText('Nombre');
  await expect(activeColumns).toContainText('Presentación');

  const outputColumns = page.getByRole('region', { name: '6. Columnas de salida' });
  await outputColumns.getByRole('button', { name: 'Agregar', exact: true }).click();
  await outputColumns.getByLabel('Nombre de salida').fill('Etiqueta');
  await selectDropdownOption(page, outputColumns, 'Tipo de operación', 'Crear valor personalizado');
  await outputColumns.getByRole('button', { name: 'Editar' }).click();

  const recipeDialog = page.getByRole('dialog', { name: 'Columna: "Etiqueta"' });
  await selectDropdownOption(page, recipeDialog, 'Acción', 'Concatenar');
  await expect(recipeDialog.getByRole('region', { name: 'Editor de partes' })).toBeVisible();

  await configureInputPart(page, recipeDialog, 'A - Código');
  await addFixedTextPart(page, recipeDialog, ' - ');
  await addInputPart(page, recipeDialog, 'B - Nombre');
  await addUppercaseStep(page, recipeDialog);
  await addFixedTextPart(page, recipeDialog, ' / ');
  await addInputPart(page, recipeDialog, 'C - Presentación');

  await expect(recipeDialog.getByRole('button', { name: /Dato de Excel.*Columna A/ })).toBeVisible();
  await expect(recipeDialog.getByRole('button', { name: /Texto fijo.*" - "/ })).toBeVisible();
  await expect(recipeDialog.getByRole('button', { name: /Dato de Excel.*2 pasos configurados/ })).toBeVisible();
  await expect(recipeDialog.getByRole('button', { name: new RegExp('Texto fijo.*" / "') })).toBeVisible();
  await expect(recipeDialog.getByRole('button', { name: /Dato de Excel.*Columna C/ })).toBeVisible();

  await recipeDialog.getByRole('button', { name: 'Vista previa' }).click();
  const previewDialog = page.getByRole('dialog', { name: 'Vista previa del resultado' });
  const previewTable = previewDialog.getByRole('table');
  await expect(previewTable).toContainText('A1 - PINCEL / 20 mm');
  await expect(previewTable).toContainText('B2 - RODILLO / 10 cm');
  await previewDialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(previewDialog).toBeHidden();

  await recipeDialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(recipeDialog).toBeHidden();

  await expect(outputColumns).toContainText('Etiqueta');
  await expect(outputColumns).toContainText('Unir valores');
  await expect(outputColumns).toContainText('Vista previa: A1 - PINCEL / 20 mm');

  const finalPreview = page.getByRole('region', { name: '8. Vista final' });
  await expect(finalPreview).toContainText('Etiqueta');
  await expect(finalPreview).toContainText('A1 - PINCEL / 20 mm');
  await expect(finalPreview).toContainText('B2 - RODILLO / 10 cm');
  await expect(finalPreview).not.toContainText('Código');
  await expect(finalPreview).not.toContainText('Nombre');
  await expect(finalPreview).not.toContainText('Presentación');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar Excel' }).click();
  await page.getByRole('button', { name: 'Descargar sin guardar' }).click();
  const download = await downloadPromise;
  const downloadedPath = testInfo.outputPath('etiquetas-descargadas.xlsx');
  await download.saveAs(downloadedPath);

  const downloadedWorkbook = XLSX.read(readFileSync(downloadedPath), { type: 'buffer' });
  expect(downloadedWorkbook.SheetNames).toContain('Archivo preparado');

  const sheet = downloadedWorkbook.Sheets['Archivo preparado'];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

  expect(rows).toEqual(expectedRows);
  expect(rows).toHaveLength(3);
  expect(rows.every((row) => row.length === 1)).toBe(true);
  expect(JSON.stringify(rows)).not.toContain('Código');
  expect(JSON.stringify(rows)).not.toContain('Nombre');
  expect(JSON.stringify(rows)).not.toContain('Presentación');
  expect(JSON.stringify(rows)).not.toContain('undefined');
  expect(JSON.stringify(rows)).not.toContain('null');
  expect(JSON.stringify(rows)).not.toContain('--');
  expect(JSON.stringify(rows)).not.toContain('//');
});

async function addInputPart(page: Page, dialog: Locator, expectedColumnName: string) {
  await dialog.getByRole('button', { name: 'Agregar parte' }).click();
  await configureInputPart(page, dialog, expectedColumnName);
}

async function configureInputPart(page: Page, dialog: Locator, expectedColumnName: string) {
  const step = dialog.getByRole('group', { name: /Paso 1/ });

  await selectDropdownOption(page, step, 'Acción', 'Usar columna de entrada');
  await selectDropdownOption(page, step, 'Columna de entrada', expectedColumnName);
  await expect(step.getByRole('button', { name: 'Columna de entrada' })).toContainText(expectedColumnName);
}

async function addFixedTextPart(page: Page, dialog: Locator, value: string) {
  await dialog.getByRole('button', { name: 'Agregar parte' }).click();
  const step = dialog.getByRole('group', { name: /Paso 1/ });

  await selectDropdownOption(page, step, 'Acción', 'Usar texto fijo');
  await step.getByRole('textbox').fill(value);
  await expect(step.getByRole('textbox')).toHaveValue(value);
}

async function addUppercaseStep(page: Page, dialog: Locator) {
  await dialog.getByRole('button', { name: 'Agregar paso' }).click();
  const uppercaseStep = dialog.getByRole('group', { name: /Paso 2/ });

  await selectDropdownOption(page, uppercaseStep, 'Acción', 'Convertir a mayúsculas');
  await expect(uppercaseStep.getByRole('button', { name: 'Acción' })).toContainText('Convertir a mayúsculas');
}

async function selectDropdownOption(page: Page, scope: Locator, name: string | RegExp, option: string) {
  await scope.getByRole('button', { name }).evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('El selector no es un HTMLElement');
    }
    element.click();
  });
  await page.waitForFunction((optionName) => {
    const optionElement = Array.from(document.querySelectorAll('[role="option"]'))
      .find((element) => element.textContent?.trim() === optionName);

    if (!(optionElement instanceof HTMLElement)) {
      return false;
    }
    optionElement.click();
    return true;
  }, option);
}
