export type RawRow = unknown[];

export type SheetRowMetadata = {
  internalRowIndex: number;
  excelRowNumber: number;
};

export type SheetRowsWithMetadata = {
  rows: RawRow[];
  rowMetadata: SheetRowMetadata[];
};

export type InputColumn = {
  id: string;
  columnIndex: number;
  columnLetter: string;
  label: string;
  header?: string;
  alias?: string;
  active: boolean;
  sampleValues: string[];
  nonEmptyCount: number;
  ignoredReason?: IgnoredReason;
};

export type InputRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type IgnoredInputRow = {
  rowNumber: number;
  inputValues: Record<string, string>;
  ignoredReason: string;
};

export type TransformStepType =
  | 'noop'
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'addPrefix'
  | 'addSuffix'
  | 'removeText'
  | 'replaceText'
  | 'concat'
  | 'extractNumber'
  | 'toNumber'
  | 'toText'
  | 'formatDate'
  | 'manualRange'
  | 'numericOperation';

export type TransformStepMode = 'text' | 'number' | 'conversion' | 'date';

export type DateInputFormat =
  | 'DD/MM/YYYY'
  | 'D/M/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'M/D/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD'
  | 'DD/MM/YY'
  | 'D/M/YY'
  | 'MM/DD/YY'
  | 'M/D/YY';

export type DateOutputFormat =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY/MM/DD';

export type DateInvalidFallback = 'empty' | 'original' | 'fixedText';

export type StepSource =
  | {
      type: 'previousResult';
    }
  | {
      type: 'input';
      inputColumnId: string;
    }
  | {
      type: 'fixedText';
      value: string;
    };

export type StepOperand = StepSource & {
  numericFallback?: number;
};

export type ConcatPart = {
  id: string;
  source: StepSource;
  separatorBefore?: string;
  steps?: TransformStep[];
};

export type TransformStep = {
  id: string;
  mode?: TransformStepMode;
  type: TransformStepType;
  source?: StepSource;
  value?: string;
  searchValue?: string;
  replaceValue?: string;
  operation?: NumericOperation;
  amount?: number;
  leftOperand?: StepOperand;
  rightOperand?: StepOperand;
  parts?: ConcatPart[];
  rounding?: 'none' | 0 | 2 | 4;
  dateInputFormat?: DateInputFormat;
  dateOutputFormat?: DateOutputFormat;
  dateInvalidFallback?: DateInvalidFallback;
  dateInvalidFallbackText?: string;
  ranges?: ManualRangeValue[];
  manualRangeCondition?: ManualRangeCondition;
  condition?: TransformCondition;
  applyToEmptyValues?: boolean;
};

export type ConditionTarget = 'input' | 'output';

export type TransformCondition = {
  target: ConditionTarget;
  columnId: string;
  operator: ConditionOperator;
  value?: string;
  valueType?: 'text' | 'number';
};

export type RecipePart =
  | {
      id: string;
      type: 'input';
      inputColumnId: string;
      steps?: TransformStep[];
      separatorAfter?: string;
    }
  | {
      id: string;
      type: 'text';
      value: string;
      steps?: TransformStep[];
      separatorAfter?: string;
    };

export type CustomValueMode = 'number' | 'text' | 'concat';

export type ManualRangeCondition = {
  inputColumnId: string;
  operator: 'isEmpty' | 'isNotEmpty';
};

export type ManualRangeValueSource =
  | {
      type: 'fixedText';
      value: string;
    }
  | {
      type: 'rangeText';
      inputColumnId: string;
      selectedText: string;
    };

export type ManualRangeValue = {
  id: string;
  startRowNumber: number;
  endRowNumber: number;
  valueSource?: ManualRangeValueSource;
  value?: string;
};

