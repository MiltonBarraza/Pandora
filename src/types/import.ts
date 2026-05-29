export type RawRow = unknown[];

export type OutputCategory = {
  id: string;
  name: string;
  order: number;
  exportable: boolean;
};

export type ColumnMapping = Record<number, string>;

export type InputColumn = {
  id: string;
  columnIndex: number;
  columnLetter: string;
  label: string;
  header?: string;
  active: boolean;
  sampleValues: string[];
  nonEmptyCount: number;
  ignoredReason?: IgnoredReason;
};

export type InputRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type TransformStepType =
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'addPrefix'
  | 'addSuffix'
  | 'removeText'
  | 'replaceText'
  | 'numericOperation';

export type TransformStep = {
  id: string;
  type: TransformStepType;
  value?: string;
  searchValue?: string;
  replaceValue?: string;
  operation?: NumericOperation;
  amount?: number;
  rounding?: 'none' | 0 | 2 | 4;
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
    }
  | {
      id: string;
      type: 'text';
      value: string;
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
    };

export type OutputColumn = {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  legacyCategoryId?: string;
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
  operator: 'isEmpty' | 'isNotEmpty' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith';
  value?: string;
  reason?: string;
  categoryId?: string;
};

export type WizardPersistedSettings = {
  columnMapping?: ColumnMapping;
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
