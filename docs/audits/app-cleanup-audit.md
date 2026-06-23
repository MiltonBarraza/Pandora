# Auditoría técnica de limpieza — Pandora / Excel Sanitizer

Fecha: 2026-06-23  
Branch observada: `49-componentizar-componentes`  
Branch indicada en el pedido: `37-review-visual-e-iconos`

## Resumen ejecutivo

Se auditó el árbol TypeScript/React completo mediante inventario de archivos, búsquedas con `rg`, grafo de imports, análisis de símbolos con TypeScript, compilación con `noUnusedLocals`/`noUnusedParameters`, tests y build.

La aplicación no tenía componentes o módulos de runtime desconectados, salvo cuatro módulos consumidos sólo por tests (`columnData`, `wizardConfiguration`, `settingsRemap`) o sin consumidor (`parseCurrency`). Se eliminó únicamente el último. TypeScript detectó además un subárbol de UI reemplazado dentro del editor de recetas; se eliminó sin alterar recetas, settings, remap, references, `manualRange`, preview, filtros ni exportación.

Resultado tras cierre: no quedan símbolos exportados totalmente huérfanos. `actionIconsAlternate.saveDone`, único pendiente sin referencia, se eliminó después de confirmar que duplicaba `actionIcons.done` y no tenía roadmap documentado. La suite completa y el build pasan.

## Alcance y herramientas

- `git status --short` inicial: limpio.
- Branch real detectada: `49-componentizar-componentes`; no se cambió de branch.
- Inventario de `src`, tests, docs y configuración.
- `rg` para imports, referencias, legacy, textos, TODO/FIXME/HACK y estructuras UI.
- Grafo de imports desde `src/main.tsx`, separado entre runtime y tests.
- TypeScript con `--noUnusedLocals --noUnusedParameters`.
- Recuento AST de exports y referencias.
- No hay script/configuración ESLint en el repositorio; no se instaló ninguna dependencia.

## Archivos revisados más importantes

- `src/components/ImportWizard/ImportWizard.tsx`: orquestación, secciones 5/7/8, preview, filtros, settings y exportación.
- `src/components/OutputColumnRecipeEditor/OutputColumnRecipeEditor.tsx`: recetas, pasos, rangos manuales y UI reemplazada.
- `src/components/OutputColumnRecipeEditor/RangeValueEditor.tsx` y `ColumnTextPicker.tsx`: fuentes, transformaciones y textos repetidos.
- `src/components/ProcessedRowsDebugPreview/ProcessedRowsDebugPreview.tsx`: preview normalizada y datos ocultos.
- `src/components/SettingsActions/SettingsActions.tsx`: importación, compatibilidad y aplicación de settings.
- `src/components/ColumnVisibilityManager/ColumnVisibilityManager.tsx`: columnas ocultas, angostas, vacías y orden visual.
- `src/domain/import/outputModel.ts`, `manualRangeModel.ts`, `applyIgnoreRules.ts`, `settingsApply.ts`, `settingsSnapshot.ts`, `settingsCompatibility.ts`, `settingsRemap.ts` y `settingsReferences.ts`.
- Servicios locales y de archivo de settings, exportadores XLSX/CSV y tests asociados.
- `src/types/import.ts`, especialmente `ProcessedRow`, contratos de settings, remap y compatibilidad legacy.

## Clasificación de hallazgos

### A. Eliminar seguro — aplicado

- `src/domain/import/parseCurrency.ts`: archivo sin imports, tests ni referencias; reemplazado funcionalmente por `parseNumericValue`.
- Helpers exportados sin consumidor ni test: `getSheetPreview`, `getSuggestedNumericColumnName`, `matchesProcessedIgnoreRule`, `applyColumnVisibility`, `conditionNeedsValue`, `getColumnSearchText`, `ignoreColumnsByAutomaticReasons` y `getCustomValueSummary`.
- Alias `ProcessedRowsDebugPreview`, sin consumidor; `ProcessedRowsPreview` es el componente activo.
- Imports/tipos sin uso: `normalizeNumberInputOnBlur`, `ManualRangeCondition`, `RangeValueSource` y `CombineRecipe`.
- Variable `customValueAllAdjustments`, calculada pero nunca renderizada.
- Subárbol local de UI reemplazado: `SimpleNumberValueEditor`, `SimpleTextValueEditor`, `CombineRecipeFields`, `StepsWorkspace`, `ConcatPartFields`, `describePart`, `getValueConstructionMode`, `createInputPart` y `updatePart`.