export type OutputRecipe =
  | {
      type: 'direct';
      inputColumnId: string;
      steps?: TransformStep[];
    }
  | {
      type: 'empty';
    }
  | {
      type: 'fixedText';
      value: string;
      steps?: TransformStep[];
    }
  | {
      type: 'combine';
      parts: RecipePart[];
      separator?: string;
      steps?: TransformStep[];
      customMode?: CustomValueMode;
    }
  | {
      type: 'manualRange';
      ranges: ManualRangeValue[];
      condition?: ManualRangeCondition;
    };

export type OutputColumn = {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  recipe: OutputRecipe;
};

export type ProcessedRow = {
  rowNumber: number;
  inputValues: Record<string, string>;
  outputValues: Record<string, string>;
  status: RowStatus;
  ignoredReason?: string;
  warnings?: string[];
  error?: string;
};

export type NumericOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'addPercentage'
  | 'subtractPercentage'
  | 'removeIncludedPercentage';

export type ConditionOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'numericEquals'
  | 'numericNotEquals';

export type RowStatus = 'included' | 'ignored' | 'error';

export type RowOverride = {
  status: 'included' | 'ignored';
  reason?: string;
};

export type RowOverrides = Record<number, RowOverride>;

export type IgnoreRule = {
  id: string;
  target: 'input' | 'output';
  columnId: string;
  operator: '' | 'isEmpty' | 'isNotEmpty' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith';
  value?: string;
};

export type WizardPersistedSettings = {
  ignoreRules?: IgnoreRule[];
  inputIgnoreRules?: IgnoreRule[];
  outputIgnoreRules?: IgnoreRule[];
  inputColumnAliases: Record<string, string>;
};

export type FileNameMode = 'default' | 'custom';

export type FileNameSettings = {
  mode: FileNameMode;
  customName: string;
  baseText: string;
  includeBaseText: boolean;
  includeOriginalName: boolean;
  includeSheetName: boolean;
  includeDate: boolean;
  includeTime?: boolean;
};

export type IgnoredReason = 'hidden' | 'narrow' | 'empty' | 'lowData' | 'manual';

export type ColumnAnalysis = {
  columnIndex: number;
  columnLetter: string;
  header?: string;
  alias?: string;
  sampleValues: string[];
  nonEmptyCount: number;
  isHidden?: boolean;
  width?: number;
  isNarrow?: boolean;
  isEmpty: boolean;
  ignored: boolean;
  ignoredReason?: IgnoredReason;
  autoIgnored: boolean;
  autoIgnoredReason?: IgnoredReason;
};

export type ColumnDetectionOptions = {
  hideHiddenColumns: boolean;
  hideNarrowColumns: boolean;
  hideEmptyColumns: boolean;
  hideLowDataColumns: boolean;
  narrowWpxThreshold: number;
  narrowWchThreshold: number;
  lowDataMinValues: number;
};

export type ExportedImportSettings = {
  schemaVersion: 1;
  app: 'excel-sanitizer';
  exportedAt: string;
  name?: string;
  sourceSnapshot: SourceSnapshot;
  config: {
    selectedSheet?: string;
    headerRowIndex: number | null;
    startRowIndex: number;
    showRawPreviewFromDataStart?: boolean;
    showAllRawPreviewColumns?: boolean;
    columnVisibility: SavedInputColumnConfig[];
    inputColumnAliases: Record<string, string>;
    inputIgnoreRules: IgnoreRule[];
    outputColumns: OutputColumn[];
    outputIgnoreRules: IgnoreRule[];
    fileNameSettings: FileNameSettings;
  };
};

export type SourceSnapshot = {
  fileType: 'spreadsheet' | 'csv';
  sheetName?: string;
  sheetNames?: string[];
  rowCount: number;
  headerRowIndex: number | null;
  startRowIndex: number;
  columns: SourceColumnSnapshot[];
};

