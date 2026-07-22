# Tests E2E con Playwright

Esta suite prueba flujos reales de Pandora en navegador Chromium: carga de archivos, configuración visible del wizard, vista previa, descarga y validación del archivo exportado. No reemplaza Vitest; cubre contratos que necesitan DOM real, input de archivos, dialogs, dropdowns, storage aislado y evento de descarga.

Última revisión: 2026-07-15.

## Estado actual

- Runner: `@playwright/test`.
- Configuracion: `playwright.config.ts`.
- Directorio de tests: `e2e/tests`.
- Specs actuales: 10.
- Tests actuales: 10.
- Navegador: Chromium.
- Workers: `1`.
- Paralelismo: `fullyParallel: false`.
- URL base: `http://127.0.0.1:5173`.
- Servidor local: Playwright ejecuta `npm run dev -- --host 127.0.0.1 --port 5173`.
- Reporters: consola `list` y HTML local.
- Diagnostico: trace en primer retry, screenshot solo ante fallo, video retenido ante fallo.

Vitest excluye `e2e/**` desde `vite.config.ts`, así que los E2E solo corren con Playwright.

## Scripts

En Windows, usar `npm.cmd` si PowerShell bloquea `npm.ps1`:

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

Instalar Chromium localmente después de `npm ci` o `npm install`:

```powershell
npx.cmd playwright install chromium
```

En Linux CI:

```bash
npx playwright install --with-deps chromium
```

Ejecucion individual de escenarios complejos:

```powershell
npx.cmd playwright test e2e/tests/sanitize-concat-recipe.spec.ts --headed
npx.cmd playwright test e2e/tests/sanitize-date-recipe.spec.ts --headed
npx.cmd playwright test e2e/tests/sanitize-manual-range-recipe.spec.ts --headed
npx.cmd playwright test e2e/tests/sanitize-suggested-ranges.spec.ts --headed
```

## Estructura

```text
e2e/
  fixtures/
    builders/
      csvBuilder.ts
      invalidFileBuilder.ts
      workbookBuilder.ts
  support/
    dropdown.ts
    test.ts
  tests/
    combine-smoke.spec.ts
    sanitize-concat-recipe.spec.ts
    sanitize-csv-smoke.spec.ts
    sanitize-date-recipe.spec.ts
    sanitize-invalid-file.spec.ts
    sanitize-manual-range-recipe.spec.ts
    sanitize-multi-sheet.spec.ts
    sanitize-shifted-headers.spec.ts
    sanitize-smoke.spec.ts
    sanitize-suggested-ranges.spec.ts
```

## Aislamiento

La fixture base está en `e2e/support/test.ts`. Cada test usa un contexto aislado y registra `context.addInitScript` para limpiar `localStorage` y `sessionStorage` antes de cargar la app. Esto evita restaurar drafts antes de que módulos lazy del wizard lean storage.

Entradas y descargas se escriben con `testInfo.outputPath(...)`, bajo `test-results/`. No se versionan fixtures generados.

## Cobertura actual

| Spec | Test | Area | Contrato principal |
| --- | --- | --- | --- |
| `sanitize-smoke.spec.ts` | `sanitiza un XLSX simple y descarga el resultado esperado` | Sanitizador XLSX | carga, columnas, vista final, descarga Excel |
| `combine-smoke.spec.ts` | `combina dos XLSX por nombre y descarga el resultado esperado` | Combinar XLSX | dos fuentes, mapping por nombre, descarga combinada |
| `sanitize-csv-smoke.spec.ts` | `sanitiza un CSV con valores escapados y descarga el resultado esperado` | Sanitizador CSV | escaping, acentos, celda vacia, descarga CSV |
| `sanitize-invalid-file.spec.ts` | `muestra un error y no continúa al cargar un XLSX inválido` | Error XLSX | ruta Excel inválida, `role="alert"`, recuperación |
| `sanitize-multi-sheet.spec.ts` | `permite elegir una hoja y exporta únicamente sus datos` | XLSX multihoja | selector de hoja, reseteo, exportación hoja elegida |
| `sanitize-shifted-headers.spec.ts` | `procesa encabezados desplazados y excluye las filas de metadata` | Encabezados | encabezado fila 15, datos fila 16, metadata excluida |
| `sanitize-concat-recipe.spec.ts` | `crea una etiqueta concatenada y exporta el resultado esperado` | Receta concat | partes, texto fijo, mayúsculas, preview, descarga |
| `sanitize-date-recipe.spec.ts` | `normaliza fechas y aplica el fallback esperado` | Receta fechas | texto DD/MM/AAAA, fallback, vacíos, descarga |
| `sanitize-manual-range-recipe.spec.ts` | `asigna valores mediante rangos manuales y exporta el resultado esperado` | Rangos manuales | selección visual de filas, valores fijos, descarga |
| `sanitize-suggested-ranges.spec.ts` | `aplica los dos criterios de rangos sugeridos y exporta el resultado esperado` | Rangos sugeridos | criterios activos, sugerencias, aplicación, descarga |

