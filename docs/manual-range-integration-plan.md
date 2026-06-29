# Plan de integración de rangos en modal nuevo

Fecha: 2026-06-29  
Branch diagnosticado: `56-unir-concatenar-y-rangos`  
Branch fuente de inventario: `55-modal-v5-rangos`

## 1. Alcance del diagnóstico

Este documento compara modal nuevo contra inventario de modal v5. No implementa editor, no mezcla ramas y no modifica dominio, procesamiento, settings, export/import, remap, references ni shape de recipes.

Estado inicial del branch nuevo:

- branch: `56-unir-concatenar-y-rangos`;
- tracking: `origin/56-unir-concatenar-y-rangos`;
- worktree limpio;
- `docs/manual-range-modal-v5-inventory.md` no existe en este branch; comparación usa contenido entregado y lectura read-only de `origin/55-modal-v5-rangos` mediante Git;
- ningún cambio funcional realizado.

## 2. Resumen del inventario fuente

UI v5 activa se concentra en:

- `ManualRangeSpreadsheetEditor`: planilla, selección de filas reales, lista lateral, navegación cruzada, sugerencias, columnas y confirmaciones.
- `ManualRangeSpreadsheetEditor.helpers`: selección, CRUD inmutable, clases, solapamientos, límites y preview.
- `ManualRangeAdvancedRangeModal`: edición transaccional de límites/valor y filas cubiertas.
- `ManualRangeColumnsModal`: columnas `Disponibles`/`Visibles` y toggle `Resultado`.
- `RangeValueEditor` y `ColumnTextPicker`: construcción avanzada del valor.

Contrato principal:

```ts
{
  recipe: Extract<OutputRecipe, { type: 'manualRange' }>;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: Extract<OutputRecipe, { type: 'manualRange' }>) => void;
}
```

Semántica a preservar:

- números reales de fila;
- primer rango configurado gana ante solapamiento;
- draft controlado por modal padre;
- `valueRecipe` moderno más lectura legacy de `valueSource`/`value`;
- sugerencias se revisan antes de aplicar;
- crear, editar, borrar y ordenar emiten recipe completa sin persistir por sí solos.

## 3. Estado actual del branch nuevo

### 3.1 Ya existe y debe reutilizarse

| Área | Estado actual |
| --- | --- |
| Tipos `ManualRangeValue`, `RangeValueRecipe`, recipe/step | Presentes. Sin diferencias detectadas contra branch v5. |
| `manualRangeModel.ts` | Presente. Sin diferencias detectadas contra branch v5. |
| Runtime/settings/remap/references/services | Presentes. Fuera de alcance. |
| `RangeValueEditor.tsx` | Presente y adaptado al rework nuevo. Difiere del branch v5; no sobrescribir. |
| `ColumnTextPicker.tsx` | Presente y adaptado. Difiere del branch v5; no sobrescribir. |
| `manualRangeRows` | Ya fluye desde `ImportWizard` → `OutputColumnsManager` → `OutputColumnRecipeEditor` → `RecipeStudioShell`. |
| Draft/cancel/apply | Ya existe en `OutputColumnRecipeEditor`: `draftRecipe`, `setDraftRecipe`, `applyRecipeEditorDraft`, confirmación de descarte. |
| Adaptadores recipe ↔ step | Presentes: `manualRangeStepToRecipe` y `manualRangeRecipeToStepPatch`. |
| Condición manualRange | `StepFields`/`StepConditionFields` ya distinguen `variant="manualRange"`. |
| CSS de RecipeStudio | Presente en `OutputColumnRecipeEditor.recipeStudio.css`. |

### 3.2 Falta respecto de v5

Archivos ausentes:

1. `ManualRangeSpreadsheetEditor.tsx`.
2. `ManualRangeSpreadsheetEditor.helpers.ts`.
3. `ManualRangeAdvancedRangeModal.tsx`.
4. `ManualRangeColumnsModal.tsx`.
5. `__tests__/ManualRangeSpreadsheetEditor.test.tsx`.

CSS ausente:

- familia `.manualRangeSpreadsheet*`;
- `.manualRangeSuggested*`;
- `.manualRangeAdvancedRangeModal*` / `.manualRangeCoveredRows*`;
- `.manualRangeColumns*`;
- overrides responsive específicos.

### 3.3 Existe pero no debe ser integración final

