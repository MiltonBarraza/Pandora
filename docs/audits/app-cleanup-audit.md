# Auditoría técnica de limpieza — Pandora / Excel Sanitizer

Fecha: 2026-06-23  
Branch observada: `49-componentizar-componentes`  
Branch indicada en el pedido: `37-review-visual-e-iconos`

## Resumen ejecutivo

Se auditó el árbol TypeScript/React completo mediante inventario de archivos, búsquedas con `rg`, grafo de imports, análisis de símbolos con TypeScript, compilación con `noUnusedLocals`/`noUnusedParameters`, tests y build.

La aplicación no tenía componentes o módulos de runtime desconectados, salvo cuatro módulos consumidos sólo por tests (`columnData`, `wizardConfiguration`, `settingsRemap`) o sin consumidor (`parseCurrency`). Se eliminó inicialmente sólo el último; en una etapa posterior `columnData` se integró al análisis real de columnas y `wizardConfiguration` se eliminó tras migrar su cobertura al flujo vigente del wizard. TypeScript detectó además un subárbol de UI reemplazado dentro del editor de recetas; se eliminó sin alterar recetas, settings, remap, references, `manualRange`, preview, filtros ni exportación.

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
- `columnData.ts`: consolidado posteriormente como helper usado por `columnAnalysis.ts`.
- `wizardConfiguration.ts`: eliminado posteriormente tras migrar la cobertura al flujo actual de descarte del wizard.
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
- `columnData.ts` y `wizardConfiguration.ts`: resueltos posteriormente; `columnData` quedó conectado al runtime y `wizardConfiguration` fue reemplazado por helpers del wizard vigente.
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

1. Resuelto posteriormente: `columnData.ts` se consolidó con el runtime y `wizardConfiguration.ts` se eliminó tras migrar sus tests al flujo vigente.
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

Decisión inicial: conservar documentado; resuelto posteriormente con integración al runtime.

- No es fixture ni helper de test: es un módulo puro de dominio consumido actualmente sólo por su test.
- Sus tests documentan semántica útil y real de presencia de datos: `null`, `undefined` y strings en blanco son vacíos; `0`, `false`, fechas y strings con contenido son datos.
- Esa semántica coincide con necesidades de detección de columnas, aunque runtime hoy usa lógica equivalente dentro de `columnAnalysis.ts`.
- Resolución posterior: `columnAnalysis.ts` usa `cellHasData`, por lo que la semántica de presencia de datos tiene una fuente compartida y cubierta por tests.

### `wizardConfiguration.ts`

Decisión inicial: conservar documentado; resuelto posteriormente con migración al flujo vigente.

- Representa un intento anterior de centralizar la política de descarte del wizard.
- Runtime actual usa `requestConfigurationDiscard` y un modal asíncrono con acción pendiente, por lo que el helper booleano ya no modela toda la implementación.
- Sus tests todavía documentan una regla válida: configuración limpia no confirma; configuración sucia respeta decisión de descarte.
- Resolución posterior: la cobertura se migró a `ImportWizard.test.ts`, y el módulo/test viejo se eliminó.

### Pendientes para otra PR

- Consolidación de `columnData.ts` y migración de `wizardConfiguration.ts`: resueltas posteriormente.
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

## Etapa posterior: extracción de subcomponentes del editor

Se extrajeron subcomponentes presentacionales pequeños de `OutputColumnRecipeEditor.tsx` sin cambiar UI, markup, textos, clases, settings ni dominio.

### Componentes extraídos

- `OutputColumnRecipeEditor.components.tsx`:
  - `RecipeMainFields`: selector de tipo de receta, selector de columna directa y campo de texto fijo.
  - `CustomValueSummary`: resumen visible de valor personalizado y acción de edición.
- `OutputColumnRecipeEditor.StepFields.tsx`:
  - `StepTypeSelect` y `StepModeSelect`.
  - `StepSourceFields`, `StepOperandFields` e `InputColumnSelect`.
  - `StepConditionFields` y `shouldShowStepTypeSelectForStep`, re-exportados desde el editor para mantener imports actuales de tests.

`recipeEditorPreviousResultHelpText` se movió a `OutputColumnRecipeEditor.constants.ts` y se re-exporta desde `OutputColumnRecipeEditor.tsx` para evitar ciclos entre componentes.

### Código conservado dentro del editor

- Estado/hooks del editor y control de modales.
- `CustomValueEditor`, `StepBlocksEditor`, `SimpleStepBlock`, `StepDetailPanel` y `StepFields`, porque coordinan modo, steps, previews y callbacks locales.
- Workspace de concatenación (`ConcatStepFields`/`ConcatPartStepsEditor`), porque extraerlo en esta pasada obligaba a pasar `StepDetailPanel` o aumentar demasiado el contrato de props.
- Generador, tabla, edición visual y comportamiento de `manualRange`.
- Previews y summaries acoplados a `buildProcessedRows`, datos de muestra o estructura renderizada.

