import { describe, expect, it } from 'vitest';
import { formatEuro, isValidMoneyInput, parseCents } from './money';

describe('dinero', () => {
  it('acepta coma decimal', () => expect(parseCents('1.250,50')).toBe(125050n));
  it('rechaza más de dos decimales', () => expect(isValidMoneyInput('10,999')).toBe(false));
  it('formatea EUR en español', () => expect(formatEuro('1250.5')).toContain('1.250,50')); 
});
