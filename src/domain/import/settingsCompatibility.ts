import type {
  ColumnCompatibilityMatch,
  ColumnMatchConfidence,
  ExportedImportSettings,
  SettingsCompatibilityResult,
  SettingsCompatibilityStatus,
  SettingsColumnReference,
  SourceColumnSnapshot,
  SourceSnapshot,
} from '../../types/import';
import { collectSettingsReferences } from './settingsReferences';

const minimumSheetSimilarity = 0.72;

type ColumnCandidate = {
  currentColumn: SourceColumnSnapshot;
  confidence: ColumnMatchConfidence;
  reason: string;
  score: number;
};

export function compareSettingsToCurrentSnapshot(
  settings: Partial<ExportedImportSettings>,
  currentSnapshot: SourceSnapshot,
): SettingsCompatibilityResult {
  const validationError = validateSettings(settings);
  const expectedSheet = settings.config?.selectedSheet ?? settings.sourceSnapshot?.sheetName;
  const sheet = resolveSheet(expectedSheet, currentSnapshot);

  if (validationError) {
    return buildBlockedResult({
      expectedSheet,
      currentSnapshot,
      message: validationError,
      sheetExists: sheet.exists,
      suggestedSheet: sheet.suggestedSheet,
    });
  }

  if (expectedSheet && !sheet.exists) {
    return buildBlockedResult({
      expectedSheet,
      currentSnapshot,
      message: sheet.suggestedSheet
        ? `La hoja "${expectedSheet}" no existe. Se encontró una hoja parecida: "${sheet.suggestedSheet}".`
        : `La hoja "${expectedSheet}" no existe en el archivo actual.`,
      sheetExists: false,
      suggestedSheet: sheet.suggestedSheet,
    });
  }

  const savedColumns = settings.sourceSnapshot?.columns ?? [];
  const referencesSummary = collectSettingsReferences(settings as ExportedImportSettings);
  const columnResult = enrichColumnResult(findColumnMatches(savedColumns, currentSnapshot.columns), referencesSummary.referencesByColumnId);
  const summary = buildSummary(savedColumns, currentSnapshot.columns, columnResult.matches, columnResult.missing, columnResult.added, columnResult.ambiguous, columnResult.usedMissing, columnResult.unusedMissing, columnResult.weakUsedMatches);
  const messages = buildMessages({
    sheetExpected: expectedSheet,
    sheetSuggested: sheet.suggestedSheet,
    missing: columnResult.missing,
    added: columnResult.added,
    ambiguous: columnResult.ambiguous,
    matches: columnResult.matches,
    usedMissing: columnResult.usedMissing,
    unusedMissing: columnResult.unusedMissing,
    weakUsedMatches: columnResult.weakUsedMatches,
  });

  return {
    status: determineStatus(columnResult.matches, columnResult.added, columnResult.ambiguous, columnResult.usedMissing, columnResult.unusedMissing, columnResult.weakUsedMatches),
    sheet: {
      ...(expectedSheet ? { expectedSheet } : {}),
      ...(currentSnapshot.sheetName ? { currentSheet: currentSnapshot.sheetName } : {}),
      exists: sheet.exists,
      ...(sheet.suggestedSheet ? { suggestedSheet: sheet.suggestedSheet } : {}),
    },
    columns: columnResult,
    summary,
    messages,
  };
}

export function findColumnMatches(savedColumns: SourceColumnSnapshot[], currentColumns: SourceColumnSnapshot[]) {
  const matches: ColumnCompatibilityMatch[] = [];
  const ambiguous: ColumnCompatibilityMatch[] = [];
  const usedCurrentColumnIds = new Set<string>();

  savedColumns.forEach((savedColumn) => {
    const candidates = getColumnCandidates(savedColumn, currentColumns);
    const bestCandidate = candidates[0];

    if (!bestCandidate) {
      matches.push({
        savedColumn,
        confidence: 'none',
        reason: 'No se encontró una columna compatible.',
      });
      return;
    }

    const isAmbiguous = candidates.length > 1 && isAmbiguousCandidate(bestCandidate, candidates[1]);
    const match: ColumnCompatibilityMatch = {
      savedColumn,
      currentColumn: bestCandidate.currentColumn,
      confidence: bestCandidate.confidence,
      reason: bestCandidate.reason,
    };

    matches.push(match);
    if (isAmbiguous) {
      ambiguous.push({
        ...match,
        reason: `Hay más de una columna actual que podría coincidir con "${getColumnDisplayName(savedColumn)}".`,
      });
    }

    if (!usedCurrentColumnIds.has(bestCandidate.currentColumn.inputColumnId)) {
      usedCurrentColumnIds.add(bestCandidate.currentColumn.inputColumnId);
    }
  });

  const missing = matches
    .filter((match) => match.confidence === 'none')
    .map((match) => match.savedColumn);
  const added = currentColumns.filter((column) => !usedCurrentColumnIds.has(column.inputColumnId));

  return {
    matches,
    missing,
    added,
    ambiguous,
  };
}

