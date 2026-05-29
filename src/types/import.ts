export type RawRow = unknown[];

export type OutputCategory = {
  id: string;
  name: string;
  order: number;
  exportable: boolean;
};

export type ColumnMapping = Record<number, string>;

export type TransformationType =
  | 'addPrefix'
  | 'addSuffix'
  | 'removeText'
  | 'replaceText'
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'conditionalPrefix'
  | 'copyColumn'
  | 'combineColumns'
  | 'numericOperation';

export type NumericOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'addPercentage'
  | 'subtractPercentage'
  | 'removeIncludedPercentage';

export type NumericTransformationConfig = {
  operation: NumericOperation;
  amount: number;
  outputMode: 'replace' | 'newColumn';
  outputColumnName?: string;
  outputCategoryId?: string;
  rounding?: 'none' | 0 | 2 | 4;
};

export type TransformationCondition = {
  sourceColumn: string;
  operator: ConditionOperator;
  value?: string;
  valueType?: 'text' | 'number';
};

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

export type TransformationRule = {
  id: string;
  sourceColumn: string;
  targetCategoryId: string;
  type: TransformationType;
  applyToEmptyValues?: boolean;
  value?: string;
  searchValue?: string;
  replaceValue?: string;
  secondarySourceColumn?: string;
  condition?: TransformationCondition;
  numericConfig?: NumericTransformationConfig;
};

export type NormalizedRow = {
  rowNumber: number;
  values: Record<string, string>;
  status: RowStatus;
  ignoredReason?: string;
  warnings?: string[];
  error?: string;
};

export type RowStatus = 'included' | 'ignored' | 'error';

export type RowOverride = {
  status: 'included' | 'ignored';
  reason?: string;
};

export type RowOverrides = Record<number, RowOverride>;

export type IgnoreRule = {
  id: string;
  categoryId: string;
  operator: 'isEmpty' | 'isNotEmpty' | 'contains' | 'notContains' | 'equals' | 'startsWith' | 'endsWith';
  value?: string;
  reason?: string;
};

export type NormalizationSettings = {
  startRowIndex: number;
  columnMapping: ColumnMapping;
  categories: OutputCategory[];
  transformationRules: TransformationRule[];
  activeColumnIndexes?: number[];
};

export type WizardPersistedSettings = {
  columnMapping: ColumnMapping;
  transformationRules: TransformationRule[];
  ignoreRules: IgnoreRule[];
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
};

export type IgnoredReason = 'hidden' | 'narrow' | 'empty' | 'lowData' | 'manual';

export type ColumnAnalysis = {
  columnIndex: number;
  columnLetter: string;
  header?: string;
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
