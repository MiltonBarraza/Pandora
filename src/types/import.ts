export type RawRow = unknown[];

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
  | 'numericOperation';

export type TransformStepMode = 'text' | 'number' | 'conversion';

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
  operator: 'isEmpty' | 'isNotEmpty' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith';
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