### B. Conservar documentado

- `ProcessedRow.ignoredReason`, `warnings`, `error` y `status`: sección 8 no muestra estas columnas, pero resumen y exportación de auditoría las consumen. No son código muerto.
- `rowOverrides`: controles visuales están ocultos, pero overrides se aplican antes de preview/export. Se agregó comentario de reserva en props de preview. No se persisten en settings por diseño, protegido por tests.
- `showAllRawPreviewColumns`: campo legacy aceptado para leer settings viejos; ya no cambia preview. Mantener por compatibilidad.
- `localTemplatesService` y migración de `ignoreRules` a filtros de entrada/salida: compatibilidad activa y testeada.
- Valores legacy de `manualRange`, `valueSource`, condiciones internas, remap y collectors de references: mantener. Tienen tests de compatibilidad, exportación o diagnóstico.
- `settingsRemap.ts`: hoy no entra al grafo de runtime, pero está cubierto por tests y reservado para flujo de remapeo explícitamente pendiente.
- `columnData.ts` y `wizardConfiguration.ts`: sólo tests. No se eliminaron porque sus pruebas documentan conducta; revisar junto con tests en PR separada.
- `showOutputModelDebug`: feature oculta activada por localStorage; útil para diagnóstico interno.
- Tipos exportados que documentan contratos de settings, importación y auditoría aunque no tengan import directo.

### C. Refactor seguro — aplicado

- Eliminadas cinco props inertes de `SettingsActions`: aliases, reglas, columnas de salida y nombre de archivo. El guardado sigue delegado a `onSaveSettings`; compatibilidad usa sólo snapshot fuente.
- Se creó `OutputColumnRecipeEditor.constants.ts` para seis textos idénticos y semánticamente compartidos:
  - `Sin columnas activas`
  - `Usar valor tal cual`
  - `Elegir texto desde columna`
  - `Tipo de operación`
  - `Fuente del valor`
  - `Agregar parte`
- Se reutilizan desde editor principal, editor de rangos y selector de texto sin cambiar contenido visible.

### D. Refactor sugerido — no aplicar todavía

- Dividir `OutputColumnRecipeEditor.tsx` por responsabilidades. Aun después de limpieza sigue siendo el mayor archivo productivo y concentra presentación, estado y helpers de dominio de UI.
- Mover helpers puros hoy exportados desde componentes a módulos cercanos, conservando exports de compatibilidad durante migración. Los tests del editor (más de 5.000 líneas) importan muchos seams internos.
- Unificar construcción de opciones, fuentes y pasos entre `OutputColumnRecipeEditor.tsx` y `RangeValueEditor.tsx`. Hay duplicación real, pero el riesgo sobre recetas y `manualRange` impide hacerlo en esta pasada.
- Evaluar componentes pequeños: `EmptyState`, fila label/control, header de bloque con ayuda y footer de acciones de modal. Extraer sólo con snapshots/markup tests para evitar cambios visuales.
- Extraer `Step` de `ImportWizard` sólo si será reutilizado fuera del wizard. Hoy ya centraliza las diez secciones localmente; mover archivo no reduce repetición funcional.
- Sections 5 y 7 ya reutilizan `IgnoreRules`; no conviene crear una abstracción adicional sólo para dos invocaciones.
- Raw preview y preview normalizada comparten tabla/empty state superficialmente, pero tienen modelos, límites y semánticas distintas. No unificarlas sin diseño previo.
- Evaluar code splitting del editor/flujo de configuración. Build genera bundle JS de 840.40 kB y Vite advierte superar 500 kB.

### E. Requiere decisión humana — resuelto en cierre

