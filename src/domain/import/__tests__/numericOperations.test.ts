import { describe, expect, it } from 'vitest';
import { applyNumericOperation, formatNumericResult, parseNumericValue } from '../numericOperations';

describe('numericOperations', () => {
  it('parses currency and numeric formats', () => {
    expect(parseNumericValue('$ 200')).toBe(200);
    expect(parseNumericValue('$200,50')).toBe(200.5);
    expect(parseNumericValue('200.50')).toBe(200.5);
    expect(parseNumericValue('1.200,75')).toBe(1200.75);
    expect(parseNumericValue('1,200.75')).toBe(1200.75);
    expect(parseNumericValue('abc')).toBeNull();
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
    expect(formatNumericResult(200, 2)).toBe('200');
    expect(formatNumericResult(200.126, 2)).toBe('200.13');
    expect(formatNumericResult(200.126, 0)).toBe('200');
    expect(formatNumericResult(200.12346, 4)).toBe('200.1235');
    expect(formatNumericResult(200.126, 'none')).toBe('200.126');
  });
});
