# Direccion actual del refactor

La convivencia entre el modelo legacy y el modelo nuevo es temporal y tecnica. La app no debe quedar con dos formas finales de uso.

El flujo objetivo es:

```txt
Columnas de entrada -> Columnas de salida -> Receta por columna -> Preview -> Exportacion
```

El modelo legacy debe eliminarse o aislarse cuando el modelo nuevo cubra las mismas capacidades. En particular, deben dejar de ser el centro del flujo:

- `OutputCategory`;
- `ColumnMapping`;
- reglas globales aplicadas sobre categorias normalizadas;
- preview basada en `NormalizedRow`;
- exportacion basada en categorias legacy.

## Fase 5: preview principal con el modelo nuevo

La vista normalizada principal ahora usa `ProcessedRow[]` y `OutputColumn[]` por defecto. Ya no hay un toggle visible para elegir entre preview clasica y preview por columnas de salida.

La preview muestra:

- columnas de salida `enabled`;
- orden definido por `OutputColumn.order`;
- valores de `processedRows.outputValues`;
- recetas simples `direct`, `empty` y `fixedText`.

La preview legacy basada en `NormalizedRow` no se muestra al usuario. Por ahora sigue existiendo internamente porque todavia aporta estados de fila mientras no se migren por completo reglas de ignorado, errores y acciones manuales.

La exportacion principal sigue usando el modelo legacy en esta fase. Ese es el siguiente punto importante a migrar.

## Pendiente despues de fase 5

- Migrar exportacion Excel/CSV principal a `ProcessedRow` y `OutputColumn`.
- Migrar auditoria para que use filas procesadas y recetas del modelo nuevo.
- Migrar reglas de ignorado para que operen sobre columnas de salida o sobre columnas de entrada segun corresponda.
- Eliminar la dependencia de `NormalizedRow` en la preview principal.
- Recien despues, migrar transformaciones simples por receta.

## Fase 6: exportacion principal con el modelo nuevo

La exportacion principal de Excel y CSV ahora usa `ProcessedRow[]` y `OutputColumn[]`.

Los botones visibles siguen siendo los mismos:

- Descargar Excel;
- Descargar CSV;
- Descargar auditoria.

No hay una exportacion legacy visible ni un selector entre modelos.

La exportacion principal:

- usa columnas de salida `enabled`;
- respeta `OutputColumn.order`;
- toma valores desde `processedRows.outputValues`;
- exporta solo filas con `status === 'included'`.

La auditoria tambien fue migrada a `ProcessedRow[]` y `OutputColumn[]`. Incluye:

- fila original;
- estado;
- motivo;
- advertencias;
- error;
- valores de columnas de salida.

Todavia existe dependencia tecnica del modelo viejo para alimentar estados de fila, reglas de ignorado, errores y advertencias mientras esas partes no hayan sido migradas al pipeline nuevo.

## Pendiente despues de fase 6

- Migrar reglas de ignorado para que produzcan estado directamente sobre `ProcessedRow`.
- Migrar transformaciones simples por columna de salida: trim, mayusculas/minusculas, prefijo y sufijo.
- Eliminar la necesidad de calcular `NormalizedRow` para preview/exportacion.
- Depurar o aislar exportadores legacy cuando ya no haya consumidores.

## Fase 7: transformaciones simples por columna de salida

Las columnas de salida ahora pueden tener pasos simples dentro de su receta.

Las recetas `direct` y `fixedText` soportan `steps` en orden:

- `trim`;
- `uppercase`;
- `lowercase`;
- `addPrefix`;
- `addSuffix`;
- `removeText`;
- `replaceText`.

Cada paso se aplica despues de resolver el valor base de la receta. Por ejemplo:

```txt
direct desde columna A -> trim -> addPrefix "PROD-"
```

Los pasos se guardan junto con `OutputColumn` en:

```txt
excel-sanitizer:v2-output-columns
```

La preview, Excel, CSV y auditoria ya usan `ProcessedRow`, por lo que reflejan estas transformaciones automaticamente.

Para celdas vacias, `addPrefix`, `addSuffix`, `removeText` y `replaceText` respetan `applyToEmptyValues`. Por defecto es `false`.

Todavia no se migraron:

- operaciones numericas;
- condiciones;
- combinaciones de columnas;
- reglas de ignorado;
- reglas globales legacy completas.