- `actionIconsAlternate.saveDone`: resuelto; eliminado por no tener referencias, comentario ni roadmap, y duplicar exactamente `actionIcons.done` desde la migración al sistema `AppIcon`.
- `columnData.ts` y `wizardConfiguration.ts`: resuelto para esta etapa; conservar documentados. Cualquier integración o eliminación queda para otra PR con migración explícita de sus tests.
- Branch: pedido nombró `37-review-visual-e-iconos`, pero auditoría se ejecutó sobre `49-componentizar-componentes` (`8d9662f`). Confirmar branch destino antes de commit/PR.

## Textos hardcodeados y constantes

Se centralizaron sólo textos repetidos con significado idéntico dentro de la feature de recetas. No se creó un archivo global: el alcance es local y evita acoplar pantallas.

Textos repetidos no centralizados:

- `Cancelar`, `Limpiar` y similares: mismas palabras, pero acciones y flujos distintos; una constante global reduciría contexto.
- Mensajes `No hay...`/`Sin...`: describen estados distintos y deben permanecer cerca de cada componente.
- Textos de compatibilidad y error repetidos entre wizard/settings: candidatos futuros sólo si también se centraliza el código de decisión; extraer únicamente strings podría desincronizar estados.

## Oportunidades de componentización y helpers

- Headers con `headingWithInfo`/`sectionHeader`: patrón repetido, pero variantes de jerarquía y layout. Candidato para componente con API pequeña.
- Footers `confirmDialogActions`: ya cubiertos parcialmente por `ConfirmDialog`; `ExportActions` usa `Modal` directo por tener tres decisiones. No forzar una sola API.
- Empty states: repetición visual alta, contenido y `colSpan` variables. Posible componente presentacional.
- Selectores basados en `Dropdown`: ya existe base común; falta unificar builders de opciones de fuentes/columnas en recetas.
- Summaries de receta: helpers existentes son numerosos y están muy testeados; conviene moverlos, no reescribirlos.
- Filtrado entrada/salida: lógica compartida correctamente en `IgnoreRules` y `applyIgnoreRules`; no se detectó duplicación que justifique refactor inmediato.

## Riesgos y límites

- No se modificaron shapes de settings ni persistencia.
- No se modificaron remap/references, anchos, detección de columnas, rangos sugeridos, `manualRange`, columnas virtuales, filtros, preview ni exportación.
- No se revivieron `NormalizedRow`, `OutputCategory`, `ColumnMapping`, `localCategoriesService` ni templates antiguos.
- Exports usados sólo por tests no se trataron automáticamente como muertos.
- Ausencia de ESLint limita detección de reglas React/estilo; TypeScript estricto y análisis AST cubrieron imports, locals, parámetros y símbolos huérfanos.

## Cambios aplicados

- Eliminación de un archivo muerto y helpers/exports sin referencia.
- Eliminación de subárbol UI reemplazado dentro del editor de recetas.
- Limpieza de imports, tipos, variable y props inertes.
- Constantes feature-locales para seis textos repetidos.
- Comentario explícito sobre controles ocultos y reserva de `rowOverrides` en sección 8.
- Este documento de auditoría.

## Validaciones

- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `npm run test:run`: OK — 41 archivos, 620 tests.
- `npm run build`: OK — Vite completó build; warning no bloqueante por chunk JS de 840.40 kB.
- `git diff --check`: OK. Git sólo informa conversión futura LF→CRLF por configuración local; no hay errores de whitespace.

## Segunda etapa recomendada

1. Mantener `columnData.ts` y `wizardConfiguration.ts` hasta una PR que consolide su conducta o migre sus tests al runtime vigente.
2. Crear PR exclusiva para modularizar editor de recetas, con tests de equivalencia de markup y comportamiento.
3. Unificar builders de opciones/fuentes entre editor principal y rangos.
4. Evaluar code splitting y presupuesto de bundle.
5. Incorporar ESLint sólo en una tarea separada, con baseline acordado para evitar cambios masivos.

## Cierre de pendientes humanos

### `actionIconsAlternate.saveDone`

Decisión: eliminar.

- No tenía referencias en runtime, tests, documentación ni comentarios de roadmap.
- Nació como acceso al icono específico `SaveCheckIcon`, pero la migración posterior a `AppIcon` lo convirtió en `createActionIcon('done')`.
- Desde esa migración era idéntico a `actionIcons.done`; conservarlo no aportaba semántica ni compatibilidad.

