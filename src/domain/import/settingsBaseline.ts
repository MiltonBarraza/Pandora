import type { ExportedImportSettings } from '../../types/import';

export type SaveBeforeDownloadChoice = 'save' | 'skip' | 'cancel';

export function createSettingsComparisonKey(settings: ExportedImportSettings) {
  return stableStringify(settings.config);
}

export function hasRelevantSettingsChanges(currentKey: string | null, baselineKeys: Array<string | undefined>) {
  if (!currentKey) {
    return false;
  }

  const validBaselines = baselineKeys.filter((baseline): baseline is string => Boolean(baseline));
  if (validBaselines.length === 0) {
    return true;
  }

  return !validBaselines.includes(currentKey);
}

export async function shouldDownloadAfterSaveChoice(
  choice: SaveBeforeDownloadChoice,
  saveSettings: () => boolean | Promise<boolean>,
) {
  if (choice === 'skip') {
    return true;
  }

  if (choice === 'cancel') {
    return false;
  }

  return saveSettings();
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortSerializable(value));
}

function sortSerializable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortSerializable);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortSerializable(child)]),
    );
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
