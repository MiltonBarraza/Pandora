export function canDiscardWizardConfiguration(isDirty: boolean, confirmDiscard: () => boolean) {
  return !isDirty || confirmDiscard();
}
