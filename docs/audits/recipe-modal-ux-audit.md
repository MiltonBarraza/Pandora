# Auditoría UX/visual del modal de recetas

Fecha: 2026-06-24

Branch observada: `51-rework-modal`

## Alcance y método

Auditoría exclusiva de presentación y UX del editor de recetas. No incluye cambios de dominio, settings, procesamiento ni comportamiento.

Se revisaron:

- `OutputColumnRecipeEditor.tsx`;
- `OutputColumnRecipeEditor.components.tsx`;
- `OutputColumnRecipeEditor.StepFields.tsx`;
- `RangeValueEditor.tsx`;
- `ColumnTextPicker.tsx`;
- `OutputColumnRecipeEditor.valueActionHelpers.ts`;
- estilos relacionados en `src/styles.css`;
- los 257 tests específicos del editor como mapa de compatibilidad y estados legacy.

También se inspeccionó la aplicación local en viewport de escritorio para confirmar lenguaje visual general: superficies claras, bordes suaves, radio de 8 px, controles compactos, azul como acento y jerarquía tipográfica contenida. El modal requiere una importación Excel previa y no había un archivo real cargado en la sesión de navegador; por eso el diagnóstico específico del modal se basa en su markup, CSS y cobertura de flujos, no en una captura con datos inventados.

## Estado actual

El editor tiene dos niveles visibles:

1. En la tarjeta de columna, `Tipo de operación` permite:
   - `Directa desde entrada`;
   - `Texto fijo`;
   - `Crear valor personalizado`.
2. El modal XL aparece sólo para recetas personalizadas (`combine`) o recetas existentes de rangos (`manualRange`).

`Directa desde entrada` y `Texto fijo` se configuran fuera del modal. `Crear valor personalizado` abre un editor basado en pasos. Dentro de esos pasos vuelven a aparecer `Tipo de operación` y `Qué quiero hacer`. Concatenar y rangos no son entradas principales: quedan escondidos dentro de esa segunda jerarquía.

El modal actual ya tiene varias bases correctas:

- título con nombre de columna;
- preview en header;
- draft local y confirmación al descartar;
- footer con `Cancelar` y `Aplicar`;
- cards separadas para pasos, partes y rangos;
- resúmenes fuera del modal;
- soporte responsive básico;
- ayudas contextuales y estados vacíos;
- previews específicos para resultado anterior, filas de rango y rangos sugeridos.

Problema principal: controles funcionan, pero modelo mental queda expuesto casi sin traducción. Usuario debe entender receta, fuente, step, resultado anterior, modo de operación, transformación, parte, condición y rango antes de completar tarea simple.

## Mapa de flujos actuales

| Necesidad | Flujo actual | Resultado interno |
| --- | --- | --- |
| Usar columna de entrada | `Tipo de operación` → `Directa desde entrada` → `Columna de entrada` | receta `direct` |
| Usar texto fijo | `Tipo de operación` → `Texto fijo` → input `Texto fijo` | receta `fixedText` |
| Elegir texto desde columna | `Crear valor personalizado` → editar → paso de texto → `Qué quiero hacer` → `Elegir texto desde columna` → `Buscar textos en` → `Texto encontrado` | fuente `fixedText` con valor elegido |
| Usar resultado anterior | En paso posterior o parte compatible → `Qué quiero hacer` → `Usar resultado anterior` | fuente `previousResult` |
| Trabajar con número | `Crear valor personalizado` → editar → paso → `Tipo de operación` → `Trabajar con número` → operación/operandos/redondeo | step numérico |
| Trabajar con fecha | `Crear valor personalizado` → editar → paso → `Tipo de operación` → `Trabajar con fechas` → fuente/acción → formatos y fallback | step de fecha |
| Concatenar | `Crear valor personalizado` → editar → paso de texto → `Qué quiero hacer` → `Concatenar` → sidebar de partes → detalle de parte | step `concat` con partes |
| Trabajar con rangos | Receta `manualRange` existente, o `Crear valor personalizado` → paso → `Tipo de operación` → `Trabajar con rangos` | receta o step `manualRange` |
| Agregar condición | Dentro de cada step → `Condición` / `Aplicar el valor` → siempre o condicional → columna, operador y valor | condición de step |
| Ver preview | Header del modal, resumen fuera del modal, ayuda de resultado anterior, preview de filas por icono y preview del generador | cálculo existente sin cambio de datos |

