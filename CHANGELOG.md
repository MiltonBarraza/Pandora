# Changelog

Todos los cambios importantes de este proyecto se documentaran en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
y el proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