## Fase 8: combinaciones simples por columna de salida

Las columnas de salida ahora pueden usar una receta `combine`.

Una receta combinada tiene partes en orden:

- parte `input`: toma el valor desde una columna de entrada;
- parte `text`: agrega texto fijo.

Tambien puede tener un `separator` opcional. Si hay separador, se usa entre partes no vacias; si no hay separador, las partes se concatenan directamente.

Ejemplos:

```txt
Marca + Producto, separador " " -> "Marca Producto"
Nombre + Unidad, separador " - " -> "Nombre - Unidad"
Texto fijo "PROD-" + Codigo -> "PROD-123"
```

Las transformaciones simples se aplican despues de resolver la combinacion:

```txt
Marca + Producto -> uppercase
```

La receta `combine` se guarda junto con `OutputColumn` en:

```txt
excel-sanitizer:v2-output-columns
```

La preview, Excel, CSV y auditoria reflejan la combinacion automaticamente porque ya usan `ProcessedRow`.

Pendiente en ese momento:

- permitir usar otra columna de salida como parte, si alguna vez se necesita, resolviendo dependencias/ciclos;
- operaciones numericas;
- condiciones;
- reglas de ignorado sobre el modelo nuevo.

## Fase 9: reglas de ignorado sobre el modelo nuevo

Las reglas de ignorado ahora se aplican sobre `ProcessedRow`.

Cada regla puede evaluar:

- una columna de entrada (`target: input`), usando `processedRow.inputValues`;
- una columna de salida (`target: output`), usando `processedRow.outputValues`.

Operadores soportados:

- `isEmpty`;
- `isNotEmpty`;
- `contains`;
- `notContains`;
- `equals`;
- `notEquals`;
- `startsWith`;
- `endsWith`.

La preview, la exportacion principal y la auditoria leen el `status` final desde `ProcessedRow`.

La exportacion principal sigue exportando solo filas `included`. La auditoria conserva `included`, `ignored` y `error`, incluyendo `ignoredReason`.

Las acciones manuales de la preview tambien escriben `rowOverrides`, pero ahora se aplican al pipeline de filas procesadas.

Todavia queda legacy en:

- `NormalizedRow`, para errores/warnings que todavia vienen de validaciones y reglas globales antiguas;
- `OutputCategory` y `ColumnMapping`, como soporte tecnico de transicion;
- `TransformationRules` globales.

## Fase 10: validaciones basicas sobre ProcessedRow

Las validaciones genericas basicas ahora viven en el modelo nuevo mediante `validateProcessedRows`.

Orden actual del pipeline:

```txt
recetas de OutputColumn -> ProcessedRow -> estado legacy temporal -> validaciones basicas -> reglas de ignorado -> overrides manuales
```

Validaciones aplicadas:

- Si una fila no tiene ningun valor en columnas de salida habilitadas, queda `ignored`.
- Motivo: `Fila sin valores de salida`.
- Si una fila ya tiene `status: error` o `error`, no se pisa.
- Si una fila ya esta `ignored`, no se reactiva automaticamente.
- Existe soporte opcional para warning de filas parcialmente vacias, desactivado por defecto para evitar ruido.

La exportacion principal no incluye filas ignoradas por validacion. La auditoria si las incluye con su motivo.

Dependencia legacy restante:

- `NormalizedRow` todavia puede aportar errores/warnings originados en reglas globales viejas y validaciones antiguas.
- `OutputCategory`, `ColumnMapping` y `TransformationRules` siguen como soporte tecnico durante la transicion.

## Fase 11: ProcessedRow como fuente principal de estado

La preview, exportacion principal y auditoria ya no necesitan `NormalizedRow` para obtener:

- `status`;
- `warnings`;
- `error`;
- `ignoredReason`.

El pipeline visible/exportable queda centrado en:

```txt
InputColumn -> InputRow -> OutputColumn -> ProcessedRow -> validateProcessedRows -> applyIgnoreRulesToProcessedRows -> rowOverrides
```

`validateProcessedRows` se encarga de validaciones basicas genericas, como filas sin valores de salida.

`applyIgnoreRulesToProcessedRows` aplica reglas de ignorado sobre columnas de entrada o salida.

Los overrides manuales tambien se aplican sobre `ProcessedRow`.

Compatibilidad legacy restante:

- `NormalizedRow` sigue existiendo en archivos legacy, como `buildOutputRows`, `applyTransformations`, `validateRows` y `NormalizedPreview`, pero ya no alimenta la preview/exportacion/auditoria principal.
- `compareNormalizedRowsWithProcessedRows` queda como helper de debug/comparacion.
- `OutputCategory` y `ColumnMapping` siguen vivos para adaptar configuracion vieja hacia `OutputColumn`.
- `TransformationRules` globales siguen visibles como parte de la transicion, pero no son el centro del pipeline nuevo.

Pendiente:

- aislar o retirar componentes legacy no usados por la experiencia principal;
- migrar o eliminar `TransformationRules` globales;
- migrar operaciones numericas y condiciones al modelo de recetas.

## Fase 12: aislamiento de transformaciones globales legacy

La UI principal ya no muestra `TransformationRules` globales.

La forma visible y principal de transformar valores es:

```txt
Orden del archivo de salida -> columna de salida -> receta -> Transformaciones de esta columna
```

Las transformaciones globales legacy quedan ocultas por defecto para evitar dos formas visibles de transformar datos.

En una fase posterior esta bandera fue retirada definitivamente.

La configuracion legacy guardada no se borra automaticamente en esta fase. Queda como dato de compatibilidad tecnica.

Pendiente:

- remover imports/estado legacy cuando ya no haya dependencias tecnicas;
- migrar operaciones numericas al modelo de recetas;
- migrar condiciones al modelo de recetas;
- retirar `TransformationRules` globales definitivamente.

## Fase 13: limpieza controlada de NormalizedRow

Se retiraron piezas legacy que ya no participaban de la experiencia principal:

- `NormalizedPreview`;
- `buildOutputRows`;
- `applyTransformations`;
- `validateRows`;
- exportadores legacy basados en `NormalizedRow` y `OutputCategory`;
- helpers legacy de reglas de ignorado sobre `NormalizedRow`;
- tipos `NormalizedRow` y `NormalizationSettings`.

La experiencia principal queda basada en:

```txt
InputColumn -> InputRow -> OutputColumn -> ProcessedRow
```

Preview, exportacion principal, auditoria, validaciones y reglas de ignorado usan `ProcessedRow`.

Legacy que seguia vivo en esa fase:

- `OutputCategory`, porque todavia existe como configuracion editable y adaptador hacia `OutputColumn`.
- `ColumnMapping`, porque todavia sincroniza el mapeo antiguo con recetas `direct`.
- `TransformationRules` globales, ocultas por bandera interna, para inspeccion/migracion tecnica si hiciera falta.

La bandera legacy fue retirada definitivamente en la fase de limpieza de `TransformationRules`.

Pendiente en ese momento:

- decidir si `OutputCategory` puede ser reemplazado por `OutputColumn` como fuente unica;
- retirar `ColumnMapping` cuando el mapeo directo viva solo en recetas;
- eliminar definitivamente `TransformationRules` globales o migrar sus capacidades restantes al modelo de recetas.

## Fase 14: OutputColumn como fuente editable principal

`OutputColumn` pasa a ser la fuente editable principal de columnas de salida.

La UI normal ya no muestra:

- `CategoriesManager`;
- `ColumnMapper`.

La seccion visible de columnas de salida trabaja directamente con `OutputColumn[]` y permite:

- crear columnas de salida;
- editar `label`;
- activar/desactivar `enabled`;
- ordenar;
- eliminar;
- configurar `recipe`;
- configurar transformaciones simples de esa columna.

La persistencia principal es:

```txt
excel-sanitizer:v2-output-columns
```

Migracion/compatibilidad:

- Si no hay `OutputColumn` v2 guardadas, la app puede construir una migracion inicial desde categorias/mapping legacy usando `createOutputColumnsFromLegacy`.
- Esa migracion no es una sincronizacion permanente.
- `OutputCategory` queda como dato legacy para migracion y para la bandera interna de transformaciones legacy.
- `ColumnMapping` queda como compatibilidad temporal para migrar recetas `direct` desde configuraciones viejas.

La fuente de verdad visible para el usuario ya es `OutputColumn`.

Pendiente:

- retirar `OutputCategory` cuando ya no haga falta migrar configuracion vieja ni sostener la UI legacy oculta;
- retirar `ColumnMapping` cuando no haya adaptadores legacy;
- migrar o eliminar definitivamente `TransformationRules` globales.

