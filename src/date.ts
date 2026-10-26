export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Lunes = 0 ... Domingo = 6 (semana empieza en lunes, habitual en España)
export function firstWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function shiftMonth(
  year: number,
  month: number,
  n: number
): { year: number; month: number } {
  const d = new Date(year, month + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MONTH_FMT = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
export function formatMonth(year: number, month: number): string {
  const s = MONTH_FMT.format(new Date(year, month, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DAY_FMT = new Intl.DateTimeFormat('es', { weekday: 'short' });
export function weekdayLabel(day: number): string {
  // day: 0=Lunes ... 6=Domingo
  const sun = new Date(2024, 0, 7); // un domingo
  const d = addDays(sun, day);
  const s = DAY_FMT.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatLongDate(key: string): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(parseKey(key));
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(
    parseKey(key)
  );
}

export function isToday(key: string): boolean {
  return key === todayKey();
}

export function isPast(key: string): boolean {
  return key < todayKey();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86400000);
}
