# Matriz agnóstica de patrones para rangos

## Objetivo

Esta matriz sirve para clasificar estructuras reales de Excel antes de sumar nuevas capacidades a `manualRange`.

No describe un archivo puntual. Describe patrones que pueden aparecer en cualquier Excel y ayuda a decidir si un caso:

- ya está cubierto por Pandora;
- se resuelve con configuración actual, pero necesita mejor ayuda;
- es una limitación conocida;
- justifica nueva lógica.

## Para qué sirve esta matriz

Esta matriz es una herramienta de decisión de producto, no solo documentación.

Antes de agregar una opción nueva al generador:

- ubicar el caso en un patrón estructural;
- revisar si se resuelve con configuración actual;
- si se resuelve pero cuesta entenderlo, priorizar UX, copy o ayuda;
- si el caso es estructural y aparece en más de un Excel, documentarlo como mejora candidata;
- evitar features cerradas para un Excel puntual;
- usar la matriz como base para criterios de aceptación y tests futuros.

## Modelo conceptual de un rango

Cada configuración de rangos responde cinco preguntas:

1. Dónde empiezan los grupos.
2. Hasta dónde llega cada grupo.
3. De dónde sale el valor que se va a guardar.
4. A qué filas del rango se aplica ese valor.
5. Cómo puede revisar el usuario si quedó bien.

### 1. Cómo se detecta el inicio

El inicio puede salir de:

- un valor contextual encontrado en una columna;
- una columna guía con datos;
- una condición que distingue contexto de fila objetivo;
- un rango definido manualmente.

UI relacionada:

- `Buscar nombres o grupos en`;
- `Columna que marca el bloque`;
- `Aceptar como grupo solo si`.

### 2. Cómo se determina el fin

El fin puede depender de:

- una fila vacía en una columna guía;
- el próximo valor contextual;
- la última fila con dato en una columna;
- un límite manual.

UI relacionada:

- `El grupo llega hasta la última fila con dato en`;
- rangos manuales por filas reales.

### 3. De dónde se toma el valor

El valor puede venir de:

- el nombre detectado;
- el primer valor con datos de una columna dentro del rango;
- el último valor con datos de una columna dentro del rango;
- un texto fijo;
- una columna directa de la fila objetivo.

UI relacionada:

- `Guardar como valor`.

### 4. A qué filas se aplica

Un rango puede incluir filas que no se exportan, como títulos, separadores o notas.

La condición de aplicación decide dónde se escribe realmente el valor.

Ejemplo genérico:

`Aplicar el valor solo a filas donde la columna guía no está vacía.`

UI relacionada:

- `Aplicar el valor solo a filas donde`.

### 5. Cómo se revisa

El usuario debe poder revisar si la detección quedó bien antes de confiar en la salida.

UI relacionada:

- preview por rango;
- `Ver filas`;
- warnings de configuración.

## Conceptos base

### Columna guía

Columna que ayuda a detectar si una fila pertenece a un bloque o si una fila es objetivo.

Puede ser:

- código;
- precio;
- cantidad;
- descripción;
- fecha;
- importe;
- estado;
- cualquier campo confiable del archivo.

No asumir que siempre es código.

### Fila objetivo

Fila donde finalmente se quiere escribir un valor en la salida.

Puede ser:

- producto;
- movimiento;
- comprobante;
- pago;
- ítem;
- servicio;
- línea contable;
- registro;
- cualquier fila útil.

### Valor contextual

Valor que no necesariamente está en la misma fila objetivo, pero aplica a una o varias filas.

Puede ser:

- título;
- categoría;
- cliente;
- proveedor;
- fecha;
- sucursal;
- comentario;
- grupo;
- sección;
- unidad;
- cualquier dato contextual.

### Rango

Conjunto de filas reales del Excel usado como contexto para tomar o aplicar valores.

Un rango puede incluir filas que no se exportan.

### Condición de aplicación

Regla que decide en qué filas del rango se escribe realmente el valor.

