import type { Habit, HabitLog } from './types';
import { addDays, dateKey, daysBetween, daysInMonth, parseKey, todayKey } from './date';

export interface StreakInfo {
  current: number;
  best: number;
}

/** Conjunto de fechas en que un hábito se completó. */
export function doneDatesFor(logs: HabitLog[], habitId: string): Set<string> {
  const set = new Set<string>();
  for (const l of logs) {
    if (l.habitId === habitId && l.done) set.add(l.date);
  }
  return set;
}

export function computeStreak(doneDates: Set<string>): StreakInfo {
  const sorted = [...doneDates].sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev !== null) {
      run = daysBetween(d, prev) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }

  let current = 0;
  let cursor = parseKey(todayKey());
  if (!doneDates.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1); // hoy aún puede completarse
  }
  while (doneDates.has(dateKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, best };
}

export interface MonthlyHabitStat {
  habit: Habit;
  done: number;
  total: number; // días evaluables del mes
  rate: number; // 0..1
  streak: StreakInfo;
}

/** Estadísticas de cumplimiento de todos los hábitos activos para un mes. */
export function monthlyStats(
  habits: Habit[],
  logs: HabitLog[],
  year: number,
  month: number
): MonthlyHabitStat[] {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const isFutureMonth =
    year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  // días evaluables: mes pasado = todos; mes actual = hasta hoy; futuro = 0
  let total: number;
  if (isFutureMonth) total = 0;
  else if (isCurrentMonth) total = now.getDate();
  else total = daysInMonth(year, month);

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  return habits
    .filter((h) => !h.archived && !h.deleted)
    .map((h) => {
      const doneSet = new Set<string>();
      for (const l of logs) {
        if (l.habitId === h.id && l.done && l.date.startsWith(prefix)) doneSet.add(l.date);
      }
      const done = doneSet.size;
      const rate = total > 0 ? done / total : 0;
      const streak = computeStreak(doneDatesFor(logs, h.id));
      return { habit: h, done, total, rate, streak };
    });
}

/** Días con al menos un hábito completado (para el heatmap). */
export function activeDays(logs: HabitLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of logs) {
    if (l.done) map.set(l.date, (map.get(l.date) ?? 0) + 1);
  }
  return map;
}

export interface DaySummary {
  doneCount: number;
  total: number;
  rate: number;
}

export function daySummary(habits: Habit[], logs: HabitLog[], date: string): DaySummary {
  const active = habits.filter((h) => !h.archived && !h.deleted);
  let doneCount = 0;
  for (const h of active) {
    const l = logs.find((x) => x.habitId === h.id && x.date === date);
    if (l && l.done) doneCount++;
  }
  const total = active.length;
  return { doneCount, total, rate: total > 0 ? doneCount / total : 0 };
}

export function bestStreakOverall(stats: MonthlyHabitStat[]): number {
  return stats.reduce((m, s) => Math.max(m, s.streak.best), 0);
}