`OutputColumnRecipeEditor.tsx` conserva editor legacy:

- `ManualRangeRecipeEditor` con lista vertical vieja;
- `ManualRangeTextGenerator` inline;
- `ManualRangeTableRow`;
- `ManualRangeRowsPreview`.

`RecipeStudio.tsx` contiene además un `RangeStudio` alternativo con cards, duplicar, preview y sugerencias, pero ruta activa para `recipe.type === 'manualRange'` renderiza `RangeStudioPlaceholder`. Ese `RangeStudio` no es spreadsheet v5 y duplica responsabilidades. No conviene completar ambos.

## 4. Punto exacto de integración

Existen dos caminos distintos.

### Camino A — operación manualRange dentro de recipe `combine` (objetivo principal)

Flujo actual:

```text
CustomValueEditor
→ SimpleStepsEditor(studioLayout)
→ SimpleStepBlock
→ section.recipeStudioGeneralSection[aria-label="Configuración general"]
→ StepModeSelect: "Trabajar con rangos"
→ StepFields detecta step.type === "manualRange"
→ ManualRangeRecipeEditor(manualRangeStepToRecipe(step))
```

`ManualRangeRecipeEditor` ya queda renderizado después de controles/condición dentro de `Configuración general`. Punto mínimo y seguro: reemplazar cuerpo legacy de ese wrapper por `ManualRangeSpreadsheetEditor`, conservando:

```ts
onChange={(recipe) => onChange(manualRangeRecipeToStepPatch(recipe))}
```

Resultado buscado:

```text
Configuración general
├─ Tipo de operación: Trabajar con rangos
├─ condición general del step
└─ ManualRangeSpreadsheetEditor
```

No agregar modelo nuevo ni estado paralelo en `RecipeStudio`.

### Camino B — recipe top-level `type: manualRange` existente

Flujo actual:

```text
ManualRangeSummary → abrir modal → RecipeStudioShell
→ recipe.type === "manualRange"
→ RangeStudioPlaceholder
```

Debe reutilizar mismo renderer, no segundo editor. En `RecipeStudioShell`, reemplazar placeholder por wrapper de integración que invoque:

```ts
renderManualRangeRecipeEditor({ recipe, inputColumns, manualRangeRows, onChange })
```

Si producto exige título `Configuración general` también para recipes top-level, agregar contenedor liviano en `RecipeStudio.tsx`; spreadsheet debe quedar debajo, no dentro de dropdowns. No activar `RangeStudio` alternativo.

## 5. Componentes a portar o adaptar

### Copiar desde branch v5 sin merge

| Archivo | Acción futura |
| --- | --- |
| `ManualRangeSpreadsheetEditor.tsx` | Portar completo; adaptar imports/UI primitives sólo si compilación lo exige. |
| `ManualRangeSpreadsheetEditor.helpers.ts` | Portar completo; mantener funciones puras y semántica de orden. |
| `ManualRangeAdvancedRangeModal.tsx` | Portar completo; conservar draft interno y confirmación de descarte. |
| `ManualRangeColumnsModal.tsx` | Portar completo; conservar estado visual local. |
| `ManualRangeSpreadsheetEditor.test.tsx` | Portar como suite base y adaptar únicamente integración/markup del modal nuevo. |

No usar merge/cherry-pick amplio. Copiar archivos concretos desde `55-modal-v5-rangos` y revisar diff.

### Reutilizar versión actual

- `RangeValueEditor.tsx`: branch nuevo tiene cambios propios; spreadsheet/modal avanzado debe consumir esta versión.
- `ColumnTextPicker.tsx`: conservar versión actual.
- `Modal`, `ConfirmDialog`, `InfoTooltip`, `Dropdown`, `ActionButton`, `AppIcon`, `SortableList`.
- `manualRangeModel.ts`, tipos, runtime e infraestructura.

### Adaptar, no reemplazar

- `OutputColumnRecipeEditor.tsx`: cambiar wrapper `ManualRangeRecipeEditor`; conservar draft/cancel/apply y concatenar.
- `RecipeStudio.tsx`: sustituir placeholder top-level por renderer compartido. No tocar compose/concat.
- `OutputColumnRecipeEditor.StepFields.tsx`: idealmente ningún cambio. Ya detecta manualRange y oculta segundo selector. Sólo tocar si contrato de layout exige wrapper/clase explícita.