### Sanitizador XLSX simple

Archivo: `e2e/tests/sanitize-smoke.spec.ts`

Genera `productos-minimo.xlsx`, hoja `Productos`:

```text
Código | Nombre  | Precio
A1     | Pincel  | 10
B2     | Rodillo | 20
```

Valida carga por `Archivo para preparar`, hoja `Productos`, encabezados en `Fila 1`, datos desde `2`, columnas activas, vista final, descarga `Descargar Excel` y hoja exportada `Archivo preparado`.

### Combinar XLSX

Archivo: `e2e/tests/combine-smoke.spec.ts`

Genera `productos-a.xlsx` y `productos-b.xlsx`; usa carga múltiple por `Archivos para combinar`, modo `Por nombre`, agrega `Stock`, valida preview y descarga `Descargar Excel combinado`. Hoja exportada: `Combinado`.

### Sanitizador CSV con escaping

Archivo: `e2e/tests/sanitize-csv-smoke.spec.ts`

Genera `productos-especiales.csv` en UTF-8, coma, CRLF, sin BOM. Valida comas dentro de celdas, comillas dobles escapadas, acentos, celda vacía, descarga CSV y parseo con parser mínimo independiente.

### XLSX inválido

Archivo: `e2e/tests/sanitize-invalid-file.spec.ts`

Genera `archivo-corrupto.xlsx` con bytes ZIP incompletos deterministas:

```ts
[0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00]
```

Valida error visible con `role="alert"`, ausencia de secciones posteriores y recuperación cargando un XLSX válido.

### XLSX multihoja

Archivo: `e2e/tests/sanitize-multi-sheet.spec.ts`

Genera `catalogo-multihoja.xlsx` con hojas `Resumen` y `Productos`. Verifica cambio real de hoja, desaparicion de datos residuales de `Resumen`, vista final de `Productos` y descarga en hoja `Archivo preparado`.

### XLSX con encabezados desplazados

Archivo: `e2e/tests/sanitize-shifted-headers.spec.ts`

Genera `ventas-con-metadata.xlsx`, hoja `Ventas`, con metadata en filas 1-4, filas vacías 5-14, encabezado en fila 15 y datos desde fila 16. Valida que valores superiores a 12 funcionen y que metadata/filas vacías no lleguen a preview ni exportación.

### Concatenación compleja

Archivo: `e2e/tests/sanitize-concat-recipe.spec.ts`

Genera `productos-con-etiqueta.xlsx`, hoja `Productos`:

```text
Código | Nombre  | Presentación
A1     | Pincel  | 20 mm
B2     | Rodillo | 10 cm
```

Configura una única columna de salida `Etiqueta` con `Crear valor personalizado` y acción `Concatenar`.

Partes reales configuradas:

- columna `A - Código`;
- texto fijo ` - `;
- columna `B - Nombre`;
- paso `Convertir a mayúsculas` aplicado solo a `Nombre`;
- texto fijo ` / `;
- columna `C - Presentación`.

Preview validado:

```text
A1 - PINCEL / 20 mm
B2 - RODILLO / 10 cm
```

Vista final valida una sola columna `Etiqueta`, sin columnas originales `Código`, `Nombre` ni `Presentación`.