## Principios de diseño

- Los rangos manuales son la base confiable.
- Los rangos sugeridos son una ayuda, no magia automática.
- La UI debe hablar en términos del Excel real, no de conceptos técnicos.
- El usuario debe poder revisar y corregir.
- Para detectar filas objetivo suelen ser más confiables columnas guía con datos reales.
- Las celdas combinadas pueden verse completas en Excel, pero al importar suelen llegar como valor solo en la primera fila.
- No conviene programar soluciones cerradas a un Excel específico.
- Antes de agregar nuevos modos, hay que clasificar patrones.
- Preferir opciones explícitas y revisables antes que heurísticas ocultas.

## Dimensiones de análisis

| Dimensión | Variantes posibles | Pregunta de decisión |
| --- | --- | --- |
| Ubicación del valor contextual | antes de filas objetivo; dentro del bloque; después de filas objetivo; misma fila objetivo; otra columna; texto fijo | ¿Dónde está el dato que se quiere guardar? |
| Detección de filas objetivo | columna guía con datos; columna guía vacía; presencia de número; presencia de fecha; patrón textual; condición compuesta | ¿Cómo se distingue una fila útil de una fila decorativa/contextual? |
| Finalización del rango | fila vacía en columna guía; próximo valor contextual; última fila con dato en una columna; cantidad fija de filas; hasta antes de otro marcador; manual | ¿Dónde termina el contexto? |
| Aplicación del valor | todas las filas del rango; solo filas objetivo; solo filas que cumplen condición; excluir títulos/separadores | ¿Dónde se escribe realmente el valor? |
| Riesgos | celdas combinadas; columnas visuales sin datos reales; encabezados intermedios; notas posteriores; jerarquías múltiples; filas decorativas | ¿Qué puede hacer que la detección parezca correcta pero exporte mal? |

## Plantilla para clasificar un nuevo Excel

Cuando aparezca un Excel nuevo, completar estas preguntas antes de pedir una nueva funcionalidad:

- ¿Cuál es la fila objetivo?
- ¿Qué valor contextual se quiere completar?
- ¿Dónde está ese valor contextual?
  - antes de la fila objetivo;
  - dentro del bloque;
  - después de las filas objetivo;
  - en la misma fila objetivo;
  - en otra columna;
  - como texto fijo definido por el usuario.
- ¿Qué columna guía permite detectar las filas útiles?
- ¿Cómo empieza el rango?
- ¿Cómo termina el rango?
- ¿El rango incluye filas que no deben exportarse?
- ¿Qué condición de aplicación distingue las filas objetivo?
- ¿Se puede resolver con la configuración actual?
- Si no se puede resolver:
  - ¿es un problema de UX/copy?
  - ¿es una limitación técnica?
  - ¿requiere una nueva capacidad real?
- ¿El patrón aparece en más de un Excel o es un caso aislado?

Esta plantilla convierte la matriz en una herramienta de uso diario: primero clasificar, después decidir.

## Matriz de patrones estructurales