## 6. Helpers a portar

Desde `ManualRangeSpreadsheetEditor.helpers.ts`:

- filas/rangos: `isRowInsideManualRange`, `isRowInsideAnyManualRange`, `getFirstManualRangeForRowNumber`, `getManualRangeById`;
- selección: normalización, update de clicks, resumen, inicio/fin y selección interna;
- CRUD: crear desde selección, patch/update/remove, borrar todos, ordenar;
- solapamientos: ids involucrados y clase de item;
- tabla: labels/valores de celdas, columnas visibles/default/reconcile;
- preview: valor por fila y filas de preview;
- visual: clases de fila, boundary start/end, rango activo/sugerido.

Helpers de generación (`generateManualRangesFromTexts`, `generateManualRangesFromDataBlocks`) ya viven en dominio actual. Importar; no duplicar.

Helpers recipe ↔ step ya existen. Conservar única frontera:

```text
step manualRange → manualRangeStepToRecipe → spreadsheet
spreadsheet recipe → manualRangeRecipeToStepPatch → step
```

## 7. CSS a portar/adaptar

### Estrategia recomendada

No copiar 975 líneas del diff global de `styles.css`. Extraer sólo bloques activos de v5.

Preferencia:

1. crear `ManualRangeSpreadsheetEditor.css` junto al componente;
2. importar desde `ManualRangeSpreadsheetEditor.tsx`;
3. incluir familias spreadsheet, sugerencias, modal avanzado, columnas y responsive;
4. dejar `.rangeValue*`, `.field`, buttons, `columnTransfer*` y tokens en CSS compartido actual;
5. scopear overrides conflictivos bajo `.manualRangeSpreadsheet`, `.manualRangeAdvancedRangeModal` o `.manualRangeColumnsModal`.

Si proyecto prefiere CSS central, agregar bloque delimitado en `styles.css`; no modificar reglas RecipeStudio/concat salvo conflicto demostrado.

### Conflictos previsibles

- `.constructorModalContent.recipeStudio .recipeField` fuerza controles de 36px.
- reglas globales de modal para `input` pueden atravesar modales anidados; checkboxes necesitan selector específico.
- `.columnTransferPanel` define variables/alturas y puede ganar por orden; usar selector local suficiente.
- `.recipeStudioGeneralSection` tiene padding/background propios; spreadsheet ya tiene border/padding. Evitar doble card excesiva.
- ancestors con `overflow` pueden alterar sticky header/primera columna y `scrollIntoView`.
- breakpoints de `recipeStudio.css` y spreadsheet convergen cerca de móvil; probar 760px.
- portals de modal/tooltip deben mantener z-index y focus trap.

## 8. Props y datos necesarios

Datos ya disponibles en ambos puntos de montaje:

| Prop | Fuente actual |
| --- | --- |
| `recipe` | `manualRangeStepToRecipe(step)` para Camino A; `modalManualRangeRecipe` para Camino B. |
| `inputColumns` | `activeInputColumns`, ya enviados a `RecipeStudioShell`/StepFields. |
| `manualRangeRows` | Prop de `OutputColumnRecipeEditor`, derivada en `ImportWizard` con filas output visibles. |
| `onChange` | En Camino A adapta recipe a patch del step; en Camino B usa `setDraftRecipe`. |

No hace falta `sampleInputValues` para spreadsheet. No crear fetch, contexto ni copia de filas.

Estado visual (`selection`, columnas visibles, sugerencias, selectedRangeId, refs) queda interno al spreadsheet. Recipe permanece controlada.

## 9. Plan de implementación por etapas

### Etapa 0 — baseline y contratos

Objetivo: congelar comportamiento actual antes de tocar UI.

Archivos a tocar:

- sólo tests existentes si falta aserción de placeholder/draft; preferible ninguno.

Acciones:

- ejecutar suite focal actual;
- registrar markup de manualRange step dentro de `Configuración general`;
- registrar placeholder top-level;
- confirmar cancel/apply de draft.

Tests mínimos:

- selector `Trabajar con rangos` produce `TransformStep.type = manualRange`;
- adapter step ↔ recipe conserva rangos/condición;
- cancel no persiste draft.

### Etapa 1 — portar unidad spreadsheet aislada

Archivos a crear:

- `ManualRangeSpreadsheetEditor.tsx`;
- `ManualRangeSpreadsheetEditor.helpers.ts`;
- `ManualRangeAdvancedRangeModal.tsx`;
- `ManualRangeColumnsModal.tsx`;
- `ManualRangeSpreadsheetEditor.css` o bloque CSS específico;
- `__tests__/ManualRangeSpreadsheetEditor.test.tsx`.

Archivos a adaptar:

- imports hacia primitives actuales;
- tests sólo por diferencias legítimas de wrappers/primitives.

No montar todavía en RecipeStudio durante primer commit. Compilar/exportar unidad aislada.

Tests mínimos:

- render tabla, filas reales, Resultado y empty states;
- crear una fila/rango completo;
- editar/borrar/ordenar;
- inicio/fin/overlap/activo;
- sugerencias y columnas;
- navegación tabla ↔ lista;
- modal avanzado conserva draft y discard.

### Etapa 2 — integrar Camino A dentro de Configuración general

Archivos a tocar:

- `OutputColumnRecipeEditor.tsx`;
- `OutputColumnRecipeEditor.test.tsx`;
- quizá CSS específico para quitar doble wrapper.

Acción:

- reducir `ManualRangeRecipeEditor` a wrapper fino: warning heredado + spreadsheet + warning de overlap si sigue fuera;
- eliminar de ruta activa lista/generador legacy duplicados, sin borrarlos aún;
- mantener adapters existentes en `StepFields`.

Tests mínimos:

- `Configuración general` aparece antes del spreadsheet;
- seleccionar `Trabajar con rangos` monta exactamente un `.manualRangeSpreadsheet`;
- recipe del step se actualiza vía adapter;
- condición general sigue visible y editable;
- concatenar no cambia de markup/comportamiento.

### Etapa 3 — integrar recipes top-level existentes

Archivos a tocar:

- `RecipeStudio.tsx`;
- `OutputColumnRecipeEditor.tsx` sólo si renderer necesita nombre/contrato nuevo;
- tests de integración.

Acción:

- reemplazar `RangeStudioPlaceholder` por renderer del mismo spreadsheet;
- opcional wrapper `Configuración general` para consistencia visual;
- no activar `RangeStudio`, `RangeRulesList` ni inspector alternativo.

Tests mínimos:

- top-level `manualRange` abre spreadsheet con recipe existente;
- aplicar modal persiste draft;
- cancelar descarta create/edit/delete;
- no aparece placeholder;
- spreadsheet aparece una sola vez.

### Etapa 4 — compatibilidad visual/modal anidado

Archivos a tocar:

- CSS específico de spreadsheet;
- sólo componentes portados si hacen falta clases scopeadas.

Tests mínimos/manuales:

- desktop y ancho <= 760px;
- sticky header/columna Fila;
- scroll interno y navegación cruzada;
- modal avanzado, columnas, sugerencias y ConfirmDialog sobre modal XL;
- Escape/focus/discard;
- tooltip y checkbox compactos;
- empty transfer item misma altura que item normal.

### Etapa 5 — limpieza controlada

Sólo después de equivalencia y tests verdes.

Archivos candidatos:

- `OutputColumnRecipeEditor.tsx`;
- `RecipeStudio.tsx`;
- `OutputColumnRecipeEditor.recipeStudio.css`;
- tests legacy.

Acción:

- eliminar editor/generador/lista legacy sólo si no quedan imports/tests consumidores;
- eliminar `RangeStudio` alternativo/placeholder y CSS `rangeRule*` sólo si realmente muertos;
- mantener exports usados externamente hasta migrar tests.

No mezclar limpieza con port inicial.

## 10. Riesgos

### Alto

1. **Dos shapes de integración:** top-level recipe y manualRange step. Un solo spreadsheet; adapters en frontera.
2. **Draft ownership:** `onChange` debe actualizar `draftRecipe`, nunca columna persistida antes de aceptar modal.
3. **Duplicación de editores:** legacy `ManualRangeRecipeEditor`, `RangeStudio` y spreadsheet pueden coexistir. Ruta activa debe montar uno.
4. **Sobrescribir rework:** copiar `RangeValueEditor`, `ColumnTextPicker`, `RecipeStudio` u `OutputColumnRecipeEditor` desde v5 perdería cambios nuevos.

### Medio