### `columnData.ts`

Decisión: conservar documentado; no reconectar ni eliminar en esta tarea.

- No es fixture ni helper de test: es un módulo puro de dominio consumido actualmente sólo por su test.
- Sus tests documentan semántica útil y real de presencia de datos: `null`, `undefined` y strings en blanco son vacíos; `0`, `false`, fechas y strings con contenido son datos.
- Esa semántica coincide con necesidades de detección de columnas, aunque runtime hoy usa lógica equivalente dentro de `columnAnalysis.ts`.
- Pendiente para otra PR: consolidar una única implementación y mover tests al consumidor vigente; sólo entonces evaluar borrar este módulo.

### `wizardConfiguration.ts`

Decisión: conservar documentado; no reconectar ni eliminar en esta tarea.

- Representa un intento anterior de centralizar la política de descarte del wizard.
- Runtime actual usa `requestConfigurationDiscard` y un modal asíncrono con acción pendiente, por lo que el helper booleano ya no modela toda la implementación.
- Sus tests todavía documentan una regla válida: configuración limpia no confirma; configuración sucia respeta decisión de descarte.
- Pendiente para otra PR: trasladar esa regla a tests del flujo runtime o a un modelo de estado vigente; después retirar módulo y tests viejos juntos.

### Pendientes para otra PR

- Consolidar `columnData.ts` con detección real de columnas sin cambiar semántica de valores falsy.
- Migrar cobertura de `wizardConfiguration.ts` al flujo actual del modal de descarte.
- Componentización, división del editor y code splitting siguen fuera de alcance.

### Validaciones de cierre

- Revisión completa del diff actual y referencias con `rg`, historial Git y análisis TypeScript.
- `npm run test:run`: OK — 41 archivos, 620 tests.
- `npm run build`: OK — Vite completó build; mantiene warning no bloqueante por chunk JS de 840.40 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK. Git sólo informa conversión futura LF→CRLF por configuración local; no hay errores de whitespace.

## Etapa posterior: modularización de helpers del editor

Se modularizaron helpers puros y casi puros de `OutputColumnRecipeEditor.tsx` sin extraer componentes ni cambiar markup.

### Helpers movidos

- `OutputColumnRecipeEditor.optionHelpers.ts`:
  - opciones de modos, tipos de steps, operaciones numéricas, fechas y condiciones;
  - conversión entre fuentes y valores de dropdown;
  - acciones de fuente de texto;
  - normalización de condiciones;
  - updates simples de steps y parsing de redondeo.
- `OutputColumnRecipeEditor.recipeHelpers.ts`:
  - selección de tipo de receta y manejo de draft;
  - detección y normalización de modo personalizado;
  - construcción de recetas simples y basadas en steps;
  - creación/cambio/normalización de steps;
  - operaciones puras sobre partes concatenadas;
  - resolución de operandos, fuentes visibles y modos de step.

`OutputColumnRecipeEditor.tsx` mantiene re-exports temporales de seams usados por tests. Esto evita una reescritura masiva de imports y permite migrarlos gradualmente a los módulos nuevos.

### Código conservado dentro del editor

- Componentes JSX y estado React.
- Generador, tabla y edición visual de `manualRange`.
- Previews y summaries acoplados a `buildProcessedRows`, datos de muestra o estructura renderizada.
- Helpers usados únicamente por presentación local cuando moverlos no reducía acoplamiento.

El archivo principal bajó de 3.905 a 2.942 líneas, una reducción aproximada de 963 líneas. No hubo cambios visuales, de markup, settings, dominio, `manualRange`, remap/references, filtros, preview normalizada ni exportación.

### Validaciones de modularización

- Test específico `OutputColumnRecipeEditor.test.tsx`: OK — 252 tests.
- `npm run test:run`: OK — 41 archivos, 620 tests.
- `npm run build`: OK — Vite completó build; warning conocido por chunk JS de 840.39 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK. Archivos nuevos también revisados con `git diff --no-index --check`.