### Observaciones por flujo

#### Columna y texto fijo

Son flujos simples y cortos. Problema: lenguaje no es paralelo. `Directa desde entrada` describe implementación; `Texto fijo` describe contenido. Para usuario serían más claros `Copiar una columna` y `Usar el mismo texto`.

#### Elegir texto desde columna

La acción se comporta como ayuda para crear texto fijo, pero visualmente parece una fuente persistente distinta. Después de elegir, receta guarda `fixedText`. Esta diferencia interna no debería quedar a cargo del usuario.

#### Resultado anterior

Es potente pero dependiente de orden. Aparece junto a acciones simples. Ayuda explica que toma resultado del paso anterior, pero concepto sigue exigiendo comprender pipeline antes de usarlo.

#### Número y fecha

Exponen dos decisiones consecutivas: modo (`Trabajar con número/fechas`) y acción concreta. Para operaciones numéricas aparecen operandos, fuente, operación y redondeo. Para fechas aparecen fuente, formato de entrada, formato de salida y fallback. Son válidos, pero presentación plana les da igual peso aunque varias opciones sean avanzadas.

#### Concatenar

Usa sidebar `Parte 1`, `Parte 2`, etc. y panel de detalle. Permite reordenar, elegir fuente, configurar separador y aplicar transformaciones internas. Estructura soporta casos complejos, pero usuario no ve primero la frase final que está armando.

#### Rangos

Cada rango combina en una misma tarjeta:

- inicio;
- fin;
- cantidad de filas;
- referencia;
- acciones icon-only;
- editor completo del valor;
- pasos adicionales;
- preview de filas opcional.

Además, header general ofrece agregar, ordenar, borrar y generar sugeridos. Generador abre otra superficie densa con hasta cuatro columnas de controles por fila.

#### Condiciones

Condición aparece dentro de cada step. `Aplicar siempre` es valor neutro, pero control sigue ocupando espacio. En rangos hay además compatibilidad con una condición interna heredada, mostrada como warning técnico.

#### Preview y resumen

Preview principal está en header como línea pequeña con ellipsis. Es persistente, pero visualmente secundario. No aclara con fuerza qué fila/muestra se usa. Previews de rangos quedan detrás de icono de ojo. Resumen externo sí agrupa preview, partes y transformaciones, pero usuario lo ve después de cerrar modal.

## Problemas UX detectados

### 1. Jerarquía conceptual mezclada

`Qué quiero hacer` mezcla dos clases distintas:

- elegir origen: columna, texto fijo, texto encontrado, resultado anterior;
- transformar: mayúsculas, reemplazar, concatenar, formatear, etc.

Elegir fuente no es lo mismo que transformar. Mezclarlas reduce cantidad de controles, pero empeora comprensión y hace difícil anticipar qué campos aparecerán.

### 2. Dos selectores llamados `Tipo de operación`

Uno define receta general de columna. Otro define modo del step. Mismo label representa niveles diferentes. En rangos vuelve a usarse dentro del valor asignado. Esto debilita orientación.

### 3. Funciones principales ocultas dentro de `Crear valor personalizado`

Concatenar, calcular, formatear fecha y rangos son intenciones reconocibles. Hoy usuario primero elige categoría genérica y luego descubre función dentro de otro dropdown.

### 4. Demasiados controles con igual peso

Cards y grids muestran modo, acción, fuente, operandos, formatos, redondeo y condición con jerarquía similar. Bordes, fondos y radios se repiten en varios niveles anidados. Resultado: mucha estructura, poca prioridad.

### 5. Conceptos técnicos visibles

Términos como `Conversión`, `Resultado del paso anterior`, `Formato de entrada`, `Fallback`, `Operador`, `Referencia` y `Paso` son correctos para usuarios avanzados, pero no siempre explican tarea.

### 6. Labels inconsistentes

- `Que quiero hacer` y `Qué quiero hacer` conviven.
- `Directa desde entrada` suena técnico.
- Operadores como `esta vacio`, `no contiene` o `igual numérico` necesitan mejor redacción y acentos.
- `Referencia` en rango no explica si muestra valor asignado, texto detectado o ejemplo.
- `Pasos adicionales` aparece incluso cuando usuario sólo quiere asignar un valor.

### 7. Pasos difíciles de escanear

