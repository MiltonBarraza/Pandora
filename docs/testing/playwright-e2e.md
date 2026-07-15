# Tests E2E con Playwright

Esta suite prueba flujos reales de Pandora en navegador Chromium: carga de archivos, configuración visible del wizard, vista previa, descarga y validación del archivo exportado. No reemplaza los tests unitarios ni de integración de Vitest; cubre contratos de usuario que necesitan DOM real, input de archivos y evento de descarga.

## Estado actual

- Runner: `@playwright/test`.
- Configuración: `playwright.config.ts`.
- Directorio de tests: `e2e/tests`.
- Navegador: Chromium.
- Workers: `1`.
- Paralelismo: deshabilitado con `fullyParallel: false`.
- URL base: `http://127.0.0.1:5173`.
- Servidor local: Playwright ejecuta `npm run dev -- --host 127.0.0.1 --port 5173`.
- Reporters: consola `list` y reporte HTML local.
- Diagnóstico: trace en primer retry, screenshot solo ante fallo, video retenido ante fallo.

Vitest excluye `e2e/**` desde `vite.config.ts`, por lo que los E2E solo corren con Playwright.

## Scripts

En Windows, usar `npm.cmd` si PowerShell bloquea `npm.ps1` por execution policy:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:headed
npm.cmd run test:e2e:ui
npm.cmd run test:e2e:report
```

Equivalentes en shells sin bloqueo:

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

Para instalar Chromium localmente después de `npm ci` o `npm install`:

```powershell
npx.cmd playwright install chromium
```

En Linux CI se usa:

```bash
npx playwright install --with-deps chromium
```

## Aislamiento

La fixture base está en `e2e/support/test.ts`. Cada test usa un contexto aislado de Playwright y registra un `context.addInitScript` que limpia `localStorage` y `sessionStorage` antes de cargar la aplicación. Esto evita restaurar drafts o configuración persistida antes de que los módulos lazy del wizard lean storage.

Los archivos de entrada y descarga se escriben con `testInfo.outputPath(...)`, bajo `test-results/`. No se versionan fixtures generados.

## Cobertura actual

### Sanitizador XLSX simple

Archivo: `e2e/tests/sanitize-smoke.spec.ts`

Test: `sanitiza un XLSX simple y descarga el resultado esperado`

Genera `productos-minimo.xlsx` con hoja `Productos`:

```text
Código | Nombre  | Precio
A1     | Pincel  | 10
B2     | Rodillo | 20
```

Valida:

- carga por `Archivo para preparar`;
- selección de hoja `Productos`;
- `Fila de encabezados` en `Fila 1`;
- `Primera fila de datos` en `2`;
- columnas activas `Código`, `Nombre`, `Precio`;
- vista final con ambas filas;
- descarga Excel mediante `Descargar Excel` y confirmación `Descargar sin guardar`;
- workbook descargado con hoja `Archivo preparado`;
- matriz exacta exportada.

### Combinar XLSX

Archivo: `e2e/tests/combine-smoke.spec.ts`

Test: `combina dos XLSX por nombre y descarga el resultado esperado`

Genera:

`productos-a.xlsx`, hoja `Productos A`:

```text
Código | Producto | Precio
A1     | Pincel   | 10
A2     | Rodillo  | 20
```

`productos-b.xlsx`, hoja `Productos B`:

```text
Producto | Código | Stock
Lija     | B1     | 5
Cinta    | B2     | 8
```

Valida:

- carga múltiple por `Archivos para combinar`;
- fuentes visibles y hojas usadas;
- modo `Por nombre`;
- generación de columnas y agregado manual de `Stock`;
- reasignación por nombre;
- vista previa combinada con columnas `Código`, `Producto`, `Precio`, `Stock`;
- orden de filas: archivo A antes de archivo B;
- descarga `Descargar Excel combinado`;
- workbook descargado con hoja `Combinado`;
- matriz exacta con celdas vacías donde falta columna.

### Sanitizador CSV con escaping

Archivo: `e2e/tests/sanitize-csv-smoke.spec.ts`

Test: `sanitiza un CSV con valores escapados y descarga el resultado esperado`

Genera `productos-especiales.csv` en UTF-8, separador coma, CRLF, sin BOM:

```text
Código | Producto      | Descripción                | Precio
A1     | Pincel, ancho | Mango de madera            | 10.5
B2     | Rodillo "Pro" | Para pared, techo y madera | 20
C3     | Lija ámbar    |                            | 5
```

Valida:

- CSV tratado como única hoja;
- columnas `Código`, `Producto`, `Descripción`, `Precio`;
- vista final con coma en celda, comillas escapadas, acentos y celda vacía;
- descarga por `Descargar CSV`;
- nombre sugerido `Archivo preparado - productos-especiales.csv`;
- archivo sin BOM, con coma y CRLF;
- matriz lógica parseada por parser mínimo independiente del test.

### XLSX inválido

Archivo: `e2e/tests/sanitize-invalid-file.spec.ts`

Test: `muestra un error y no continúa al cargar un XLSX inválido`

Genera `archivo-corrupto.xlsx` con bytes ZIP incompletos determinísticos:

```ts
[0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00]
```

Valida:

- el archivo entra por la ruta Excel y falla al leer;
- error visible con `role="alert"`: `No se pudo leer el archivo. Revisá que sea .xlsx, .xls, .xlsm o .csv.`;
- no queda visible el nombre del archivo corrupto;
- no aparecen secciones posteriores, columnas activas, vista final ni botones de descarga;
- el flujo se recupera cargando un XLSX válido y mostrando `2. Hoja y configuración`.

### XLSX multihoja

Archivo: `e2e/tests/sanitize-multi-sheet.spec.ts`

Test: `permite elegir una hoja y exporta únicamente sus datos`

Genera `catalogo-multihoja.xlsx` con hojas en orden `Resumen`, `Productos`.

`Resumen`:

```text
Métrica | Valor
Total   | 2
Estado  | Activo
```

`Productos`:

```text
Código | Producto | Precio
P1     | Brocha   | 15
P2     | Espátula | 25
```

Valida:

- hoja inicial `Resumen`;
- evidencia visible de columnas `Métrica`, `Valor`;
- cambio real a hoja `Productos` mediante selector `Hoja`;
- reprocesamiento `Procesando hoja...`;
- desaparición de datos de `Resumen`;
- columnas `Código`, `Producto`, `Precio`;
- vista final y descarga sin `Total`, `Estado` ni `Activo`;
- workbook descargado con hoja `Archivo preparado`;
- matriz exacta de `Productos`.

### XLSX con encabezados desplazados

Archivo: `e2e/tests/sanitize-shifted-headers.spec.ts`

Test: `procesa encabezados desplazados y excluye las filas de metadata`

Genera `ventas-con-metadata.xlsx`, hoja `Ventas`:

```text
Fila 1:  Reporte de ventas trimestral
Fila 2:  Sucursal Centro
Fila 3:  Período 2026-Q2
Fila 4:  Generado automáticamente
Fila 5:  vacía
Fila 6:  vacía
Fila 7:  vacía
Fila 8:  vacía
Fila 9:  vacía
Fila 10: vacía
Fila 11: vacía
Fila 12: vacía
Fila 13: vacía
Fila 14: vacía
Fila 15: Código | Cliente      | Importe
Fila 16: V1     | Comercio Uno | 100.5
Fila 17: V2     | Comercio Dos | 200
```

Valida:

- opción `Fila 15` en `Fila de encabezados`;
- `Primera fila de datos` conserva `16`;
- columnas activas `Código`, `Cliente`, `Importe`;
- metadata no aparece como columna;
- vista final sin metadata ni filas vacías iniciales;
- workbook descargado con hoja `Archivo preparado`;
- matriz exacta exportada desde fila 16.

## Builders de fixtures

- `e2e/fixtures/builders/workbookBuilder.ts`: XLSX determinísticos con `xlsx`.
- `e2e/fixtures/builders/csvBuilder.ts`: CSV determinístico con serializador mínimo.
- `e2e/fixtures/builders/invalidFileBuilder.ts`: XLSX inválido con bytes fijos.

La suite usa `xlsx` para generar XLSX de entrada y leer XLSX descargados. En CSV, el test lee con APIs nativas de Node y parser mínimo independiente para no validar escaping con el mismo parser de dominio.

## Locators y accesibilidad usados

Los tests priorizan contratos semánticos:

- `getByRole('heading', ...)` para pasos y pantalla principal;
- `getByRole('button', ...)` para herramientas, dropdowns y descargas;
- `getByLabel('Archivo para preparar')` para uploader del Sanitizador;
- `getByLabel('Archivos para combinar')` para uploader múltiple de Combinar;
- `getByLabel('Primera fila de datos')` para input numérico;
- `getByRole('region', { name: 'Columnas activas' })`;
- `getByRole('region', { name: '8. Vista final' })`;
- `getByRole('table', { name: 'Vista previa combinada' })`;
- `getByRole('alert')` para error de lectura.

Soporte relevante en UI:

- `FileUploader` expone `aria-label="Archivo para preparar"`.
- `MultipleFileUploader` expone `aria-label="Archivos para combinar"`.
- `Step` usa `aria-labelledby`, por eso las secciones son regiones nombradas.
- error de lectura del Sanitizador usa `role="alert"`.
- `Primera fila de datos` tiene `aria-label`.
- la vista previa combinada tiene `aria-label="Vista previa combinada"`.

Evitar nuevos tests basados en clases CSS, XPath, `nth-child`, sleeps o estructura interna.

## GitHub Actions

Workflow: `.github/workflows/test.yml`

Triggers:

```yaml
workflow_dispatch:
pull_request:
  branches:
    - staging
    - main