| Patrón estructural | Descripción agnóstica | Configuración actual recomendada | Estado actual | Limitaciones | Mejora candidata | Ejemplos observados |
| --- | --- | --- | --- | --- | --- | --- |
| Bloques definidos por columna guía | Filas consecutivas con datos en una columna guía forman un bloque. Una fila vacía en esa columna corta el bloque. | `Columna que marca el bloque`: columna guía. `Detectar`: `Bloques separados por filas vacías`. `Guardar como valor`: primer/último valor con datos de otra columna si hace falta. | Cubierto hoy. | Si se usa una columna visual o con merges como guía, pueden salir rangos de una sola fila. | Warning más específico; estrategia futura para merges. | Accesorios y abrasivos. |
| Valor contextual antes de filas objetivo | Una fila anterior contiene un valor que debe aplicarse a filas útiles debajo. | `Buscar nombres o grupos en`: columna del valor contextual. `Aceptar como grupo solo si`: condición que distingue contexto de fila objetivo. `El grupo llega hasta la última fila con dato en`: columna guía. `Aplicar el valor solo a filas donde`: columna guía cumple condición. | Cubierto hoy. | Usuario debe entender diferencia entre rango incluido y filas donde se aplica valor. | Mejor ayuda/copy y ejemplos guiados. | Arquitectónica. |
| Valor contextual dentro del bloque | Valor a guardar está dentro del mismo rango, pero no necesariamente en primera fila. | Generar rango por columna guía. `Guardar como valor`: primer o último valor con datos de una columna. | Cubierto hoy en casos simples. | Si hay varios textos candidatos, usuario debe revisar cuál toma primer/último. | Preview más explícita del valor tomado. | Accesorios con serie/comentario. |
| Valor contextual después de filas objetivo | Notas, totales parciales o aclaraciones aparecen después de filas útiles, pero pertenecen al bloque anterior. | Evitar recorte prematuro si se necesita incluir nota. Generar rango más amplio y aplicar valor solo a filas objetivo. Si la cantidad de filas posteriores es conocida, usar `Incluir filas posteriores` con grupos detectados por campos con datos o bloques separados por filas vacías. | Cobertura inicial. | Si se recorta a última fila con dato en columna guía, valor posterior queda fuera salvo que se incluyan filas posteriores. La cantidad fija puede fallar con notas variables. | Mejora futura: extender hasta antes del próximo grupo/marcador o buscar valores posteriores sin ampliar rango. | Aerosoles. |
| Jerarquías superpuestas | Varios niveles contextuales activos al mismo tiempo: línea, categoría, subcategoría, grupo, etc. | Varias columnas de salida, cada una con su propia receta de rango. | Parcial. | Requiere configuración repetida. | Reutilizar detecciones entre columnas o crear plantilla de varias columnas. | Recupast, Creart, Industrial. |
| Fila objetivo con valor propio | Valor requerido ya está en la misma fila objetivo. | No usar rangos para ese valor. Usar columna directa o receta simple. | Cubierto. | Usuario debe saber cuándo no usar rangos. | Ayuda/copy para sugerir columna directa. | Selladores, Automotor. |
| Filas incluidas en rango pero no exportables | Rango incluye títulos, separadores o notas, pero valor solo debe escribirse en filas objetivo. | `Aplicar el valor solo a filas donde`. | Cubierto hoy. | Si no se configura condición de aplicación, se puede escribir valor en filas no exportables. | Warnings/ayuda cuando rango contiene filas sin columna guía. | Arquitectónica. |
| Estructura visual distinta a estructura importada | Excel muestra celdas combinadas, encabezados visuales o valores extendidos que no existen como datos en cada fila importada. | Usar columna guía confiable; preview por rango; warning de rangos de una fila. | Mitigado, no resuelto completamente. | Lo visual puede engañar: valor existe solo en primera fila importada. | Investigar merges o advertencias más específicas. | Accesorios, Arquitectónica, Recupast. |
| Marcadores no vacíos que no son filas objetivo | Columna guía puede contener texto decorativo o encabezados, aunque no sea fila útil. | Usar otra columna guía, como precio/cantidad/importe, o condición alternativa. | Parcial. | Faltan operadores para distinguir números, patrones o códigos. | Operadores: `tiene número`, `no tiene número`, `coincide con patrón`, `no coincide con patrón`. | Bloques con `CODIFICACION` u otros encabezados intermedios. |

## Ejemplos observados

Los ejemplos reales sirven como evidencia secundaria. No deben convertirse en reglas cerradas.

- Accesorios y abrasivos: ejemplifica bloques definidos por columna guía y estructura visual con celdas combinadas.
- Arquitectónica: ejemplifica valor contextual antes de filas objetivo y filas incluidas pero no exportables.
- Recupast / Creart / Industrial: ejemplifican jerarquías superpuestas.
- Aerosoles: ejemplifica valor contextual posterior a filas objetivo.
- Selladores / Automotor: ejemplifican filas objetivo con valor propio.