5. **CSS anidado:** reglas del modal XL/RecipeStudio atraviesan modales hijos.
6. **Orden semántico:** ordenar rangos cambia ganador en overlaps; preservar helper exacto.
7. **Filas reales:** no convertir `rowNumber` a índice ni usar preview recortado como fuente.
8. **Condiciones duplicadas:** `recipe.condition` legacy y `step.condition` general tienen roles diferentes.
9. **Modales dentro de modal:** focus, Escape, portal, z-index y discard.

### Bajo pero visible

10. preferencias de columnas no persistidas al cerrar/remontar spreadsheet;
11. scroll sticky necesita descontar header;
12. responsive puede apilar side panel y alterar alturas.

## 11. Matriz mínima de tests por capa

| Capa | Tests obligatorios |
| --- | --- |
| Helpers spreadsheet | selección, bounds, single-row, overlap, first-range-wins, CRUD, sort, preview. |
| UI spreadsheet | estructura, toolbar, divider, row classes, lista, empty states, Resultado. |
| Modales hijos | advanced draft/discard/delete, sugerencias, columnas compactas. |
| Integración step | montaje debajo de General, adapters, condición, draft. |
| Integración top-level | reemplazo placeholder, apply/cancel, recipe legacy. |
| No regresión | concat/compose, custom value, StepFields, output editor. |
| Infraestructura | suites existentes de outputModel/settings/remap/references, sin modificar código. |

Comandos previstos durante implementación futura:

```bash
npm.cmd run test:run -- src/components/OutputColumnRecipeEditor/__tests__/ManualRangeSpreadsheetEditor.test.tsx
npm.cmd run test:run -- src/components/OutputColumnRecipeEditor/__tests__/OutputColumnRecipeEditor.test.tsx
npm.cmd run test:run -- src/domain/import/__tests__/outputModel.test.ts
npm.cmd run build
```

## 12. Decisiones recomendadas antes de implementar

1. Fuente única visual: `ManualRangeSpreadsheetEditor`.
2. Camino A primero; es objetivo explícito y punto ya preparado en `Configuración general`.
3. Camino B después, reutilizando mismo renderer.
4. No activar `RangeStudio` alternativo.
5. No sobrescribir `RangeValueEditor` ni `ColumnTextPicker` actuales.
6. CSS específico en archivo propio, scopeado; evitar bloque global masivo.
7. Limpieza legacy en commit/etapa separada.

## 13. Archivos previstos por etapa

```text
Etapa 1 (nuevos)
  src/components/OutputColumnRecipeEditor/ManualRangeSpreadsheetEditor.tsx
  src/components/OutputColumnRecipeEditor/ManualRangeSpreadsheetEditor.helpers.ts
  src/components/OutputColumnRecipeEditor/ManualRangeAdvancedRangeModal.tsx
  src/components/OutputColumnRecipeEditor/ManualRangeColumnsModal.tsx
  src/components/OutputColumnRecipeEditor/ManualRangeSpreadsheetEditor.css
  src/components/OutputColumnRecipeEditor/__tests__/ManualRangeSpreadsheetEditor.test.tsx

Etapa 2 (adaptación step)
  src/components/OutputColumnRecipeEditor/OutputColumnRecipeEditor.tsx
  src/components/OutputColumnRecipeEditor/__tests__/OutputColumnRecipeEditor.test.tsx

Etapa 3 (top-level)
  src/components/OutputColumnRecipeEditor/RecipeStudio.tsx
  src/components/OutputColumnRecipeEditor/__tests__/OutputColumnRecipeEditor.test.tsx

Etapa 4 (visual)
  src/components/OutputColumnRecipeEditor/ManualRangeSpreadsheetEditor.css
  componentes portados sólo para clases scopeadas

Etapa 5 (limpieza opcional)
  OutputColumnRecipeEditor.tsx
  RecipeStudio.tsx
  OutputColumnRecipeEditor.recipeStudio.css
  tests legacy relacionados
```

## 14. Conclusión

Branch nuevo ya tiene contrato de datos, filas, draft y selector de operación necesarios. Falta UI spreadsheet, no dominio. Integración principal no requiere rediseñar RecipeStudio: wrapper `ManualRangeRecipeEditor` ya está colocado dentro de `Configuración general`. Portar unidad aislada, reemplazar contenido legacy y después resolver placeholder top-level. Concatenar queda intacto.

Validación de este diagnóstico: `git diff --check`.