## Fase 15: ColumnMapping como lectura legacy

`ColumnMapping` dejo de ser estado activo del flujo principal.

La fuente real de mapeo ahora es la receta de cada `OutputColumn`:

```txt
OutputColumn.recipe.type === "direct" -> inputColumnId
```

Cambios de esta fase:

- `ImportWizard` ya no mantiene `columnMapping` en estado React.
- La app ya no autogenera ni actualiza `ColumnMapping` al elegir encabezados.
- `ColumnMapping` ya no se guarda como configuracion principal activa.
- Si existe configuracion vieja y todavia no hay `excel-sanitizer:v2-output-columns`, se lee el `ColumnMapping` legacy para crear recetas `direct`.
- Cuando ya existe configuracion v2, `ColumnMapping` legacy se ignora.

La persistencia principal sigue siendo:

```txt
excel-sanitizer:v2-output-columns
```

Compatibilidad restante:

- `ColumnMapping` sigue existiendo como tipo y como parametro del adaptador `createOutputColumnsFromLegacy`.
- `OutputCategory` sigue existiendo como dato legacy para migracion y para la UI de transformaciones globales si se habilita por bandera interna.
- `TransformationRules` globales siguen ocultas por defecto y no afectan el flujo principal.

Pendiente:

- retirar `OutputCategory` cuando ya no haga falta sostener migracion vieja ni la bandera legacy;
- retirar definitivamente `TransformationRules` globales o migrar sus capacidades restantes a recetas;
- agregar operaciones numericas y condiciones dentro del modelo de `OutputRecipe`.

## Fase 16: operaciones numericas por columna de salida

Las operaciones numericas ahora viven como un `TransformStep` del modelo nuevo:

```txt
OutputColumn.recipe.steps[] -> numericOperation
```

Esto significa que se aplican en el mismo orden que el resto de transformaciones de la columna. Por ejemplo:

```txt
removeText "$" -> numericOperation addPercentage 10 -> addPrefix "$ "
```

Operaciones soportadas:

- `add`: sumar valor;
- `subtract`: restar valor;
- `multiply`: multiplicar por valor;
- `divide`: dividir por valor;
- `addPercentage`: sumar porcentaje;
- `subtractPercentage`: restar porcentaje;
- `removeIncludedPercentage`: quitar porcentaje incluido.

El parseo numerico soporta valores con formato moneda/texto y separadores habituales:

```txt
$ 200
$200,50
200.50
1.200,75
1,200.75
```

Cada step numerico permite definir redondeo:

- sin redondeo;
- 0 decimales;
- 2 decimales;
- 4 decimales.

Default: 2 decimales.

Warnings:

- Si el valor no puede convertirse a numero, se conserva el valor original y se agrega:
  `No se pudo aplicar operacion numerica: valor invalido`.
- Si se intenta dividir por cero, se conserva el valor original y se agrega:
  `No se puede dividir por cero`.

Los warnings viven en `ProcessedRow.warnings`, por lo que aparecen en auditoria. La preview, Excel y CSV toman el valor final desde `ProcessedRow.outputValues`.

No se agregaron condiciones en esta fase. Las operaciones numericas se aplican siempre que el step llegue a ejecutarse.

Pendiente:

- agregar condiciones opcionales por step/receta;
- permitir operaciones numericas que generen columnas derivadas de forma asistida, si hiciera falta;
- retirar definitivamente la UI legacy de transformaciones globales.

## Fase 17: condiciones por transformacion

Cada `TransformStep` puede tener una condicion opcional:

```txt
OutputColumn.recipe.steps[].condition
```

Si no hay condicion, la transformacion se aplica siempre, igual que antes.

Si hay condicion, la transformacion se aplica solo cuando la condicion coincide. Si no coincide, el valor queda como estaba y no se genera warning.

La condicion puede evaluar:

- `input`: columnas originales activas, usando `ProcessedRow.inputValues`;
- `output`: columnas de salida ya calculadas, usando `ProcessedRow.outputValues`.

Las transformaciones siguen aplicandose en orden. Cuando una condicion evalua una columna de salida, ve el valor disponible en ese momento del pipeline. Para la misma columna que se esta transformando, evalua el valor actual antes de aplicar ese step.