Header `Paso N · resumen` ayuda, pero card expandida muestra todo. No hay distinción fuerte entre paso principal y transformaciones opcionales. Condición neutra también ocupa espacio.

### 8. Concatenación no se presenta como resultado compuesto

Sidebar enumera partes, pero no muestra construcción como secuencia visual. Separador vive dentro del detalle de la parte siguiente. Para entender resultado hay que alternar entre sidebar, detalle y preview del header.

### 9. Rangos concentran demasiadas responsabilidades

Una tarjeta sirve a la vez como resumen, formulario, constructor de valor, editor de transformaciones y acceso al preview. Con varios rangos, longitud y repetición crecen rápido.

### 10. Preview tiene baja presencia

Header lo mantiene visible, pero tipografía pequeña y truncamiento reducen utilidad. No hay separación clara entre valor original y resultado. En rangos, un único texto de preview no comunica bien cuántas filas serán afectadas.

### 11. Acciones compiten entre sí

En rangos, `Agregar rango`, `Ordenar por inicio`, `Borrar rangos` y `Generar rangos sugeridos` comparten nivel. Acción primaria no domina. `Agregar rango` se repite arriba y abajo. Acciones icon-only por rango requieren tooltip para entenderse.

### 12. Responsive reduce columnas, no complejidad

CSS colapsa grids a una columna bajo 760 px. Esto evita overflow, pero transforma formularios densos en páginas muy largas sin resolver secuencia mental.

## Principios del rediseño propuesto

1. Empezar por intención de usuario, no por tipo interno.
2. Separar `De dónde sale el valor` de `Qué cambio querés hacer`.
3. Mostrar sólo campos necesarios para decisión actual.
4. Mantener preview cerca de edición y siempre visible.
5. Tratar transformaciones múltiples, condiciones y compatibilidad como nivel avanzado.
6. Respetar todas las recetas existentes mediante adaptadores visuales; no cambiar shape.
7. Si configuración existente usa opciones avanzadas, mostrarlas abiertas o con badge explícito.

## Nueva estructura visual propuesta

```text
┌ Crear valor para “Nombre de salida” ──────────────────────────────┐
│ Resumen: Combina Nombre + Presentación        Estado: Sin aplicar │
├───────────────────────────────────────────────────────────────────┤
│ ¿Qué querés construir?                                           │
│ [Copiar columna] [Texto fijo] [Combinar] [Número] [Fecha] [Rangos]│
│                                                                   │
│ Área contextual de configuración                                 │
│ - sólo controles necesarios para opción elegida                  │
│ - ayuda corta junto a decisión                                   │
│                                                                   │
│ ▸ Opciones avanzadas · 2 configuradas                            │
├───────────────────────────────┬───────────────────────────────────┤
│ Configuración                 │ Vista previa                      │
│                               │ Original → Resultado              │
│                               │ Muestra/fila usada                │
└───────────────────────────────┴───────────────────────────────────┘
│ Los cambios se aplican al confirmar.       [Cancelar] [Aplicar]  │
└───────────────────────────────────────────────────────────────────┘
```

En anchos medianos, preview pasa debajo del área contextual pero conserva posición sticky dentro del modal. En móvil, selector principal puede ser dropdown o lista vertical; no una fila de seis cards comprimidas.

### Encabezado

- Título: `Crear valor para “{columna}”`.
- Subresumen en lenguaje natural: `Copia columna Nombre`, `Texto fijo “Sin dato”`, `Combina 3 partes`, `Asigna 4 rangos`.
- Estado de draft: `Cambios sin aplicar` sólo cuando corresponda.
- Evitar repetir `Crear valor personalizado` como título genérico para rangos.

### Selector principal

Label: `¿Qué querés construir?`

Opciones visibles sugeridas:

- `Copiar una columna`;
- `Usar el mismo texto`;
- `Combinar valores`;
- `Calcular un número`;
- `Formatear una fecha`;
- `Asignar valores por rangos`.

Estas opciones deben mapear a modelos actuales. Son navegación visual, no nuevos tipos de receta.

### Área contextual

Cada intención muestra máximo una decisión primaria y campos derivados. Ejemplos:

- Copiar: selector de columna.
- Texto fijo: input.
- Número: primer valor, operación, segundo valor.
- Fecha: valor origen y formato deseado; formato de entrada bajo avanzado cuando pueda inferirse.
- Combinar: constructor de partes.
- Rangos: lista de rangos.

