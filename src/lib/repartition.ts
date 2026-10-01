import { parseCents } from './money';

export interface SplitLine { userId: string; cents: bigint }

export function splitEqual(amountInput: string, userIds: string[]): SplitLine[] {
  const cents = parseCents(amountInput);
  const sorted = [...new Set(userIds)].sort();
  if (sorted.length === 0) return [];
  const base = cents / BigInt(sorted.length);
  const remainder = cents % BigInt(sorted.length);
  return sorted.map((userId, index) => ({ userId, cents: base + (BigInt(index) < remainder ? 1n : 0n) }));
}
