# Changelog

Todos los cambios importantes de este proyecto se documentaran en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
y el proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.6] - 2026-06-12

### Added

- Control de preview para mostrar columnas con datos en configuracion de filas, sin afectar settings ni exportacion.
- Prompt previo a descargar Excel para guardar configuracion solo cuando hay cambios relevantes contra la configuracion cargada o guardada.
- Date picker para valores fijos de fecha en el editor de recetas, guardando el valor como `YYYY-MM-DD`.

### Changed

- Checkboxes migrados visualmente al estilo compacto global con estados hover, focus, checked, unchecked y disabled.
- Filtros sugeridos de columnas detectadas reorganizados como Vacias sugeridas, Ocultas sugeridas, Activar todas y Restaurar filtros sugeridos.
- Estado "Filtros aplicados" ahora muestra multiples tags simultaneos y distingue cambios manuales.
- "Agregar columnas activas" ahora regenera columnas generadas desde las columnas activas actuales, evitando duplicados y obsoletas.
- Textos de guards destructivos ajustados a "Seguir editando" y "Descartar cambios" para evitar ambiguedad.

### Fixed

- Columnas angostas ahora cuentan dentro de "Ocultas sugeridas" para evitar falsos estados personalizados.
- Cambios manuales en filtros detectan tanto columnas activadas como ignoradas manualmente.
- Regeneracion de columnas de salida muestra confirmacion si hay ediciones manuales sobre columnas generadas.
- Fecha fija en recetas oculta el formato de entrada incompatible y exporta correctamente segun el formato de salida elegido.

## [0.2.5] - 2026-06-12

### Added

- Soporte inicial de fechas en el editor de recetas con modo "Trabajar con fechas", operacion "Formatear fecha", formatos de entrada/salida controlados y fallback configurable para valores invalidos.
- Parseo de fechas como fecha civil, incluyendo dia/mes de uno o dos digitos y anos de dos digitos, sin cambiar la salida final como string.
- Dialogo visual reusable `ConfirmDialog` para confirmaciones internas sin depender de `window.confirm`.
- Guard visual hibrido para perdida de cambios: modal custom en acciones internas y atajos de recarga interceptables, manteniendo `beforeunload` nativo como fallback para salidas reales.
- Tooltips custom para acciones de duplicar y eliminar columnas de salida, manteniendo `aria-label` y evitando `title` nativo.
- Infraestructura de apariencia Light/Dark con toolbar superior, persistencia en `localStorage` y aplicacion de `data-theme` en el documento.
- Tokens dark Pandora para fondos, superficies, texto, bordes, estados semanticos, hero, tablas, selected states, tooltips, toasts y toolbar.

### Changed

- Los formatos visibles del editor de fechas usan labels compactos en espanol, manteniendo los valores internos compatibles con settings y localStorage.
- El modal/editor de recetas reemplaza confirmaciones nativas por `ConfirmDialog` al descartar cambios sin aplicar.
- Los botones "Agregar" del editor de recetas usan estilos scoped con mejor contraste y jerarquia visual sin cambiar la paleta global.
- La lista de columnas de salida mejora el espaciado del nombre, truncado de nombres largos, tooltips de nombres completos y alineacion de acciones icon-only.
- La toolbar de apariencia muestra solo las opciones visibles Claro y Oscuro, manteniendo soporte interno seguro para la preferencia `system`.
- Hero, dropdowns, tablas, selected states, tooltips y toasts pasan a usar tokens preparados para Light/Dark sin cambiar la experiencia del modo claro.

### Fixed

- Corregido el comportamiento de tooltips para que hover, foco, click, blur y mouseleave no dejen popups pegados.
- Corregida la posicion de tooltips custom al envolver botones que no forwardean `ref`, como `ActionButton` y `DeleteButton`.
- Corregido el guard de cambio de hoja para pedir confirmacion solo cuando hay cambios reales de configuracion.
- Corregido el estado protegido inicial para que la primera carga de archivo no dispare el guard por una columna sintetica vacia.
- Corregido el truncado visible de nombres largos de columnas de salida cuando estan envueltos por tooltip custom.

## [0.2.4] - 2026-06-11

### Added

- Componente reusable `InfoTooltip` con ayudas contextuales breves para labels, titulos, secciones y acciones del wizard.
- Ayudas contextuales en configuracion de filas, columnas detectadas, filtros, columnas de salida, recetas, nombre de archivo, descargas y modal de valor personalizado.

### Changed

- Los tooltips de acciones se muestran sobre el boton correspondiente para reducir ruido visual.
- El posicionamiento de `InfoTooltip` usa placement configurable con fallback simple y correccion contra bordes de viewport.

## [0.2.4] - 2026-06-10

### Changed