### Preview

- Superficie con mayor contraste que cards de configuración.
- Label `Resultado esperado`.
- Valor completo o multilinea, sin depender sólo de ellipsis.
- Contexto de muestra: `Usando fila 8` o `Ejemplo con Nombre = ...`.
- En transformaciones, opcionalmente `Antes` y `Después`.
- En rangos: cantidad de filas alcanzadas, muestra del valor y warnings de superposición.

### Footer

Mantener footer persistente. Ya existe semántica correcta:

- izquierda: aviso de draft;
- derecha: `Cancelar` secundario y `Aplicar` primario.

Mejora futura: deshabilitar `Aplicar` cuando no hay cambios o configuración es inválida, sólo si validación actual permite hacerlo sin cambiar dominio.

## Modo simple y avanzado

### Visible por defecto

- intención principal;
- fuente primaria;
- campo requerido;
- acción principal;
- preview;
- botón para agregar otra transformación;
- errores que impiden aplicar.

### Detrás de `Opciones avanzadas`

- pasos adicionales;
- condiciones;
- `Usar resultado del paso anterior` cuando no sea imprescindible;
- conversiones explícitas;
- formato de entrada de fecha;
- fallback de fecha;
- redondeo especial;
- transformaciones internas de una parte concatenada;
- condición interna legacy de rangos;
- generador detallado de rangos.

### Reglas de compatibilidad visual

- Si receta existente usa una opción avanzada, sección inicia abierta.
- Si inicia cerrada, badge muestra cantidad: `3 opciones configuradas`.
- Nunca ocultar warning, error o valor legacy activo.
- Colapsar no debe eliminar, normalizar ni resetear datos.
- `Resultado anterior` sólo aparece donde orden lo hace válido.

## Propuesta específica para concatenar

### Vista de composición

Mostrar partes como secuencia, no sólo lista numerada:

```text
[ Columna: Nombre ]  +  [ Texto: " - " ]  +  [ Columna: Presentación ]
                                            [ + Agregar parte ]
```

Cada chip/card debe mostrar:

- icono/tipo;
- nombre o valor resuelto;
- badge si tiene transformaciones;
- handle de orden y alternativa accesible por botones;
- acción editar al seleccionar.

Separador debe verse entre partes. Internamente puede seguir siendo `separatorBefore`; visualmente debe parecer parte del resultado, no propiedad escondida de la parte siguiente.

### Editor de parte

Al seleccionar parte, mostrar bloque compacto:

1. `Esta parte usa`:
   - columna;
   - texto fijo;
   - texto encontrado en columna;
   - resultado anterior, sólo si aplica.
2. Campo contextual.
3. `Transformar esta parte` colapsable.
4. Eliminar parte como acción secundaria/destructiva.

### Preview inmediato

Debajo de secuencia:

- `Resultado: PINCELES SERIE 304 - 20L`;
- resaltar parte seleccionada en preview si es viable sólo con UI;
- mostrar estado vacío: `Agregá la primera parte`.

### Acciones

- `Agregar parte` debe ser CTA clara y única.
- Permitir insertar entre partes en fase posterior si no exige cambio de dominio.
- Transformaciones globales después de concatenar quedan en avanzado.
- No mostrar `Tipo de operación` y `Qué quiero hacer` dentro de cada parte cuando fuente simple alcanza.

## Propuesta específica para rangos

### Lista resumida

Cada rango como card colapsable:

```text
Filas 8–13 · 6 filas
Valor: “PINCELES SERIE 304”
Condición: Todas las filas del rango
[Editar] [Ver filas] [Duplicar] [Eliminar]
```

Header de card comunica rango y efecto antes de mostrar formulario. Sólo card activa se expande por defecto.

### Edición expandida

Orden recomendado:

1. `Desde la fila` / `Hasta la fila`.
2. Badge calculado: `6 filas afectadas`.
3. `Qué valor querés asignar`:
   - texto fijo;
   - valor de columna;
   - texto encontrado dentro del rango;
   - construcción avanzada.
4. Preview de valor.
5. Condición y transformaciones en avanzado.

`Referencia` debería renombrarse según contenido real: `Valor asignado`, `Ejemplo` o `Texto detectado`.

### Texto encontrado dentro del rango

