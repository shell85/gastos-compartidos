import { describe, expect, it } from 'vitest';
import { splitEqual } from './repartition';
import { centsToInput, parseCents } from './money';

describe('reparto determinista', () => {
  it('reparte 600 entre dos usuarios', () => {
    const result = splitEqual('600,00', ['b', 'a']);
    expect(result.map((item) => [item.userId, centsToInput(item.cents)])).toEqual([
      ['a', '300.00'],
      ['b', '300.00']
    ]);
  });

  it('reparte céntimos sobrantes por UUID', () => {
    const result = splitEqual('100', ['user-c', 'user-a', 'user-b']);
    expect(result.map((item) => item.cents)).toEqual([3334n, 3333n, 3333n]);
  });

  it('conserva exactamente el total', () => {
    const result = splitEqual('100,01', ['a', 'b', 'c', 'd']);
    expect(result.reduce((sum, item) => sum + item.cents, 0n)).toBe(parseCents('100,01'));
  });
});