push:
  branches:
    - staging
    - main
```

Job:

- runner `ubuntu-latest`;
- `permissions: contents: read`;
- `CI: true`;
- Node `22` con `actions/setup-node@v4`;
- cache npm basada en `package-lock.json`;
- instalación reproducible con `npm ci`;
- instalación Chromium con `npx playwright install --with-deps chromium`;
- orden: `npm run test:run`, `npm run build`, `npm run test:e2e`;
- concurrencia por workflow y ref, con `cancel-in-progress: true`;
- artefacto `playwright-diagnostics` solo si falla el step E2E.

Artefactos publicados ante fallo E2E:

```text
playwright-report/
test-results/
```

No se publica `node_modules`, cache npm ni fixtures permanentes.

## Diagnóstico local

Si falla Playwright:

1. Revisar salida del comando.
2. Abrir reporte HTML:

```powershell
npm.cmd run test:e2e:report
```

3. Revisar `test-results/` para screenshots, videos y traces.
4. Reproducir con UI:

```powershell
npm.cmd run test:e2e:ui
```

5. Reproducir visible:

```powershell
npm.cmd run test:e2e:headed
```

No usar `page.waitForTimeout(...)` para estabilizar. Preferir assertions web-first, roles visibles, loaders reales y `waitForEvent('download')`.

## Cuándo agregar un E2E nuevo

Agregar Playwright cuando el valor venga de navegador real:

- carga real de archivo;
- drag and drop o input file;
- selección de hoja;
- cambios visibles del wizard;
- descarga;
- validación de archivo exportado;
- aislamiento de storage;
- interacción con dialog/dropdown/portal;
- regresión ya vista en flujo de usuario.

Mantener en Vitest cuando sea:

- parser puro;
- normalización de filas/columnas;
- reglas de filtros;
- recetas;
- nombres de archivo;
- helpers de exportación;
- validación de edge cases numerosos sin necesidad de navegador.

Antes de sumar escenario:

1. Confirmar que no duplica uno existente.
2. Definir archivo de entrada mínimo y determinístico.
3. Definir output exacto verificable.
4. Preferir builder programático bajo `e2e/fixtures/builders`.
5. Usar `testInfo.outputPath(...)`.
6. Validar pantalla y archivo descargado.
7. Evitar Page Object Model hasta que haya repetición real que lo justifique.

## Escenarios candidatos no cubiertos todavía

- `.xls` y `.xlsm`.
- CSV inválido.
- archivos corruptos adicionales.
- hojas ocultas.
- fechas complejas.
- fórmulas.
- encabezados desplazados en CSV.
- múltiples tablas dentro de una hoja.
- filtros y recetas.
- rangos/manual ranges.
- navegadores Firefox y WebKit.
- integración CI con matrices o cobertura.

