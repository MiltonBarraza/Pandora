import { describe, expect, it } from 'vitest';
import { normalizeNumberInputOnBlur, normalizeNumberInputWhileTyping, parseOptionalNumberInput, parseStartRowInputWhileEditing } from '../numberInput';

describe('parseOptionalNumberInput', () => {
  it('keeps empty and invalid editing states out of numeric state', () => {
    expect(parseOptionalNumberInput('')).toBeUndefined();
    expect(parseOptionalNumberInput('   ')).toBeUndefined();
    expect(parseOptionalNumberInput('-')).toBeUndefined();
    expect(parseOptionalNumberInput('not-a-number')).toBeUndefined();
  });

  it('parses finite values including zero', () => {
    expect(parseOptionalNumberInput('0')).toBe(0);
    expect(parseOptionalNumberInput('12.5')).toBe(12.5);
  });
});

describe('normalizeNumberInputWhileTyping', () => {
  it('replaces an existing zero when one digit is inserted around it', () => {
    expect(normalizeNumberInputWhileTyping('0', '07')).toBe('7');
    expect(normalizeNumberInputWhileTyping('0', '70')).toBe('7');
  });

  it('preserves empty, decimal, and established multi-digit values', () => {
    expect(normalizeNumberInputWhileTyping('0', '')).toBe('');
    expect(normalizeNumberInputWhileTyping('0', '0.5')).toBe('0.5');
    expect(normalizeNumberInputWhileTyping('10', '105')).toBe('105');
  });
});

describe('normalizeNumberInputOnBlur', () => {
  it('uses the fallback for an empty input and applies integer bounds', () => {
    expect(normalizeNumberInputOnBlur('', { fallback: 4, min: 1, integer: true })).toBe(4);
    expect(normalizeNumberInputOnBlur('0', { fallback: 4, min: 1, integer: true })).toBe(1);
    expect(normalizeNumberInputOnBlur('8.9', { fallback: 4, min: 1, max: 6, integer: true })).toBe(6);
  });

  it('never returns NaN when the fallback is invalid', () => {
    expect(normalizeNumberInputOnBlur('invalid', { fallback: Number.NaN })).toBe(0);
  });
});

describe('parseStartRowInputWhileEditing', () => {
  it('accepts only positive integer values while keeping empty or invalid edits unapplied', () => {
    expect(parseStartRowInputWhileEditing('8')).toBe(8);
    expect(parseStartRowInputWhileEditing('08')).toBe(8);
    expect(parseStartRowInputWhileEditing(' 12 ')).toBe(12);
    expect(parseStartRowInputWhileEditing('')).toBeUndefined();
    expect(parseStartRowInputWhileEditing('0')).toBeUndefined();
    expect(parseStartRowInputWhileEditing('-1')).toBeUndefined();
    expect(parseStartRowInputWhileEditing('1.5')).toBeUndefined();
    expect(parseStartRowInputWhileEditing('abc')).toBeUndefined();
  });
});
