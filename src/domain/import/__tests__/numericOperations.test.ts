import { describe, expect, it } from 'vitest';
import { applyNumericOperation, extractNumericValue, formatNumericResult, parseNumericValue } from '../numericOperations';

describe('numericOperations', () => {
  it('parses currency and numeric formats', () => {
    expect(parseNumericValue('$ 200')).toBe(200);
    expect(parseNumericValue('$200,50')).toBe(200.5);
    expect(parseNumericValue('200.50')).toBe(200.5);
    expect(parseNumericValue('1.200,75')).toBe(1200.75);
    expect(parseNumericValue('1,200.75')).toBe(1200.75);
    expect(parseNumericValue('abc')).toBeNull();
    expect(parseNumericValue('ABC123')).toBeNull();
  });

  it('extracts the first number only when requested explicitly', () => {
    expect(extractNumericValue('hay 25 personas')).toBe(25);
    expect(extractNumericValue('precio $ 47,451.90')).toBe(47451.9);
    expect(extractNumericValue('ABC123')).toBe(123);
    expect(extractNumericValue('sin numeros')).toBeNull();
  });

  it('applies numeric operations', () => {
    expect(applyNumericOperation(200, 'add', 50)).toBe(250);
    expect(applyNumericOperation(200, 'subtract', 50)).toBe(150);
    expect(applyNumericOperation(200, 'multiply', 1.21)).toBe(242);
    expect(applyNumericOperation(200, 'divide', 2)).toBe(100);
    expect(applyNumericOperation(200, 'addPercentage', 10)).toBeCloseTo(220);
    expect(applyNumericOperation(200, 'subtractPercentage', 10)).toBe(180);
    expect(applyNumericOperation(242, 'removeIncludedPercentage', 21)).toBeCloseTo(200);
  });

  it('formats numeric results with rounding', () => {
    expect(formatNumericResult(200, 2)).toBe('200.00');
    expect(formatNumericResult(200.126, 2)).toBe('200.13');
    expect(formatNumericResult(200.126, 0)).toBe('200');
    expect(formatNumericResult(200.12346, 4)).toBe('200.1235');
    expect(formatNumericResult(200.126, 'none')).toBe('200.126');
  });

  it('keeps fixed decimal places for numeric operation results', () => {
    const result = applyNumericOperation(43138.09, 'addPercentage', 10);

    expect(formatNumericResult(result, 'none')).toBe('47451.899');
    expect(formatNumericResult(result, 0)).toBe('47452');
    expect(formatNumericResult(result, 2)).toBe('47451.90');
    expect(formatNumericResult(result, 4)).toBe('47451.8990');
  });

  it('keeps pure numeric output without presentation formatting', () => {
    const result = applyNumericOperation(43138.09, 'addPercentage', 10);

    expect(formatNumericResult(result, 2)).toBe('47451.90');
    expect(formatNumericResult(result, 0)).toBe('47452');
    expect(formatNumericResult(result, 4)).toBe('47451.8990');
  });
});