- Migrada la paleta visual a tokens CSS semanticos con base Pandora, manteniendo superficies blancas y estados success, warning, error y danger diferenciados.
- Los botones primarios, secundarios, danger, iconos, inputs, dropdowns, modales, tablas, previews y estados de foco usan tokens compartidos.
- El editor de recetas, transformaciones y reglas usa acentos lavanda para distinguir bloques de sanitizacion sin saturar la interfaz.
- La seleccion activa, hover de tablas/dropdowns y dropzone usan acentos azul hielo Pandora.
- El boton para remover archivo en el dropzone usa un estilo danger suave con borde y hover destructivo no solido.
- La opcion seleccionada del Dropdown usa un fondo accent limpio sin barra lateral.
- La pantalla interna de preview de iconos usa los tokens de color compartidos.

### Fixed

- Las previews de entrada para celdas Excel de fecha ahora evitan mostrar por defecto formatos estadounidenses inesperados como `6/1/24` cuando la celda representa `1/6/2024`.
- Corregido el formateo de fechas leidas desde Excel para conservar una representacion local clara en las secciones de preview y deteccion de columnas.

### Fixed

- Corregido el rendering de tooltips dentro de modales para que queden sobre el `dialog` y no debajo del top layer del navegador.
- Corregida la visibilidad y alineacion del icono de ayuda dentro del modal de valor personalizado.
- Corregidos desbordes de tooltips cerca de los bordes izquierdo, derecho, superior e inferior de la ventana.

## [0.2.4] - 2026-06-10

### Changed

- El flujo inicial ahora muestra solo la carga de archivo hasta que haya un Excel o CSV valido; al remover el archivo vuelve a ocultar el resto de secciones.
- El editor de recetas cambia a draft local con acciones Cancelar y Aplicar, preview basada en el draft y confirmacion al descartar cambios sin aplicar.
- El modal XL del editor de recetas abre con altura maxima para dar mas espacio a dropdowns y mantener header/footer fijos.
- Las partes concatenadas del editor usan nomenclatura de pasos, alineando visualmente los pasos internos con los pasos normales de la receta.
- La seleccion de fuente de los pasos se unifica en un solo dropdown con columnas de entrada, texto fijo y resultado anterior cuando aplica.
- La carga de archivo integra el texto de ayuda dentro del area de drop para no aumentar la altura de la seccion.

### Fixed

- Ajustada la estrategia de apertura del Dropdown para preferir abrir hacia abajo con scroll cuando hay espacio util, y limitar mejor los menus que abren hacia arriba dentro del modal.
- Corregido el cierre visual del modal para que no quede renderizado como panel incrustado al cerrarse.

## [0.2.3] - 2026-06-08

### Added

- Accion en columnas de salida para crear automaticamente salidas directas desde columnas activas.
- Opcion para incluir hora local en nombres de archivo con formato seguro `YYYY-MM-DD_HH-mm`.
- Tests de caracterizacion para acciones rapidas de columnas, reglas incompletas, preview normalizada, nombres de descarga y defaults de columnas de salida.

### Changed

- La seccion de carga de archivo diferencia mejor el estado vacio y el archivo listo, con accion interna para remover.
- La configuracion de filas limita la preview cruda a 30 filas, reordena opciones relacionadas y valida encabezados antes de primera fila de datos.
- Las acciones rapidas de columnas detectadas explican que las sugerencias de ignorado se acumulan sobre la seleccion actual.
- Las reglas nuevas de filtros de entrada y salida arrancan incompletas, con placeholders y sin afectar el procesamiento hasta completarse.
- La seccion de columnas de salida mejora espaciado, contraste, estado seleccionado y resumen de valores personalizados.
- Las columnas de salida ya no incluyen columnas default innecesarias en instalaciones nuevas o defaults legacy guardados.
- La vista normalizada muestra solo columnas reales de salida y limita la preview visual a 30 filas sin afectar exportaciones.
- La configuracion de nombre muestra un unico nombre final sin extension y separa descargas de archivo final y auditoria.

### Fixed

- Las reglas incompletas ya no filtran filas por valores default accidentales.
- El boton de borrar reglas queda alineado con los inputs.
- La accion de remover archivo respeta dirty state sin abrir el selector de archivos.
- La preview normalizada oculta columnas tecnicas como seleccion, estado, fila y motivo/error.

## [0.2.2] - 2026-06-06

### Added

- Dropdown reusable con portal, navegacion por teclado y estrategia configurable de scroll.
- Bloqueo reutilizable de scroll para modales y dropdowns.
- Base reusable `ActionButton` con mapa centralizado de iconos SVG existentes.

### Changed

- Migrados los selects nativos del wizard, editor de recetas e IgnoreRules al Dropdown reusable.
- Los botones de settings, descarga, duplicado, eliminado, cierre y agregar regla usan iconos centralizados.

### Fixed