Operadores de texto:

- esta vacio;
- no esta vacio;
- contiene;
- no contiene;
- es igual a;
- no es igual a;
- empieza con;
- termina con.

Operadores numericos:

- mayor que;
- mayor o igual que;
- menor que;
- menor o igual que;
- igual numerico;
- distinto numerico.

Los operadores numericos usan el mismo parser que las operaciones numericas, por lo que pueden evaluar moneda/texto como:

```txt
$ 1.200,50
1200.50
1.200,50
1,200.50
```

Warning:

- Si una condicion numerica no puede evaluarse, la transformacion no se aplica y se agrega:
  `No se pudo evaluar la condicion de transformacion`.

La preview, Excel, CSV y auditoria reflejan el resultado porque siguen usando `ProcessedRow`.

Pendiente:

- agregar dependencias mas explicitas entre columnas de salida si en el futuro se permiten referencias a salidas posteriores;
- revisar si conviene compactar la UI de steps cuando haya muchas condiciones;
- retirar definitivamente la UI legacy de transformaciones globales.

## Fase 18: tests unitarios del motor nuevo

Se agrego Vitest para proteger el motor del modelo nuevo antes de seguir retirando legacy.

Comandos:

```txt
npm run test
npm run test:run
```

Cobertura agregada en `src/domain/import/__tests__/`:

- recetas `direct`, `empty`, `fixedText` y `combine`;
- transformaciones simples: trim, mayusculas/minusculas, prefijo, sufijo, quitar y reemplazar texto;
- `applyToEmptyValues`;
- operaciones numericas y parseo de moneda/formato numerico;
- warnings de operacion numerica invalida y division por cero;
- condiciones de transformacion sobre columnas de entrada y salida;
- condiciones numericas invalidas;
- reglas de ignorado sobre entrada y salida;
- validaciones basicas de `ProcessedRow`.

Durante esta fase se corrigio un bug en `formatNumericResult`: al redondear a 0 decimales, la limpieza de ceros podia convertir `200` en `2`. La correccion mantiene enteros completos y solo recorta ceros decimales cuando hay punto decimal.

## Fase 19: retiro definitivo de TransformationRules globales

La UI y el codigo de `TransformationRules` globales fueron retirados.

La unica forma principal de transformar datos ahora es:

```txt
OutputColumn -> OutputRecipe -> Transformaciones de esta columna
```

Cambios de esta fase:

- se elimino el componente legacy `TransformationRules`;
- se elimino la bandera `excel-sanitizer:show-legacy-transformations`;
- `ImportWizard` ya no mantiene estado `transformationRules`;
- `localTemplatesService` ya no crea ni persiste reglas globales;
- se retiraron los tipos legacy asociados a reglas globales.

Las transformaciones por columna siguen cubriendo:

- transformaciones simples;
- operaciones numericas;
- condiciones por transformacion;
- combinaciones de columnas/textos.

Legacy que sigue vivo:

- `OutputCategory`, solo para migracion desde configuraciones viejas;
- `ColumnMapping`, solo como lectura/adaptador legacy hacia recetas `direct`;
- `localCategoriesService`, mientras exista esa migracion inicial.

Pendiente:

- retirar `OutputCategory` y `localCategoriesService` cuando ya no haga falta migrar configuraciones viejas;
- simplificar el nombre `buildProcessedRowsFromLegacyState`, que todavia expresa su origen historico aunque el pipeline principal ya use `OutputColumn`.

## Fase 20: cierre estructural del modelo nuevo

El modelo nuevo queda como unico flujo principal:

```txt
InputColumn -> InputRow -> OutputColumn -> OutputRecipe -> ProcessedRow
```

No hay dos formas visibles de uso. La UI trabaja con:

- columnas detectadas/activas de entrada;
- columnas de salida;
- recetas y transformaciones por columna;
- reglas de ignorado;
- preview;
- exportacion.

Cambios de cierre:

- `buildProcessedRowsFromLegacyState` fue reemplazada por `buildProcessedRowsPipeline`.
- `createOutputColumnsFromLegacy` fue reemplazada por `migrateLegacyConfigToOutputColumns`.
- `localCategoriesService` quedo reducido a `loadLegacyCategories`, usado solo para leer configuracion vieja.
- `OutputCategory` ya no es editable ni fuente principal.
- `ColumnMapping` no es estado activo; solo se lee desde configuraciones viejas si no existe `excel-sanitizer:v2-output-columns`.