Hoja exportada: `Archivo preparado`.

Matriz descargada exacta:

```ts
[
  ['Etiqueta'],
  ['A1 - PINCEL / 20 mm'],
  ['B2 - RODILLO / 10 cm'],
]
```

Riesgo cubierto: configuración real de receta compleja dentro del modal, partes independientes, transformación aplicada al fragmento correcto, preview y exportación.

Mejoras accesibles usadas por este flujo:

- `Nombre de salida` como nombre accesible estable para el input de columna de salida;
- grupos de pasos con `role="group"` y nombres como `Paso 1`, `Paso 2`;
- helper `selectDropdownOption` para dropdown custom.

### Normalizacion de fechas

Archivo: `e2e/tests/sanitize-date-recipe.spec.ts`

Genera `fechas-para-normalizar.xlsx`, hoja `Fechas`:

```text
Código | Fecha
F1     | 05/01/2026
F2     | 17/11/2025
F3     | celda vacia
F4     | fecha invalida
```

Los valores validos se almacenan como texto. No cubre seriales reales de Excel, `Date` objects ni timezone.

Columnas de salida:

- `Código`, directa desde `A - Código`;
- `Fecha normalizada`, con `Crear valor personalizado`.

Receta real:

- `Tipo de operación`: `Trabajar con fechas`;
- `Accion`: `Formatear fecha`;
- `Qué fecha usar`: `B - Fecha`;
- entrada visual: `DD/MM/AAAA`;
- salida visual: `AAAA-MM-DD`;
- equivalentes internos: `DD/MM/YYYY` y `YYYY-MM-DD`;
- si no es fecha valida: `Usar texto fijo`;
- fallback: `FECHA INVALIDA`.

Preview disponible en el modal; el test valida que aparece `2026-01-05`.

Vista final:

```text
Código | Fecha normalizada
F1     | 2026-01-05
F2     | 2025-11-17
F3     | vacío
F4     | FECHA INVALIDA
```

La celda vacia permanece vacia. No se convierte en fallback, `undefined`, `null` ni fecha por defecto.

Hoja exportada: `Archivo preparado`.

Matriz descargada exacta:

```ts
[
  ['Código', 'Fecha normalizada'],
  ['F1', '2026-01-05'],
  ['F2', '2025-11-17'],
  ['F3', ''],
  ['F4', 'FECHA INVALIDA'],
]
```

### Rangos manuales

Archivo: `e2e/tests/sanitize-manual-range-recipe.spec.ts`

Genera `productos-por-categoria.xlsx`, hoja `Productos`:

```text
Producto | Cantidad
Pincel   | 2
Rodillo  | 3
Espátula | 1
Lija     | 5
```

Columnas de salida:

- `Producto`, directa desde `A - Producto`;
- `Cantidad`, directa desde `B - Cantidad`;
- `Categoría`, con `Crear valor personalizado` y `Trabajar con rangos`.

Numeracion real: filas fisicas de Excel. Con encabezado en fila 1, los datos quedan en filas 2 a 5.

Seleccion visual:

- controles con `aria-label="Seleccionar fila N"`;
- rango `2 - 3` cubre `Pincel` y `Rodillo`;
- rango `4 - 5` cubre `Espátula` y `Lija`.

Valores:

- `2 - 3` -> `Pintura`;
- `4 - 5` -> `Herramientas`.

Cada rango se edita con el modal `Configurar rango`; el valor se define en `Paso 1 · Usar texto fijo`.

Vista final:

```text
Producto | Cantidad | Categoría
Pincel   | 2        | Pintura
Rodillo  | 3        | Pintura
Espátula | 1        | Herramientas
Lija     | 5        | Herramientas
```

Hoja exportada: `Archivo preparado`.

Matriz descargada exacta:

```ts
[
  ['Producto', 'Cantidad', 'Categoría'],
  ['Pincel', '2', 'Pintura'],
  ['Rodillo', '3', 'Pintura'],
  ['Espátula', '1', 'Herramientas'],
  ['Lija', '5', 'Herramientas'],
]
```

