import { describe, expect, it } from 'vitest';

function next(frequency: string, date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === 'monthly') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 2).padStart(2, '0')}-01`;
  else if (frequency === 'quarterly') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 4).padStart(2, '0')}-01`;
  else if (frequency === 'semiannual') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 7).padStart(2, '0')}-01`;
  else return `${d.getUTCFullYear() + 1}-01-01`;
  return d.toISOString().slice(0, 10);
}

describe('reglas de recurrencia', () => {
  it('semanal suma 7 días', () => expect(next('weekly', '2026-09-27')).toBe('2026-10-04'));
  it('mensual usa el día 1', () => expect(next('monthly', '2026-02-28')).toBe('2026-03-01'));
  it('trimestral usa el día 1 tres meses después', () => expect(next('quarterly', '2026-02-28')).toBe('2026-05-01'));
  it('semestral usa el día 1 seis meses después', () => expect(next('semiannual', '2026-02-28')).toBe('2026-08-01'));
  it('anual usa el 1 de enero siguiente', () => expect(next('annual', '2026-02-28')).toBe('2027-01-01'));
});