export type SourceColumnSnapshot = {
  inputColumnId: string;
  columnIndex: number;
  columnLetter: string;
  header?: string;
  alias?: string;
  active: boolean;
  ignoredReason?: IgnoredReason;
  sampleValues: string[];
  nonEmptyCount: number;
  fingerprint: string;
};

export type SavedInputColumnConfig = {
  inputColumnId: string;
  columnIndex: number;
  columnLetter: string;
  header?: string;
  alias?: string;
  active: boolean;
  ignoredReason?: IgnoredReason;
};

export type SettingsCompatibilityStatus = 'compatible' | 'warning' | 'needsRemap' | 'blocked';

export type ColumnMatchConfidence = 'exact' | 'strong' | 'medium' | 'weak' | 'none';

export type ColumnCompatibilityMatch = {
  savedColumn: SourceColumnSnapshot;
  currentColumn?: SourceColumnSnapshot;
  confidence: ColumnMatchConfidence;
  reason: string;
  isUsed?: boolean;
  references?: SettingsColumnReference[];
};

export type SettingsCompatibilityResult = {
  status: SettingsCompatibilityStatus;
  sheet: {
    expectedSheet?: string;
    currentSheet?: string;
    exists: boolean;
    suggestedSheet?: string;
  };
  columns: {
    matches: ColumnCompatibilityMatch[];
    missing: SourceColumnSnapshot[];
    added: SourceColumnSnapshot[];
    ambiguous: ColumnCompatibilityMatch[];
    usedMissing: SourceColumnSnapshot[];
    unusedMissing: SourceColumnSnapshot[];
    weakUsedMatches: ColumnCompatibilityMatch[];
  };
  summary: {
    totalSavedColumns: number;
    totalCurrentColumns: number;
    exactMatches: number;
    strongMatches: number;
    mediumMatches: number;
    weakMatches: number;
    missingColumns: number;
    addedColumns: number;
    ambiguousMatches: number;
    usedMissingColumns: number;
    unusedMissingColumns: number;
    weakUsedMatches: number;
  };
  messages: string[];
};

export type SettingsReferenceKind =
  | 'outputColumn'
  | 'directRecipe'
  | 'recipePart'
  | 'transformStepSource'
  | 'transformStepOperand'
  | 'concatPartSource'
  | 'concatPartTransform'
  | 'manualRangeValueSource'
  | 'condition'
  | 'inputIgnoreRule'
  | 'outputIgnoreRule';

export type SettingsColumnReference = {
  columnId: string;
  target: 'input' | 'output';
  kind: SettingsReferenceKind;
  path: string;
  outputColumnId?: string;
  stepId?: string;
  partId?: string;
  ruleId?: string;
};

export type SettingsReferencesSummary = {
  inputColumnIds: string[];
  outputColumnIds: string[];
  references: SettingsColumnReference[];
  referencesByColumnId: Record<string, SettingsColumnReference[]>;
};

export type InputColumnRemap = Record<string, string>;

export type SettingsRemapResult = {
  settings: ExportedImportSettings;
  changedReferences: SettingsColumnReference[];
  unresolvedReferences: SettingsColumnReference[];
};

export type ParseImportSettingsResult =
  | {
      ok: true;
      settings: ExportedImportSettings;
    }
  | {
      ok: false;
      error: string;
    };

export type ImportedSettingsApplyPayload = {
  selectedSheet?: string;
  headerRowIndex: number | null;
  startRowIndex: number;
  showRawPreviewFromDataStart?: boolean;
  showAllRawPreviewColumns?: boolean;
  inputColumnAliases: Record<string, string>;
  columnVisibility: SavedInputColumnConfig[];
  inputIgnoreRules: IgnoreRule[];
  outputColumns: OutputColumn[];
  outputIgnoreRules: IgnoreRule[];
  fileNameSettings: FileNameSettings;
};

export type ImportedSettingsApplyResult =
  | {
      ok: true;
      payload: ImportedSettingsApplyPayload;
    }
  | {
      ok: false;
      error: string;
    };
