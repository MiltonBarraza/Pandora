# Modelo de salida

La app tiene un unico flujo principal:

```txt
InputColumn -> InputRow -> OutputColumn -> OutputRecipe -> ProcessedRow
```

No hay flujo paralelo ni compatibilidad con configuraciones antiguas de localStorage.

## InputColumn

Representa una columna disponible del archivo importado.

Se construye desde el analisis de columnas y conserva:

- indice original;
- letra de columna;
- etiqueta o encabezado;
- estado activa/ignorada;
- muestras y cantidad de valores.

## OutputColumn

Representa una columna final del archivo exportado.

Define:

- `label`: encabezado de salida;
- `order`: posicion en preview/exportacion;
- `enabled`: si se exporta;
- `recipe`: como se llena.

Si no existe configuracion guardada en `excel-sanitizer:v2-output-columns`, la app crea columnas de salida default directamente como `OutputColumn`.

## OutputRecipe

Define como se calcula una columna de salida.

Tipos soportados:

- `direct`: toma valor desde una columna de entrada;
- `empty`: deja la columna vacia;
- `fixedText`: usa texto fijo;
- `combine`: combina columnas de entrada y textos fijos.

Las recetas pueden tener `steps`.

En `combine`, cada parte puede definir:

- origen desde columna de entrada o texto fijo;
- `steps` propios, aplicados antes de unir;
- `separatorAfter`, aplicado despues de esa parte.

El `separator` global de la receta se mantiene como fallback cuando una parte no define `separatorAfter`. Nunca se agrega separador despues de la ultima parte. Despues de combinar todas las partes, se aplican los `steps` finales de la columna completa.

## TransformStep

Cada transformacion pertenece a una columna de salida.

Tipos soportados:

- `trim`;
- `uppercase`;
- `lowercase`;
- `addPrefix`;
- `addSuffix`;
- `removeText`;
- `replaceText`;
- `numericOperation`.

Las operaciones numericas soportan:

- sumar;
- restar;
- multiplicar;
- dividir;
- sumar porcentaje;
- restar porcentaje;
- quitar porcentaje incluido.

Cada step puede tener una condicion opcional sobre una columna de entrada o una columna de salida ya calculada.

## ProcessedRow

`ProcessedRow` es la fila procesada final del motor.

Contiene:

- `inputValues`;
- `outputValues`;
- `status`;
- `ignoredReason`;
- `warnings`;
- `error`.

La preview, exportacion Excel, exportacion CSV y auditoria leen desde `ProcessedRow`.

## Reglas de Ignorado

Las reglas de ignorado evaluan exclusivamente columnas actuales:

- `target: input`;
- `target: output`;
- `columnId`.

No hay conversion de ids antiguos.

## Tests

El motor esta cubierto con Vitest.

Comandos:

```txt
npm run test
npm run test:run
```

Cobertura principal:

- recetas;
- transformaciones simples;
- operaciones numericas;
- condiciones;
- reglas de ignorado;
- validaciones basicas;
- defaults de columnas de salida.