`OutputColumnRecipeEditor.tsx` bajó de 2.728 a 2.284 líneas en esta etapa, una reducción aproximada de 444 líneas. No hubo cambios visuales, de markup, comportamiento, settings, dominio, `manualRange`, remap/references, filtros, preview normalizada, exportación, columnas virtuales ni anchos normalizados.

### Validaciones de extracción

- Test específico `OutputColumnRecipeEditor.test.tsx`: OK — 252 tests.
- `npm run test:run`: OK.
- `npm run build`: OK — mantiene warning conocido por chunk JS mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK.

## Cierre de integración visual posterior

Se revisó e integró el trabajo visual posterior sobre las secciones 4, 5, 6, 7 y 8 sin abrir nuevos cambios de dominio.

### Cambios visuales consolidados

- Secciones 5 y 7 (`IgnoreRules`):
  - reglas compactas en filas horizontales;
  - header común `Columna / Condición / Valor`;
  - labels repetidos ocultos en desktop y conservados en mobile;
  - botón eliminar icon-only danger con tooltip;
  - divider único bajo el header común, sin separadores repetidos entre filas.
- Sección 6 (`OutputColumnsManager`):
  - lista de columnas compactada;
  - acciones icon-only para duplicar, eliminar y reordenar;
  - se retiraron chip `Generada/Manual` y botón extra `Editar receta`;
  - panel izquierdo ampliado para aprovechar mejor el espacio;
  - resumen de receta truncado con `TruncatedText`;
  - tooltip largo corregido para cadenas sin espacios;
  - hover alineado con el lenguaje visual de la sección 3;
  - botones e icon-buttons alineados a la altura de inputs/dropdowns.
- Sección 4 (`RawPreview`):
  - valores largos de celdas truncados con tooltip.
- Sección 8 (`ProcessedRowsPreview`):
  - tabla normalizada con columnas fijas, scroll horizontal y truncado;
  - headers y celdas largas usan `TruncatedText`.
- UI global:
  - `ActionButton`, `iconButton`, `dragHandle` y acciones icon-only usan altura de 40 px;
  - `InfoTooltip` permite wrap fuerte y mayor ancho máximo para textos largos.

### Archivos principales tocados

- `src/components/IgnoreRules/IgnoreRules.tsx`
- `src/components/OutputColumnsManager/OutputColumnsManager.tsx`
- `src/components/RawPreview/RawPreview.tsx`
- `src/components/ProcessedRowsDebugPreview/ProcessedRowsDebugPreview.tsx`
- `src/components/SortableList/SortableList.tsx`
- `src/components/ui/ActionButton/ActionButton.css`
- `src/components/ui/InfoTooltip/InfoTooltip.css`
- `src/components/ui/AppIcon/iconMap.ts`
- `src/styles.css`

### Estado del editor

`OutputColumnRecipeEditor.tsx` quedó en 2.284 líneas. La baja posterior a la modularización de helpers se explica por la extracción de subcomponentes presentacionales a:

- `OutputColumnRecipeEditor.components.tsx`
- `OutputColumnRecipeEditor.StepFields.tsx`

El cierre visual posterior no modificó `OutputColumnRecipeEditor.tsx`.

### Límites confirmados

No hubo cambios de dominio, settings, exportación, importación, remap/references, procesamiento, columnas virtuales, `manualRange` ni comportamiento de filtros. Los cambios de preview son sólo de presentación: truncado, tooltip, anchos fijos y scroll horizontal; los datos procesados/exportados no cambian.

### Pendientes para otra PR

- Evaluar tooltips basados en overflow real si se necesita precisión total en lugar del umbral actual de `TruncatedText`.
- Revisar con captura visual en navegadores/tamaños específicos si se quiere ajustar fino de spacing, sin mezclarlo con dominio.

### Validaciones de cierre visual

- Test específico `OutputColumnRecipeEditor.test.tsx`: OK.
- `npm run test:run`: OK.
- `npm run build`: OK — mantiene warning conocido por chunk JS mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK.

## QA visual posterior

Se revisó manualmente la integración visual posterior sobre las secciones 4, 5, 6, 7 y 8, más controles globales relacionados (`ActionButton`, `iconButton`, `dragHandle`, `InfoTooltip`, dark mode y responsive básico). La app se abrió en Vite sobre `http://127.0.0.1:5173/`; el cascarón real se verificó en claro, oscuro y viewport mobile sin overflow lateral global ni errores de consola. La carga real de archivo no pudo automatizarse desde el navegador interno porque esta superficie no expuso carga directa de archivos y el sandbox de evaluación no permitió construir `File`; las secciones dependientes de datos se revisaron por estructura real de componentes y CSS.