Flujo natural:

1. `Buscar en la columna`.
2. `Elegir uno de los textos encontrados`.
3. Mostrar cantidad y dos o tres ejemplos.
4. Si no hay textos: explicar rango/columna usados y ofrecer cambiar columna.

Evitar que esta acción parezca fuente técnica distinta si resultado final será texto fijo seleccionado.

### Preview de filas afectadas

- Reemplazar dependencia exclusiva de icono de ojo por acción textual `Ver 6 filas`.
- Mostrar primeras filas y columnas relevantes.
- Indicar límites: `Mostrando 30 de 85`.
- Resaltar superposición en cards involucradas, no sólo warning global.
- Mantener preview de datos existente; cambio es presentación, no cálculo.

### Toolbar general

Jerarquía sugerida:

- primaria: `Agregar rango`;
- secundaria destacada: `Generar rangos sugeridos`;
- menú `Más acciones`: ordenar y borrar todos.

Evitar dos botones `Agregar rango` simultáneos. En listas largas, usar CTA sticky o al final según scroll.

### Generador de rangos

Presentarlo como flujo de tres grupos:

1. `Cómo detectar cada rango`.
2. `Qué filas revisar`.
3. `Qué valor inicial asignar`.

Luego mostrar preview de rangos sugeridos antes de agregarlos. Filtros y filas posteriores quedan en `Ajustes avanzados del generador`.

## Fases recomendadas de implementación

### Fase 1 — Layout y jerarquía

Objetivo: mejorar orientación sin cambiar callbacks ni modelos.

- nuevo encabezado y subtítulo;
- renombrar labels confusos;
- separar selector principal, área contextual y preview;
- fortalecer preview;
- mantener footer persistente;
- agrupar condiciones/pasos adicionales bajo bloque visual avanzado, sin borrar contenido;
- snapshots/markup antes y después para asegurar estructura funcional equivalente.

Una PR exclusiva.

### Fase 2 — Concatenación

- secuencia visual de partes;
- resumen de fuente por parte;
- separadores visibles;
- editor compacto de parte;
- transformaciones internas colapsables;
- reordenamiento y accesibilidad preservados;
- tests de partes legacy, separadores, resultado anterior y steps internos.

Una PR exclusiva.

### Fase 3 — Rangos

- cards resumidas/expandibles;
- toolbar priorizada;
- edición de valor en lenguaje natural;
- preview de filas más accesible;
- generador agrupado;
- warnings por superposición cerca del rango afectado;
- compatibilidad completa con `manualRange` y `valueRecipe`.

Una o dos PR según tamaño; generador puede separarse.

### Fase 4 — Previews y ayudas

- panel de resultado esperado;
- contexto de fila/muestra;
- antes/después donde aplique;
- ayudas breves y consistentes;
- estados vacíos y errores accionables;
- revisión de copy y acentos.

### Fase 5 — QA visual con archivos reales

- archivos pequeños y grandes;
- columnas sin datos y sin columnas activas;
- labels largos;
- recetas legacy;
- muchos pasos, partes y rangos;
- rangos superpuestos;
- light/dark;
- desktop, tablet y móvil;
- teclado, foco y lector de pantalla.

## Riesgos y mitigaciones

### Settings y recetas existentes

Riesgo: nuevo selector visual puede mapear mal recetas legacy.

Mitigación: capa de presentación sobre helpers actuales; fixtures por cada shape; round-trip sin normalización accidental.

### `manualRange`

Riesgo: cards colapsables o generador nuevo pueden resetear fuentes, steps, condiciones, selección de texto u orden.

Mitigación: estado de expansión separado de receta; callbacks actuales intactos en primera fase; tests sobre `valueRecipe`, legacy `valueSource`, superposición y orden.

### Concatenación

Riesgo: representación visual de separadores puede alterar `separatorBefore`, orden o steps internos.

Mitigación: mantener modelo actual; adaptar sólo lectura/escritura visual; cubrir reorder, eliminación, selección segura y previews.

### Simple/avanzado

Riesgo: ocultar datos activos o hacer creer que no existen.

Mitigación: autoexpandir cuando hay configuración; badge con resumen; nunca resetear al cerrar sección.

### Preview

Riesgo: nueva presentación puede sugerir precisión que muestra no garantiza.