function enrichColumnResult(
  columnResult: ReturnType<typeof findColumnMatches>,
  referencesByColumnId: Record<string, SettingsColumnReference[]>,
) {
  const enrichMatch = (match: ColumnCompatibilityMatch): ColumnCompatibilityMatch => {
    const references = referencesByColumnId[match.savedColumn.inputColumnId] ?? [];
    return {
      ...match,
      isUsed: references.length > 0,
      ...(references.length > 0 ? { references } : {}),
    };
  };
  const matches = columnResult.matches.map(enrichMatch);
  const ambiguous = columnResult.ambiguous.map(enrichMatch);
  const isUsedColumn = (column: SourceColumnSnapshot) => (referencesByColumnId[column.inputColumnId] ?? []).length > 0;
  const usedMissing = columnResult.missing.filter(isUsedColumn);
  const unusedMissing = columnResult.missing.filter((column) => !isUsedColumn(column));
  const weakUsedMatches = matches.filter((match) => match.isUsed && match.confidence === 'weak');

  return {
    matches,
    missing: columnResult.missing,
    added: columnResult.added,
    ambiguous,
    usedMissing,
    unusedMissing,
    weakUsedMatches,
  };
}

function isAmbiguousCandidate(bestCandidate: ColumnCandidate, nextCandidate: ColumnCandidate) {
  if (bestCandidate.confidence === 'exact') {
    return false;
  }

  if (bestCandidate.confidence === 'weak' || nextCandidate.confidence === 'weak') {
    return false;
  }

  return bestCandidate.confidence === nextCandidate.confidence && bestCandidate.score - nextCandidate.score <= 10;
}

export function normalizeColumnName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function calculateColumnSimilarity(a: string, b: string) {
  const left = normalizeColumnName(a);
  const right = normalizeColumnName(b);

  if (!left && !right) {
    return 1;
  }

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const distance = levenshteinDistance(left, right);
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}

function validateSettings(settings: Partial<ExportedImportSettings>) {
  if (settings.app !== 'excel-sanitizer') {
    return 'El archivo de configuración no pertenece a excel-sanitizer.';
  }

  if (settings.schemaVersion !== 1) {
    return 'La versión del archivo de configuración no es compatible.';
  }

  if (!settings.sourceSnapshot) {
    return 'El archivo de configuración no contiene snapshot de origen.';
  }

  if (!settings.config) {
    return 'El archivo de configuración no contiene configuración.';
  }

  return '';
}

function resolveSheet(expectedSheet: string | undefined, currentSnapshot: SourceSnapshot) {
  if (!expectedSheet) {
    return { exists: true };
  }

  const currentSheetNames = currentSnapshot.sheetNames ?? (currentSnapshot.sheetName ? [currentSnapshot.sheetName] : []);
  if (currentSheetNames.includes(expectedSheet)) {
    return { exists: true };
  }

  const suggestedSheet = currentSheetNames
    .map((sheetName) => ({
      sheetName,
      similarity: calculateColumnSimilarity(expectedSheet, sheetName),
    }))
    .filter((candidate) => candidate.similarity >= minimumSheetSimilarity)
    .sort((left, right) => right.similarity - left.similarity)[0]?.sheetName;

  return {
    exists: false,
    ...(suggestedSheet ? { suggestedSheet } : {}),
  };
}

function getColumnCandidates(savedColumn: SourceColumnSnapshot, currentColumns: SourceColumnSnapshot[]) {
  return currentColumns
    .map((currentColumn) => getColumnCandidate(savedColumn, currentColumn))
    .filter((candidate): candidate is ColumnCandidate => candidate.confidence !== 'none')
    .sort((left, right) => right.score - left.score);
}