## Capacidades actuales de Pandora

Pandora ya permite:

- crear rangos manuales por filas reales de Excel;
- generar rangos sugeridos;
- buscar nombres o grupos en una columna;
- detectar bloques separados por filas vacías en una columna guía;
- aceptar grupos solo si otra columna cumple una condición;
- recortar un grupo hasta la última fila con dato en una columna;
- guardar como valor:
  - sin valor;
  - nombre detectado;
  - primer valor con datos de una columna;
  - último valor con datos de una columna;
- aplicar valor solo a filas que cumplen una condición;
- revisar filas con preview por rango;
- mostrar warnings para configuraciones riesgosas;
- evitar `Trabajar con rangos` dentro de concatenaciones internas.

## Limitaciones conocidas

- No hay soporte especial completo para celdas combinadas.
- No hay operadores de patrón como `tiene número`, `no tiene número` o `coincide con patrón`.
- Valores contextuales posteriores a filas objetivo requieren cuidado.
- Jerarquías superpuestas pueden requerir muchas columnas configuradas a mano.
- Usuario todavía necesita decidir cuándo usar rango y cuándo usar columna directa.
- Algunas estructuras visuales del Excel no se corresponden con datos importados fila por fila.

## Candidatos de mejora

- Mejorar ayudas para elegir entre columna directa y rangos.
- Agregar operadores de condición por número, fecha o patrón textual.
- Permitir reutilizar detecciones/rangos entre varias columnas.
- Manejar valores contextuales posteriores a filas objetivo.
- Investigar lectura y expansión de celdas combinadas.
- Crear plantillas de múltiples columnas desde una misma detección.
- Mejorar warnings para columnas guía poco confiables.

## Reglas de decisión antes de agregar una feature

Antes de agregar una nueva opción al generador:

1. Clasificar el caso dentro de un patrón estructural.
2. Ver si se resuelve con configuración actual.
3. Si se resuelve pero es difícil de entender, priorizar UX/copy.
4. Si no se resuelve y aparece en más de un Excel, documentar como mejora candidata.
5. Evitar heurísticas ocultas que el usuario no pueda revisar.
6. Preferir opciones explícitas y revisables.
7. Agregar tests basados en patrón estructural, no en un Excel puntual.

## Cómo convertir un patrón en test

Los tests deben representar patrones estructurales, no Excels puntuales.

Ejemplos:

- En vez de testear `Arquitectónica`, testear `valor contextual antes de filas objetivo`.
- En vez de testear `Accesorios`, testear `bloques definidos por columna guía`.
- En vez de testear `Aerosoles`, testear `valor contextual posterior a filas objetivo`.
- En vez de testear una columna llamada `Código`, testear una `columna guía`.

Para cada test basado en patrón, definir:

- filas de entrada mínimas;
- columna guía;
- valor contextual esperado;
- rango esperado;
- condición de aplicación;
- salida esperada.

Esto ayuda a que los tests validen comportamiento general y no dependan de nombres de hojas, proveedores o formatos específicos.

## Prioridades sugeridas

### Alta

- Mantener esta matriz como marco de decisión.
- Agregar fixtures/tests por patrón estructural cuando aparezcan bugs.
- Mejorar ayudas para decidir cuándo usar rango y cuándo usar columna directa.

### Media

- Manejo de valor contextual posterior a filas objetivo.
- Operadores nuevos:
  - tiene número;
  - no tiene número;
  - coincide con patrón;
  - no coincide con patrón.
- Reutilizar rangos/detecciones entre varias columnas.

### Baja/media

- Soporte explícito de celdas combinadas.
- Selección persistente de columnas en preview.
- Plantillas de múltiples columnas.

## Notas de decisión

- No sumar modos nuevos sin ubicar primero el caso en esta matriz.
- Mantener ejemplos reales como evidencia, no como centro del diseño.
- Preferir configuración explicable a heurísticas ocultas.
- Mantener separada la detección inicial de la resolución final del output.