Legacy que sigue vivo, solo para migracion:

- `OutputCategory`: representa categorias viejas guardadas en localStorage.
- `ColumnMapping`: representa mappings viejos guardados en `excel-sanitizer:generic-settings`.
- `loadLegacyCategories`: permite convertir categorias viejas a `OutputColumn` durante la primera migracion.

Si ya existe configuracion v2 en:

```txt
excel-sanitizer:v2-output-columns
```

la app usa directamente `OutputColumn` y no toma decisiones desde `OutputCategory` ni `ColumnMapping`.

La limpieza estructural de transicion queda cerrada. Lo que queda legacy es compatibilidad de lectura, no flujo principal.

# Modelo de columnas de entrada y salida

Este documento describe la primera capa de transicion entre el modelo actual basado en `OutputCategory` y un modelo separado de columnas de entrada y columnas de salida.

## InputColumn

`InputColumn` representa una columna original del archivo importado que la app puede usar para procesar datos.

Se construye a partir de `ColumnAnalysis`, por lo que reutiliza la deteccion actual de columnas ocultas, angostas, vacias o ignoradas manualmente. En esta fase, una columna de entrada conserva:

- indice original de columna;
- letra de columna;
- encabezado o etiqueta;
- estado activa/ignorada;
- ejemplos y cantidad de datos;
- motivo de ignorado si existe.

## OutputColumn

`OutputColumn` representa una columna final del archivo que se quiere generar.

En esta primera fase convive con `OutputCategory`: cada categoria existente puede adaptarse a una columna de salida con `createOutputColumnsFromLegacy`.

La propiedad `enabled` ocupa el lugar conceptual de `exportable`, pero todavia no reemplaza el flujo actual.

## OutputRecipe

`OutputRecipe` define como se llena una columna de salida.

En esta fase solo soporta:

- `direct`: toma el valor desde una columna de entrada;
- `empty`: genera una columna vacia;
- `fixedText`: usa un texto fijo.

Mas adelante deberia crecer para soportar transformaciones, combinaciones, operaciones numericas y condiciones por columna de salida.

## ProcessedRow

`ProcessedRow` separa claramente:

- `inputValues`: valores disponibles desde columnas de entrada;
- `outputValues`: valores finales calculados para columnas de salida.

Esto evita que una sola estructura represente al mismo tiempo datos originales, datos normalizados y datos exportables.

## Por que existe esta transicion

El modelo actual usa `OutputCategory` para demasiadas responsabilidades: destino del mapeo, columna normalizada, fuente de transformacion, columna visible, columna exportable y columna auxiliar.

La transicion permite introducir el modelo nuevo sin romper el flujo actual. Por ahora la UI sigue usando categorias, mapeo y reglas globales; el modelo nuevo queda disponible como base para una fase siguiente.

## Pendiente para proximas fases

- Migrar la construccion real de filas normalizadas hacia `InputColumn` y `OutputColumn`.
- Convertir reglas globales en recetas o pasos por columna de salida.
- Permitir que una columna de salida use varias columnas de entrada.
- Soportar texto fijo, columnas vacias y operaciones numericas desde la UI.
- Versionar/migrar localStorage desde categorias actuales hacia columnas de salida.
- Actualizar exportacion y auditoria para trabajar directamente con `ProcessedRow`.

## Fase 2: pipeline paralelo desde el estado actual

La fase 2 agrega un adaptador para construir el modelo nuevo desde el estado legacy sin reemplazar el flujo principal.

La funcion `buildProcessedRowsFromLegacyState` recibe:

- filas crudas;
- analisis de columnas;
- categorias actuales;
- mapeo actual;
- primera fila de datos.

Con esos datos construye:

- `inputColumns`, usando `buildInputColumnsFromAnalysis`;
- `inputRows`, usando `buildInputRows`;
- `outputColumns`, usando `createOutputColumnsFromLegacy`;
- `processedRows`, usando `buildProcessedRows`.

En esta fase el pipeline nuevo solo interpreta recetas simples:

- `direct`;
- `empty`;
- `fixedText`.

Las reglas globales de transformacion, reglas numericas, condiciones complejas e ignorado de filas siguen viviendo en el flujo actual basado en `NormalizedRow`.