function getColumnCandidate(savedColumn: SourceColumnSnapshot, currentColumn: SourceColumnSnapshot): ColumnCandidate {
  const savedHeader = normalizeColumnName(savedColumn.header);
  const currentHeader = normalizeColumnName(currentColumn.header);
  const savedAlias = normalizeColumnName(savedColumn.alias);
  const currentAlias = normalizeColumnName(currentColumn.alias);
  const headerSimilarity = calculateColumnSimilarity(savedHeader, currentHeader);
  const aliasSimilarity = savedAlias && currentAlias ? calculateColumnSimilarity(savedAlias, currentAlias) : 0;
  const sameIndex = savedColumn.columnIndex === currentColumn.columnIndex;
  const sameLetter = savedColumn.columnLetter === currentColumn.columnLetter;

  if (sameIndex && savedHeader === currentHeader) {
    return {
      currentColumn,
      confidence: 'exact',
      reason: 'Mismo índice y mismo encabezado equivalente.',
      score: 500,
    };
  }

  if (savedHeader && savedHeader === currentHeader) {
    return {
      currentColumn,
      confidence: 'strong',
      reason: sameIndex ? 'Mismo encabezado equivalente.' : 'Mismo encabezado equivalente en otra posición.',
      score: 420 - Math.abs(savedColumn.columnIndex - currentColumn.columnIndex),
    };
  }

  if (savedAlias && currentAlias && savedAlias === currentAlias) {
    return {
      currentColumn,
      confidence: 'strong',
      reason: 'Mismo alias equivalente.',
      score: 390,
    };
  }

  if (savedColumn.fingerprint && savedColumn.fingerprint === currentColumn.fingerprint) {
    return {
      currentColumn,
      confidence: 'medium',
      reason: 'Mismo fingerprint de columna.',
      score: 320,
    };
  }

  if (savedHeader && currentHeader && headerSimilarity >= 0.82) {
    return {
      currentColumn,
      confidence: 'medium',
      reason: 'Encabezado parecido.',
      score: Math.round(250 + headerSimilarity * 50),
    };
  }

  if (savedAlias && currentAlias && aliasSimilarity >= 0.82) {
    return {
      currentColumn,
      confidence: 'medium',
      reason: 'Alias parecido.',
      score: Math.round(230 + aliasSimilarity * 50),
    };
  }

  if (sameIndex || sameLetter) {
    return {
      currentColumn,
      confidence: 'weak',
      reason: sameIndex ? 'Mismo índice con encabezado diferente.' : 'Misma letra con encabezado diferente.',
      score: 120,
    };
  }

  return {
    currentColumn,
    confidence: 'none',
    reason: 'Sin coincidencia.',
    score: 0,
  };
}

function determineStatus(
  matches: ColumnCompatibilityMatch[],
  added: SourceColumnSnapshot[],
  ambiguous: ColumnCompatibilityMatch[],
  usedMissing: SourceColumnSnapshot[],
  unusedMissing: SourceColumnSnapshot[],
  weakUsedMatches: ColumnCompatibilityMatch[],
): SettingsCompatibilityStatus {
  const usedUnsafeMatches = matches.filter((match) => match.isUsed && (match.confidence === 'none' || match.confidence === 'medium' || match.confidence === 'weak'));
  const usedAmbiguousMatches = ambiguous.filter((match) => match.isUsed);

  if (usedMissing.length > 0 || weakUsedMatches.length > 0 || usedUnsafeMatches.length > 0 || usedAmbiguousMatches.length > 0) {
    return 'needsRemap';
  }

  if (added.length > 0 || unusedMissing.length > 0 || matches.some((match) => match.confidence === 'medium' || match.confidence === 'weak')) {
    return 'warning';
  }

  return 'compatible';
}

function buildSummary(
  savedColumns: SourceColumnSnapshot[],
  currentColumns: SourceColumnSnapshot[],
  matches: ColumnCompatibilityMatch[],
  missing: SourceColumnSnapshot[],
  added: SourceColumnSnapshot[],
  ambiguous: ColumnCompatibilityMatch[],
  usedMissing: SourceColumnSnapshot[],
  unusedMissing: SourceColumnSnapshot[],
  weakUsedMatches: ColumnCompatibilityMatch[],
): SettingsCompatibilityResult['summary'] {
  return {
    totalSavedColumns: savedColumns.length,
    totalCurrentColumns: currentColumns.length,
    exactMatches: matches.filter((match) => match.confidence === 'exact').length,
    strongMatches: matches.filter((match) => match.confidence === 'strong').length,
    mediumMatches: matches.filter((match) => match.confidence === 'medium').length,
    weakMatches: matches.filter((match) => match.confidence === 'weak').length,
    missingColumns: missing.length,
    addedColumns: added.length,
    ambiguousMatches: ambiguous.length,
    usedMissingColumns: usedMissing.length,
    unusedMissingColumns: unusedMissing.length,
    weakUsedMatches: weakUsedMatches.length,
  };
}