### Correcciones menores aplicadas

No se aplicaron correcciones de UI. No se detectó un problema menor, evidente y dentro del alcance que justificara tocar código.

### Problemas no corregidos

- Pendiente fuera de alcance: en `manualRange`, el botón de ojo conserva `title="Ver filas"` aunque el `aria-label` cambia a `Ocultar filas` cuando el preview está abierto. No se corrigió porque la pasada tenía prohibido tocar `manualRange`.
- Pendiente operativo: repetir una captura visual con archivo real cargado desde un navegador con soporte de upload automatizado si se quiere evidencia visual completa de secciones 4 a 8 con datos largos.

### Validaciones ejecutadas

- `npm run test:run`: OK — 41 archivos, 620 tests.
- `npm run build`: OK — mantiene warning conocido por chunk JS mayor a 500 kB (`842.62 kB`).
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK — con aviso de conversión LF a CRLF en `docs/audits/app-cleanup-audit.md`.

## Optimización inicial de bundle

Se revisaron los puntos con mayor probabilidad de peso en el bundle: lectura Excel (`xlsx`), exportación XLSX, editor de recetas, previews/tablas y componentes que no son necesarios antes de cargar un archivo. El build base emitía un único chunk JS principal de `842.61 kB` y mantenía el warning de Vite por superar 500 kB.

### Cambios aplicados

- Se agregó `manualChunks` en `vite.config.ts` para aislar `xlsx` en un chunk propio.
- Se movió la importación de exportadores XLSX en `ExportActions` a imports dinámicos bajo demanda, ejecutados recién al descargar Excel o auditoría.
- CSV quedó igual, porque no depende de `xlsx` y ya era liviano.

### No tocado por riesgo

- No se convirtió `getSheetRows` a async ni se reimplementó `XLSX.utils.format_cell`, porque podía cambiar formato de celdas y comportamiento de lectura.
- No se aplicó lazy loading al editor de recetas ni a secciones visuales, porque el split de `xlsx` ya eliminó el warning y fragmentar más aumentaba riesgo sin necesidad.
- No se tocó dominio, settings, `manualRange`, remap/references, filtros, previews a nivel datos, columnas virtuales, procesamiento ni comportamiento de export/import.

### Resultado de build

- Antes: `dist/assets/index-CfvXyENM.js` — `842.61 kB` gzip `266.65 kB`, con warning.
- Después: `dist/assets/index-DsLzFzet.js` — `416.26 kB` gzip `124.09 kB`.
- Después: `dist/assets/xlsx-C1Uu-mq-.js` — `424.85 kB` gzip `141.83 kB`.
- Después: `dist/assets/exportXlsx-DoZHytE2.js` — `0.97 kB` gzip `0.56 kB`.
- El warning de chunk mayor a 500 kB desapareció.

### Validaciones ejecutadas

- `npm run test:run`: OK — 41 archivos, 620 tests.
- `npm run build`: OK — sin warning de chunk mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK — con avisos de conversión LF a CRLF en archivos tocados.

### Pendientes futuros

- Evaluar diferir `xlsx` de la carga inicial si se acepta una refactorización específica de lectura Excel y `getSheetRows`.
- Considerar `React.lazy` para el editor de recetas sólo si el bundle principal vuelve a crecer por encima del umbral.

## Corrección conceptual: texto fijo como acción

Se corrigió la presentación conceptual de `Texto fijo` en el editor de recetas para que no aparezca como una fuente variable dentro de `Fuente del valor`. La acción textual queda representada como `Usar texto fijo` dentro de `Qué quiero hacer`, junto a `Usar columna de entrada`, `Elegir texto desde columna` y `Usar resultado anterior` cuando aplica.

### Cambios aplicados

- `Fuente del valor` dejó de listar `Texto fijo` en los helpers de fuentes de steps.
- Las fuentes `fixedText` ya persistidas siguen renderizando su input de texto sin mostrar el selector redundante.
- Los valores de `manualRange` y partes de concat mantienen `Usar texto fijo` como acción textual y dejan `Texto fijo` fuera de los dropdowns de fuentes variables.

### Compatibilidad preservada

- Internamente las recetas y valores existentes siguen usando `fixedText`.
- No se cambió el shape de dominio, settings, remap/references, export/import, filtros, previews de datos, columnas virtuales, procesamiento ni comportamiento funcional de `manualRange`.

### Validaciones ejecutadas

- Test específico `OutputColumnRecipeEditor.test.tsx`: OK — 254 tests.
- `npm run test:run`: OK — 41 archivos, 622 tests.
- `npm run build`: OK — sin warning de chunk mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK — con avisos de conversión LF a CRLF en archivos tocados.