Mitigación: indicar fila y valores usados; conservar motores actuales; diferenciar `Ejemplo` de resultado definitivo.

### Tamaño de cambio

Riesgo: rediseño completo en una PR mezcla layout, comportamiento y compatibilidad.

Mitigación: fases independientes, sin cambios de dominio; baseline visual y funcional por fase.

## Checklist de validación futura

### Compatibilidad funcional

- [ ] Settings existentes abren intención visual correcta.
- [ ] `direct`, `fixedText`, `combine`, `manualRange` y `empty` legacy conservan datos.
- [ ] Aplicar persiste draft; cancelar no modifica receta.
- [ ] Confirmación de descarte sigue funcionando.
- [ ] Alternar fuente no borra `fixedText`, columna ni `rangeText` indebidamente.
- [ ] Resultado anterior sólo aparece donde es válido.
- [ ] Concat conserva orden, separadores, sources y steps internos.
- [ ] Rangos conservan inicio, fin, orden, condiciones y `valueRecipe`.
- [ ] Generador y superposiciones mantienen comportamiento.
- [ ] Preview usa mismos datos y motor actual.

### Validación visual

- [ ] Jerarquía clara en 1440 px, 1024 px y 760 px.
- [ ] Modal usable sin scroll horizontal.
- [ ] Preview visible durante edición.
- [ ] Configuración avanzada activa siempre tiene señal visible.
- [ ] Cards largas y labels extensos no cortan información crítica.
- [ ] Estados vacíos explican próxima acción.
- [ ] Light y dark mantienen contraste.
- [ ] Footer permanece accesible con contenido largo.

### Accesibilidad

- [ ] Orden de tab sigue orden visual.
- [ ] Foco visible en cards, dropdowns y acciones icon-only.
- [ ] Expandir/colapsar expone `aria-expanded` y relación con panel.
- [ ] Reordenar partes tiene alternativa por teclado.
- [ ] Preview y errores se anuncian sin ruido excesivo.
- [ ] Botones destructivos conservan nombre accesible y confirmación.

### Validaciones técnicas

- [ ] Test específico `OutputColumnRecipeEditor.test.tsx`.
- [ ] Tests específicos de `RangeValueEditor` dentro del mismo archivo o módulo dedicado.
- [ ] `npm run test:run`.
- [ ] `npm run build`.
- [ ] `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`.
- [ ] `git diff --check`.

## Recomendación final

No empezar rediseño por mover controles de lugar. Primero definir intención principal y separación entre fuente, transformación y opciones avanzadas. Después rediseñar concatenación y rangos en PR distintas.

Orden recomendado:

1. jerarquía del modal y preview;
2. concatenación como secuencia visual;
3. rangos como cards resumibles;
4. ayudas y previews;
5. QA con planillas reales.

Este orden reduce riesgo: mejora comprensión primero y mantiene dominio actual como contrato estable.

## Fase 1 implementada: jerarquía visual

Fecha de implementación: 2026-06-24

### Cambios aplicados

- Selector principal renombrado a `¿Qué querés construir?`, con opciones redactadas como intenciones de usuario:
  - `Usar una columna de entrada`;
  - `Usar el mismo texto`;
  - `Crear un valor personalizado`.
- Títulos del modal contextualizados:
  - `Crear valor para “{columna}”`;
  - `Asignar valores por rangos a “{columna}”`.
- Preview del header convertido en bloque destacado `Resultado esperado`, conservando cálculo y datos actuales.
- Área principal separada visualmente en:
  - introducción de configuración;
  - controles de intención;
  - campos contextuales;
  - opciones avanzadas.
- Primer paso usa `¿Qué querés construir?` y `¿Qué querés hacer con ese valor?`.
- Pasos posteriores usan `Tipo de transformación` y `¿Qué transformación querés aplicar?`.
- Condición de cada step principal movida a un `<details>` nativo `Opciones avanzadas`.
- Una condición existente inicia expandida y muestra `Condición configurada`; una receta sin condición inicia colapsada pero mantiene acceso explícito.
- CSS limitado a clases del modal/editor, con soporte light, dark y responsive.
- Footer existente permanece fijo con `Cancelar` y `Aplicar`.

### Fuera de alcance