- Corregido el scroll de fondo al abrir modales.
- Corregido el portal de dropdowns dentro de dialog para que las opciones sigan siendo seleccionables.

## [0.2.1] - 2026-06-05

### Added

- Exportacion e importacion de settings reutilizables en archivos JSON.
- Snapshots del archivo y hoja de origen para validar compatibilidad.
- Deteccion de referencias, compatibilidad y remapeo de columnas de entrada.
- Aplicacion segura de settings compatibles o con advertencias.
- Tests unitarios para snapshot, compatibilidad, referencias, remapeo, archivos y aplicacion de settings.

### Changed

- La compatibilidad ahora distingue columnas faltantes usadas y no usadas.
- Los controles de preview exportables son administrados por el wizard.
- La visibilidad y los alias de columnas se restauran al aplicar settings.

### Fixed

- Corregidas coincidencias ambiguas y columnas nuevas falsas al comparar el mismo archivo sin encabezados.
- Corregida la restauracion de los checks de columna activa.
- Corregida la restauracion de "Mostrar desde la primera fila de datos".
- Corregida la restauracion de "Ver todas las columnas".
- Los valores booleanos `false` y los settings antiguos sin flags opcionales ahora se manejan correctamente.

## [0.2.0] - 2026-06-04

### Added

- Soporte de fuentes configurables, operandos numericos y concatenacion como operacion de paso.
- Transformaciones de texto, numero y conversion dentro de partes concatenadas.
- Pantalla interna para previsualizar iconos SVG con distintos tamanos, colores y fondos.

### Changed

- El modal "Crear valor personalizado" ahora esta centrado en una secuencia de pasos.
- Las operaciones numericas permiten configurar operandos izquierdo y derecho.
- Las partes de concatenacion ahora usan una lista lateral, panel de configuracion y reordenamiento.
- La transformacion principal de cada parte se integra directamente en su configuracion.

### Fixed

- Corregida la vista previa interna del modal para operaciones numericas con operandos.
- Corregida la configuracion y vista previa de partes concatenadas.
- Eliminados controles redundantes y campos de fuente no interactivos del modal.

## [0.1.0] - 2026-06-02

### Added

- Modelo unificado de columnas de entrada, columnas de salida, recetas y filas procesadas.
- Modal "Crear valor personalizado" con pasos secuenciales de texto, numero y conversion.
- Modo "Concatenar / unir partes" con pasos opcionales por parte.
- Preview normalizada, exportacion Excel/CSV y auditoria basadas en `ProcessedRow`.

### Changed

- Separadas la forma de construir el valor y el tipo de operacion de cada paso.
- Las operaciones numericas conservan valores numericos puros.
- Las reglas para filtrar filas de entrada y salida se procesan por separado.
- La persistencia guarda columnas de salida, pasos, separadores y modos de paso.

### Fixed

- Corregida la seleccion del modo concatenar y la vista previa de recetas vacias.
- Corregida la inferencia y persistencia de modos de pasos.
- Corregidos previews numericos para texto no numerico y conversiones explicitas.
- Eliminados campos y opciones legacy o sin uso.

## [0.0.1] - 2026-06-01

### Added

- Alias visuales para columnas de entrada y etiquetas claras en selectores.
- Filtros separados para filas de entrada y salida, con trazabilidad en auditoria.
- Duplicado profundo de columnas de salida con nuevos identificadores.
- Formato fijo de decimales y formato monetario configurable para operaciones numericas.

### Changed

- La preview de configuracion de filas puede comenzar desde la primera fila de datos.
- Las recetas simples muestran solo sus controles esenciales.
- La receta avanzada `combine` se presenta como "Crear valor personalizado".
- El editor avanzado usa modal, resumen compacto, vista previa y editor de partes.
- Todas las columnas de salida se normalizan como exportables.

### Fixed

- Corregido el truncado de nombres largos en la lista de columnas de salida.
- Corregida la persistencia y seleccion del modo "Concatenar / unir valores".
- Corregida la vista previa numerica para valores no numericos.
- Corregida la conservacion de ceros finales al usar redondeo fijo.

## [0.0.0] - 2026-05-31

### Added

- Importacion, analisis y sanitizacion de archivos Excel y CSV completamente en frontend.
- Modelo de columnas de entrada, columnas de salida configurables y filas procesadas.
- Recetas directas, vacias, de texto fijo y combinadas con transformaciones por columna.
- Reglas para ignorar filas, preview normalizada y exportacion Excel, CSV y auditoria.
- Tests unitarios del motor de recetas, transformaciones, condiciones y validaciones.

### Changed

- La configuracion de columnas de salida usa una lista compacta con panel de detalle.
- Las recetas combinadas permiten transformaciones y separadores propios por parte.

### Fixed

- Corregidos desbordes y superposiciones en columnas de salida y reglas de ignorado.
- Corregido el filtrado de columnas ocultas, angostas y vacias.