## Consolidación de módulos documentales

Se consolidaron los dos módulos que habían quedado documentados como pendientes por estar cubiertos sólo por tests o por representar una política anterior.

### `columnData.ts`

`columnData.ts` se conservó y dejó de ser sólo documental: `columnAnalysis.ts` ahora usa `cellHasData` para contar datos y recolectar muestras. La semántica queda compartida entre helper y runtime:

- `null`, `undefined` y strings vacíos o con sólo espacios se consideran vacíos.
- `0`, `false`, `Date` y strings con contenido se consideran datos.

Los tests de `columnData` se conservaron como cobertura del helper, y `columnAnalysis.test.ts` ahora cubre que la detección real de columnas usa esa misma semántica.

### `wizardConfiguration.ts`

`wizardConfiguration.ts` se eliminó junto con su test viejo. Su regla útil se migró a helpers exportados desde el flujo vigente de `ImportWizard`:

- estado limpio continúa la acción pendiente sin confirmación;
- estado protegido abre confirmación;
- confirmar ejecuta la acción pendiente;
- cancelar no ejecuta la acción pendiente.

La cobertura ahora vive en `ImportWizard.test.ts`, cerca del flujo real de descarte/configuración.

### Límites confirmados

No hubo cambios visibles ni funcionales de UI. No se modificaron dominio de recetas, settings, export/import, remap/references, filtros, previews a nivel datos, `manualRange`, columnas virtuales ni procesamiento funcional.

### Validaciones ejecutadas

- Tests específicos `columnData` / `columnAnalysis`: OK — 2 archivos, 6 tests.
- Test específico `ImportWizard.test.ts`: OK — 25 tests.
- `npm run test:run`: OK — 40 archivos, 625 tests.
- `npm run build`: OK — sin warning de chunk mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK — con avisos de conversión LF a CRLF en archivos tocados.

## Unificacion inicial de logica de fuentes del editor

Se detecto duplicacion real entre el editor principal de recetas y `RangeValueEditor` alrededor de labels, acciones visuales y opciones de fuentes: `Usar texto fijo`, `Usar columna de entrada`, `Elegir texto desde columna`, `Usar resultado anterior`, `Texto encontrado en el rango`, valores `fixedText` persistidos y la regla visual que evita mostrar `Texto fijo` como una fuente variable dentro de `Fuente del valor`.

### Helpers creados o ampliados

- Se creo `OutputColumnRecipeEditor.valueActionHelpers.ts`.
- El helper centraliza labels de acciones/fuentes, opciones de acciones de texto, opciones de fuentes variables, mapeo desde `StepSource` hacia accion visual, mapeo desde accion visual hacia `StepSource`, mapeo de valores de dropdown y `shouldShowValueSourceSelector`.
- `OutputColumnRecipeEditor.optionHelpers.ts` conserva sus exports publicos existentes, pero ahora delega en el helper compartido para fuentes y acciones de texto.

### Uso actual

- El editor principal usa la logica compartida a traves de `optionHelpers` y `StepSourceFields`. `StepSourceFields` ahora usa `shouldShowValueSourceSelector` para no mostrar el selector cuando la fuente persistida es `fixedText`.
- `RangeValueEditor` usa el helper compartido para labels de acciones, opciones de fuentes variables, mapeo de fuentes de partes de concat y la misma regla de visibilidad del selector.
- Se mantuvo el orden historico de opciones donde ya estaba cubierto por tests: en valores de rango, `Texto encontrado en el rango` sigue apareciendo antes que `Elegir texto desde columna`; en partes de concat, `Resultado anterior` sigue usando el label corto.

### Pendiente

- La fuente primaria de `manualRange` todavia conserva un mapeo local pequeno porque parte de `ManualRangeValueSourceType`, no de `StepSource` puro.
- `RangeValueEditor` todavia tiene JSX propio para campos de detalle (`input`, `fixedText`, `rangeText`) y no se unifico con `StepSourceFields`.
- Summaries y textos descriptivos mas complejos quedan para una segunda etapa si se decide unificar presentacion, no solo helpers.

### Limites confirmados

No hubo cambios de dominio, shape de recetas, settings, export/import, remap/references, filtros, preview a nivel datos, columnas virtuales ni procesamiento. No se cambio funcionalmente `manualRange`; solo se reemplazo logica UI duplicada por helpers compartidos.

### Validaciones ejecutadas

- Test especifico `OutputColumnRecipeEditor.test.tsx`: OK - 257 tests.
- `npm run test:run`: OK - 40 archivos, 628 tests.
- `npm run build`: OK - sin warning de chunk mayor a 500 kB.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- `git diff --check`: OK - con avisos de conversion LF a CRLF en archivos tocados.