- Rediseño interno de concatenación, partes, separadores y transformaciones por parte.
- Rediseño de cards, tabla, generador y previews específicos de rangos.
- Cambio profundo de fuentes/acciones o modelo simple/avanzado.
- Cambios de dominio, settings, export/import, remap/references, filtros, preview de datos, `manualRange`, columnas virtuales o procesamiento.

### Compatibilidad funcional preservada

- Shapes de recetas y settings sin cambios.
- Callbacks de edición, apply, cancel y confirmación de descarte intactos.
- Mismo cálculo de preview; sólo cambió presentación.
- Steps, conditions, concat y rangos conservan estructura y datos.
- Sección avanzada usa `<details>` presentacional; abrir/cerrar no modifica receta.
- Configuraciones existentes con condición mantienen información visible al abrir editor.

### Tests y validaciones

- Se agregaron 3 tests de jerarquía visual y compatibilidad:
  - intención, título, preview y áreas visuales;
  - apertura inicial de opciones avanzadas con condición existente;
  - título específico para rangos sin cambiar editor de rangos.
- Se actualizó expectativa del label `¿Qué querés hacer?` y copy del selector principal.
- `OutputColumnRecipeEditor.test.tsx`: OK — 260 tests.
- `npm run test:run`: OK — 40 archivos, 631 tests.
- `npm run build`: OK.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- QA visual manual: escritorio, dark mode, breakpoint de 760 px y expansión de opciones avanzadas — OK.
- `git diff --check`: OK; sólo avisos locales LF→CRLF, sin errores de whitespace.

### Próximos pasos recomendados

1. Fase 2: concatenación como secuencia visual, sin cambiar `ConcatPart` ni steps internos.
2. Fase 3: rangos como cards resumidas/expandibles, preservando `manualRange` y `valueRecipe`.
3. Mantener ambas fases en PR separadas y repetir QA con planillas reales.

## Fase 2 implementada: concatenación por partes

Fecha de implementación: 2026-06-24

### Cambios aplicados

- `Concatenar` se presenta como `Composición del valor`, con una explicación explícita del orden de izquierda a derecha.
- Las partes existentes se muestran como una secuencia horizontal de piezas compactas, numeradas y seleccionables.
- Cada pieza muestra su fuente actual y la cantidad de transformaciones configuradas.
- Los separadores se representan visualmente entre piezas sin modificar `separatorBefore`.
- El drag & drop existente se adapta a orientación horizontal; el comportamiento vertical previo queda como valor por defecto.
- `Agregar parte` queda como acción principal de la composición y `Eliminar parte` permanece en el detalle de la pieza seleccionada.
- El detalle separa la fuente simple (`Esta pieza usa`) de sus transformaciones.
- Las transformaciones internas se conservan dentro de una sección expandible. Si una receta ya tiene steps guardados, la sección inicia abierta.
- Se agrega un preview local destacado `Resultado de esta composición`, alimentado por el mismo preview ya calculado por el editor.
- El track usa overflow horizontal interno en anchos reducidos, sin producir overflow global del modal o la página.

### Compatibilidad interna preservada

- Se mantienen `concat.parts`, orden, `source`, `separatorBefore`, steps internos y nombres de propiedades persistidas.
- Agregar, eliminar, seleccionar y reordenar siguen usando los callbacks y helpers existentes.
- El preview nuevo sólo presenta el resultado ya calculado; no incorpora otro motor ni cambia el cálculo.
- La apertura/cierre de transformaciones es estado presentacional y no modifica la receta.
- Recetas existentes con texto fijo, columna, resultado anterior y transformaciones continúan usando el mismo modelo.
- No se modificaron apply, cancel ni confirmación de descarte.

### Fuera de alcance

- Rediseño de `manualRange`, `RangeValueEditor`, cards, tabla, generador o previews de rangos.
- Cambios en dominio, settings, export/import, remap/references, filtros, preview a nivel datos, columnas virtuales o procesamiento.
- Reescritura del editor, cambios funcionales de transformaciones o librerías nuevas.

### Tests y validaciones

- Se agregaron tests para la sección de composición, piezas existentes, fuentes visibles, conectores, transformaciones y preview local.
- Se agregó cobertura del transform horizontal del `SortableList`, manteniendo el transform vertical existente.
- Los tests previos de alta, eliminación, selección segura, reorder, sources, steps internos y cálculo de concat permanecen activos.
- `OutputColumnRecipeEditor.test.tsx`: OK — 262 tests.
- `OutputColumnRecipeEditor.test.tsx` + `SortableList.test.ts`: OK — 265 tests.
- `npm run test:run`: OK — 40 archivos, 634 tests.
- `npm run build`: OK.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- QA visual manual: escritorio y breakpoint de 760 px; secuencia, preview, alta/eliminación y overflow horizontal interno — OK.
- `git diff --check`: OK; sólo avisos locales LF→CRLF, sin errores de whitespace.