function buildMessages({
  sheetExpected,
  sheetSuggested,
  missing,
  added,
  ambiguous,
  matches,
  usedMissing,
  unusedMissing,
  weakUsedMatches,
}: {
  sheetExpected?: string;
  sheetSuggested?: string;
  missing: SourceColumnSnapshot[];
  added: SourceColumnSnapshot[];
  ambiguous: ColumnCompatibilityMatch[];
  matches: ColumnCompatibilityMatch[];
  usedMissing: SourceColumnSnapshot[];
  unusedMissing: SourceColumnSnapshot[];
  weakUsedMatches: ColumnCompatibilityMatch[];
}) {
  const messages: string[] = [];
  if (sheetExpected && sheetSuggested) {
    messages.push(`La hoja "${sheetExpected}" no existe, pero hay una hoja parecida: "${sheetSuggested}".`);
  }

  usedMissing.forEach((column) => {
    const references = matches.find((match) => match.savedColumn.inputColumnId === column.inputColumnId)?.references ?? [];
    messages.push(`La columna "${getColumnDisplayName(column)}" falta y está usada por ${references.length} configuración(es).`);
  });

  unusedMissing.forEach((column) => {
    messages.push(`La columna "${getColumnDisplayName(column)}" falta, pero no está usada por ninguna regla o receta.`);
  });

  if (missing.length > 0 && usedMissing.length === 0 && unusedMissing.length === 0) {
    messages.push(`${missing.length} columna(s) guardada(s) no tienen coincidencia.`);
  }

  if (added.length > 0) {
    messages.push(`${added.length} columna(s) nueva(s) aparecen en el archivo actual.`);
  }

  if (ambiguous.length > 0) {
    messages.push(`${ambiguous.length} columna(s) tienen coincidencias ambiguas.`);
  }

  weakUsedMatches.forEach((match) => {
    messages.push(`La columna "${getColumnDisplayName(match.savedColumn)}" tiene un match débil y está usada; requiere revisión.`);
  });

  const weakMatches = matches.filter((match) => match.confidence === 'weak' && !match.isUsed);
  if (weakMatches.length > 0) {
    messages.push(`${weakMatches.length} columna(s) solo coinciden por posición.`);
  }

  return messages;
}

function buildBlockedResult({
  expectedSheet,
  currentSnapshot,
  message,
  sheetExists,
  suggestedSheet,
}: {
  expectedSheet?: string;
  currentSnapshot: SourceSnapshot;
  message: string;
  sheetExists: boolean;
  suggestedSheet?: string;
}): SettingsCompatibilityResult {
  return {
    status: 'blocked',
    sheet: {
      ...(expectedSheet ? { expectedSheet } : {}),
      ...(currentSnapshot.sheetName ? { currentSheet: currentSnapshot.sheetName } : {}),
      exists: sheetExists,
      ...(suggestedSheet ? { suggestedSheet } : {}),
    },
    columns: {
      matches: [],
      missing: [],
      added: currentSnapshot.columns,
      ambiguous: [],
      usedMissing: [],
      unusedMissing: [],
      weakUsedMatches: [],
    },
    summary: {
      totalSavedColumns: 0,
      totalCurrentColumns: currentSnapshot.columns.length,
      exactMatches: 0,
      strongMatches: 0,
      mediumMatches: 0,
      weakMatches: 0,
      missingColumns: 0,
      addedColumns: currentSnapshot.columns.length,
      ambiguousMatches: 0,
      usedMissingColumns: 0,
      unusedMissingColumns: 0,
      weakUsedMatches: 0,
    },
    messages: [message],
  };
}

function getColumnDisplayName(column: SourceColumnSnapshot) {
  return column.alias || column.header || column.columnLetter;
}

function levenshteinDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, rowIndex) => [rowIndex]);

  for (let columnIndex = 1; columnIndex <= b.length; columnIndex += 1) {
    matrix[0][columnIndex] = columnIndex;
  }

  for (let rowIndex = 1; rowIndex <= a.length; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= b.length; columnIndex += 1) {
      const cost = a[rowIndex - 1] === b[columnIndex - 1] ? 0 : 1;
      matrix[rowIndex][columnIndex] = Math.min(
        matrix[rowIndex - 1][columnIndex] + 1,
        matrix[rowIndex][columnIndex - 1] + 1,
        matrix[rowIndex - 1][columnIndex - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}