En este flujo, `Cantidad` se exporta/lee como texto con `xlsx` usando `raw: false`, consistente con el resto de los E2E.

Mejora accesible agregada para este flujo: botones de edición de rango tienen nombre único, por ejemplo `Editar rango 2 - 3` y `Editar rango 4 - 5`.

### Rangos sugeridos

Archivo: `e2e/tests/sanitize-suggested-ranges.spec.ts`

Genera `productos-rangos-sugeridos.xlsx`, hoja `Productos`:

```ts
[
  ['Producto', 'Inicio categoría', 'Bloque'],
  ['Pincel', 'Pintura', 'Grupo A'],
  ['Rodillo', '', 'Grupo A'],
  ['Brocha', '', ''],
  ['Martillo', 'Herramientas', 'Grupo B'],
  ['Lija', '', 'Grupo B'],
  ['Espátula', '', 'Grupo B'],
]
```

Columnas de salida:

- `Producto`, directa desde `A - Producto`;
- `Categoría sugerida`, con `Trabajar con rangos`;
- `Bloque sugerido`, con `Trabajar con rangos`.

Flujo `Cada dato inicia un rango`:

- abrir `Rangos sugeridos`;
- criterio `Cada dato inicia un rango`;
- columna `Inicio categoría`;
- `Guardar como valor`: `Valor detectado`;
- filas configuradas: desde `2` hasta `7`.

Sugerencias verificadas antes de aplicar:

- `2 - 4` -> `Pintura`;
- `5 - 7` -> `Herramientas`.

Contrato actual: cada dato no vacío inicia un rango, el rango termina antes del siguiente dato y el último llega hasta el límite configurado. El modo legacy `singleRow` ya no existe.

Flujo `Bloques consecutivos con datos`:

- abrir `Rangos sugeridos`;
- criterio `Bloques consecutivos con datos`;
- columna `Bloque`;
- `Guardar como valor`: `Primer valor de columna`;
- `Columna para valor`: `Bloque`;
- filas configuradas: desde `2` hasta `7`.

Sugerencias verificadas antes de aplicar:

- `2 - 3` -> `Grupo A`;
- `5 - 7` -> `Grupo B`.

Contrato actual: una fila vacía corta el bloque. La fila de `Brocha` no pertenece a ningún bloque y los bloques no se propagan a través de filas vacías.

Vista final y descarga:

```ts
[
  ['Producto', 'Categoría sugerida', 'Bloque sugerido'],
  ['Pincel', 'Pintura', 'Grupo A'],
  ['Rodillo', 'Pintura', 'Grupo A'],
  ['Brocha', 'Pintura', ''],
  ['Martillo', 'Herramientas', 'Grupo B'],
  ['Lija', 'Herramientas', 'Grupo B'],
  ['Espátula', 'Herramientas', 'Grupo B'],
]
```

Hoja exportada: `Archivo preparado`.

Diferencia comprobada: `Brocha` queda dentro del rango propagado iniciado por `Pintura`, pero queda vacía en `Bloque sugerido` porque su fila vacía corta los bloques consecutivos.

Estado legacy: `ManualRangeTextGenerator` fue eliminado, `singleRow` fue eliminado del dominio, `Cada dato inicia un rango` usa el comportamiento actual hasta antes del siguiente dato y `Bloques consecutivos con datos` usa su generador específico. Ambas opciones son reales y activas del modal actual.

## Builders de fixtures

- `e2e/fixtures/builders/workbookBuilder.ts`: XLSX deterministas con `xlsx`.
- `e2e/fixtures/builders/csvBuilder.ts`: CSV determinista con serializador mínimo.
- `e2e/fixtures/builders/invalidFileBuilder.ts`: XLSX inválido con bytes fijos.

La suite usa `xlsx` para generar XLSX de entrada y leer XLSX descargados. CSV se lee con APIs nativas de Node y parser mínimo independiente para no validar escaping con el mismo parser de dominio.

## Helper de dropdown

Archivo: `e2e/support/dropdown.ts`

`selectDropdownOption(page, scope, name, option)` se extrajo porque el componente `Dropdown` es custom, renderiza opciones con `role="option"` y puede cerrar por scroll/portal. El helper:

- localiza el trigger con `getByRole('button', { name })`;
- hace click sobre el elemento real del DOM;
- busca globalmente la opcion con `[role="option"]`;
- hace click sobre la opcion visible;
- no modifica estado React;
- no es Page Object Model.

Punto sensible: si cambia la implementacion o contrato accesible de `src/components/ui/Dropdown/Dropdown.tsx`, este helper puede requerir ajuste.

## Locators y accesibilidad

Prioridad actual:

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

- `FileUploader`: `aria-label="Archivo para preparar"`;
- `MultipleFileUploader`: `aria-label="Archivos para combinar"`;
- `Step`: `aria-labelledby`, secciones como regiones nombradas;
- error de lectura del Sanitizador: `role="alert"`;
- `Nombre de salida`: input con nombre accesible estable;
- pasos de receta: `role="group"` con nombre de paso;
- filas del editor manual de rangos: `aria-label="Seleccionar fila N"`;
- edición de rangos: `Editar rango N - M`;
- vista previa combinada: `aria-label="Vista previa combinada"`.

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

No usar `page.waitForTimeout(...)`. Preferir assertions web-first, roles visibles, loaders reales y `waitForEvent('download')`.

## Matriz futura

| Escenario | Estado | Nota |
| --- | --- | --- |
| Concatenación compleja | Cubierto | Partes, texto fijo, mayúsculas, preview y XLSX |
| Fechas de texto con fallback | Cubierto | `DD/MM/AAAA` -> `AAAA-MM-DD`, vacío preservado |
| Rangos manuales | Cubierto | Seleccion visual de filas y valores fijos |
| Rangos sugeridos: cada dato inicia un rango | Cubierto | `Inicio categoría`, valor detectado, rangos hasta antes del siguiente dato |
| Rangos sugeridos: bloques consecutivos con datos | Cubierto | `Bloque`, primer valor de columna, fila vacía corta bloque |
| Seriales reales de Excel | Pendiente | Requiere contrato estable sin riesgo timezone |
| Formatos regionales reales | Pendiente | Ampliar cuando haya casos manuales frecuentes |
| `.xls` | Pendiente | Puede requerir fixture real/golden |
| `.xlsm` | Pendiente | Puede requerir fixture real/golden |
| Fixture golden anonimizado | Pendiente | Util para archivos de usuario con estructura dificil de sintetizar |
| Rangos con valores vacíos | Pendiente | Ya hay cobertura de dominio; E2E solo si aparece regresión UI |
| Filtros complejos | Pendiente | Mantener en Vitest salvo regresión de flujo visible |
| Archivos grandes | Pendiente | Agregar solo con umbral y caso real de performance |
| Errores de exportación | Pendiente | Cubrir si aparece contrato visible recuperable |
| Firefox/WebKit | Pendiente | Agregar después de estabilizar Chromium |

## Cuando agregar otro E2E

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
- normalizacion de filas/columnas;
- reglas de filtros;
- motor de recetas;
- nombres de archivo;
- helpers de exportación;
- edge cases numerosos sin necesidad de navegador.

Antes de sumar escenario:

1. Confirmar que no duplica uno existente.
2. Definir archivo de entrada mínimo y determinista.
3. Definir output exacto verificable.
4. Preferir builder programático bajo `e2e/fixtures/builders`.
5. Usar `testInfo.outputPath(...)`.
6. Validar pantalla y archivo descargado.
7. Evitar Page Object Model hasta que haya repeticion real que lo justifique.

## Resumen final

- Suite actual: 10 specs / 10 tests.
- Navegador: Chromium.
- Ejecucion local: `npm.cmd run test:e2e`.
- Visualizacion local: `npm.cmd run test:e2e:ui` o `npm.cmd run test:e2e:headed`.
- CI: GitHub Actions ejecuta Vitest, build y Playwright en Chromium.
- Fixtures generados: temporales bajo `testInfo.outputPath(...)`.
- Salidas descargadas: verificadas con `xlsx` para XLSX y parser mínimo para CSV.
