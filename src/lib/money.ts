export function parseCents(input: string): bigint {
  const raw = input.trim();
  if (!raw) throw new Error('INVALID_MONEY');
  const hasComma = raw.includes(',');
  const normalized = hasComma ? raw.replaceAll('.', '').replace(',', '.') : raw;
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('INVALID_MONEY');
  const [whole = '0', fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
}

export function centsToInput(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

export function isValidMoneyInput(input: string): boolean {
  try {
    const cents = parseCents(input);
    return cents > 0n && cents <= 999_999_999_999n;
  } catch {
    return false;
  }
}

export function formatEuro(value: string | number | bigint): string {
  const numeric = typeof value === 'bigint' ? Number(value) / 100 : Number(value);
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(numeric);
}

export function normalizeMoneyForRpc(input: string): string {
  const cents = parseCents(input);
  return centsToInput(cents);
}