### Próximos pasos recomendados

1. Fase 3: rediseñar rangos como cards resumidas/expandibles.
2. Preservar `manualRange`, `valueRecipe`, generación, solapamientos y previews actuales como contratos funcionales.
3. Repetir QA con recetas legacy, labels largos, dark mode y planillas reales.

## Fase 3 implementada: rangos como cards

Fecha de implementación: 2026-06-24

### Cambios aplicados

- La sección principal se presenta como `Rangos configurados`, con cantidad total y explicación breve.
- `Agregar rango` pasa a ser la acción visual primaria; ordenar, borrar y generar sugeridos conservan sus acciones existentes.
- Cada rango se muestra como card resumida con una regla legible: `Para filas X a Y, usar valor Z`.
- El resumen permanente incluye intervalo, cantidad de filas, fuente del valor, condición aplicable y cantidad de transformaciones cuando existe.
- Texto fijo, texto encontrado dentro del rango y columna de entrada tienen resúmenes específicos.
- El primer rango inicia expandido; los siguientes conservan información crítica visible y ofrecen `Editar rango`.
- La edición expandida ordena primero `Desde la fila`, `Hasta la fila` y `Filas afectadas`, seguida por el editor de valor existente.
- `Ver filas` / `Ocultar filas` usa texto visible y estado `aria-expanded`, manteniendo la tabla de filas existente.
- Duplicar y eliminar conservan callbacks y ayudas actuales.
- Estilos nuevos usan tokens existentes y colapsan a una columna en 760 px, sin overflow horizontal global.

### Compatibilidad interna preservada

- Se mantienen `startRowNumber`, `endRowNumber`, `valueSource`, `valueRecipe`, condiciones, orden e IDs.
- Se reutilizan `RangeValueEditor`, helpers de `manualRangeModel`, callbacks de alta/edición/duplicado/eliminación y preview existentes.
- Expandir o colapsar una card sólo modifica estado visual local; no modifica receta ni settings.
- El preview de filas sigue usando mismas filas, columnas, límite de 30 y cálculo actual.
- Superposiciones, generador de rangos sugeridos, reconciliación de textos, apply, cancel y descarte permanecen intactos.

### Fuera de alcance

- Cambios funcionales de `manualRange`, `RangeValueEditor` o `manualRangeModel`.
- Rediseño del generador, pipeline, procesamiento o cálculo de preview.
- Cambios de concat, dominio, settings, export/import, remap/references, filtros o columnas virtuales.
- Librerías nuevas, code splitting o ESLint.

### Tests y validaciones

- Se actualizaron contratos visuales que antes exigían la tabla plana `Referencia` y una acción de preview sólo con icono.
- Se agregaron tests para resumen colapsado, intervalo/cantidad, condición, cards de recetas existentes y fuentes de texto fijo, texto encontrado y columna.
- Tests previos de agregar, eliminar, duplicar, editar, reconciliar textos, previews y cálculo funcional permanecen activos.
- `OutputColumnRecipeEditor.test.tsx`: OK — 265 tests.
- `npm run test:run`: OK — 40 archivos, 637 tests.
- `npm run build`: OK.
- `npx tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --pretty false`: OK.
- QA visual desktop light: cards, texto fijo y texto encontrado — OK.
- QA visual desktop dark: contraste de card, badges, controles y footer — OK.
- QA visual 760 px dark: layout apilado y sin overflow global — OK.
- QA interactiva: editar, ver/ocultar filas y agregar/eliminar rango — OK.
- `git diff --check`: OK; sólo avisos locales LF→CRLF, sin errores de whitespace.

### Próximos pasos recomendados

1. Fase 4: mejorar previews y ayudas contextuales sin cambiar motores de datos.
2. Ejecutar QA con planillas reales, recetas legacy, rangos superpuestos y labels largos.
3. Revisar accesibilidad por teclado y lector de pantalla sobre cards, acciones y tablas de preview.