Tambien se agregaron helpers preparados para fases posteriores:

- `rowsToAoAFromProcessedRows`;
- `exportXlsxFromProcessedRows`;
- `exportCsvFromProcessedRows`;
- `compareNormalizedRowsWithProcessedRows`.

La app calcula el pipeline nuevo en paralelo dentro del wizard, pero la UI, preview y exportacion principal siguen usando el modelo viejo. En desarrollo se puede inspeccionar el pipeline activando en localStorage:

```js
localStorage.setItem('excel-sanitizer:debug-output-model', '1')
```

## Pendiente despues de fase 2

- Definir una UI acotada para editar la receta de una columna de salida.
- Migrar primero casos simples: directo, vacio y texto fijo.
- Decidir como conviven reglas globales con recetas por columna.
- Agregar una migracion versionada de localStorage para `OutputColumn`.
- Cambiar exportacion principal a `ProcessedRow` cuando la equivalencia este validada.

## Fase 3: edicion minima de recetas simples

La fase 3 agrega una UI acotada para editar recetas simples por columna de salida sin reemplazar el flujo principal.

Cada columna de salida puede configurar:

- nombre visible de salida;
- si se exporta o no;
- receta `direct`, tomando el valor desde una columna de entrada activa;
- receta `empty`, dejando la columna vacia en el pipeline nuevo;
- receta `fixedText`, llenando la columna con un texto fijo en el pipeline nuevo.

Las recetas se guardan en localStorage con la clave versionada:

```txt
excel-sanitizer:v2-output-columns
```

La compatibilidad con el modelo viejo funciona asi:

- `direct`: sincroniza el `ColumnMapping` legacy cuando la columna de salida tiene una categoria legacy asociada.
- `empty`: limpia el mapping legacy de esa categoria.
- `fixedText`: queda representado solo en `OutputColumn.recipe`; el flujo legacy no lo puede expresar todavia.

La preview/exportacion principal siguen usando `NormalizedRow`, categorias y reglas legacy. El pipeline nuevo se puede ver con la bandera de debug:

```js
localStorage.setItem('excel-sanitizer:debug-output-model', '1')
```

## Pendiente despues de fase 3

- Decidir cuando la preview principal puede pasar a leer desde `ProcessedRow`.
- Agregar recetas de transformacion simples, como prefijo, sufijo y limpiar texto.
- Migrar combinaciones de columnas al modelo de recetas.
- Migrar operaciones numericas y condiciones a pasos por columna de salida.
- Definir una estrategia para reglas globales que afectan varias columnas.
- Cambiar exportacion principal a `ProcessedRow` cuando las recetas cubran el flujo actual.

## Fase 4: preview opt-in por columnas de salida

La fase 4 permite validar visualmente el pipeline nuevo sin cambiar el comportamiento por defecto.

La preview clasica basada en `NormalizedRow` sigue siendo la default. La preview nueva se activa con el toggle de la seccion "Vista normalizada" o con localStorage:

```js
localStorage.setItem('excel-sanitizer:use-output-preview', '1')
```

Cuando esta activa, la app muestra una vista basada en:

- `ProcessedRow[]`;
- `OutputColumn[]`;
- columnas de salida `enabled`;
- orden de `OutputColumn.order`;
- valores de `processedRows.outputValues`.

Esta preview cubre las recetas simples del modelo nuevo:

- `direct`;
- `empty`;
- `fixedText`.

Para no duplicar todavia reglas de ignorado, la preview puede usar el estado de las filas legacy cuando esta disponible. Eso permite ver filas incluidas, ignoradas o con error sin migrar aun las reglas complejas.

La exportacion principal sigue usando el modelo legacy. Las reglas globales, transformaciones complejas, operaciones numericas y condiciones no se migraron en esta fase.

## Pendiente despues de fase 4

- Migrar recetas de transformacion simples por columna: trim, mayusculas/minusculas, prefijo y sufijo.
- Definir como aplicar acciones masivas o reglas de ignorado sobre `ProcessedRow`.
- Agregar auditoria para warnings/errores originados en recetas del modelo nuevo.
- Evaluar activar la preview por columnas de salida como default cuando cubra los casos habituales.
- Recién despues, cambiar exportacion principal a `ProcessedRow`.
