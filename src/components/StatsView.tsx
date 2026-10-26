import { useMemo } from 'react';
import type { Habit, HabitLog } from '../types';
import { activeDays, monthlyStats } from '../stats';
import { addDays, dateKey, formatMonth, parseKey, todayKey } from '../date';
import { EmptyState, Pill, ProgressBar } from './ui';

const WEEKS = 15;

function heatLevel(count: number, total: number): number {
  if (count === 0) return 0;
  const r = count / Math.max(1, total);
  if (r >= 0.75) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.25) return 2;
  return 1;
}

export function StatsView({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const active = useMemo(() => habits.filter((h) => !h.archived && !h.deleted), [habits]);
  const now = new Date();
  const monthStats = useMemo(() => monthlyStats(habits, logs, now.getFullYear(), now.getMonth()), [habits, logs, now]);

  const heat = useMemo(() => {
    const today = parseKey(todayKey());
    const mondayOffset = (today.getDay() + 6) % 7;
    const lastMonday = addDays(today, -mondayOffset);
    const start = addDays(lastMonday, -(WEEKS - 1) * 7);
    const counts = activeDays(logs);
    const cells: Array<{ key: string; level: number; count: number } | null> = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = addDays(start, i);
      if (d.getTime() > today.getTime()) {
        cells.push(null);
        continue;
      }
      const k = dateKey(d);
      const count = counts.get(k) ?? 0;
      cells.push({ key: k, level: heatLevel(count, active.length), count });
    }
    // etiquetas de mes por columna (semana)
    const monthLabels: Array<{ index: number; label: string }> = [];
    for (let w = 0; w < WEEKS; w++) {
      const d = addDays(start, w * 7);
      const label = new Intl.DateTimeFormat('es', { month: 'short' }).format(d);
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || prev.label !== label) {
        monthLabels.push({ index: w, label });
      }
    }
    return { cells, monthLabels };
  }, [logs, active.length]);

  const totals = useMemo(() => {
    const done = monthStats.reduce((s, m) => s + m.done, 0);
    const possible = monthStats.reduce((s, m) => s + m.total, 0);
    const rate = possible > 0 ? done / possible : 0;
    const activeThisMonth = monthStats.filter((m) => m.done > 0).length;
    const bestStreak = monthStats.reduce((s, m) => Math.max(s, m.streak.best), 0);
    return { done, possible, rate, activeThisMonth, bestStreak };
  }, [monthStats]);

  if (active.length === 0) {
    return (
      <div className="view stack">
        <EmptyState icon="📊" title="Sin datos todavía" hint="Crea hábitos y márcalos para ver tus estadísticas." />
      </div>
    );
  }

  return (
    <div className="view stack">
      <section className="stat-grid">
        <div className="stat-card card">
          <span className="stat-value">{Math.round(totals.rate * 100)}%</span>
          <span className="stat-label">Cumplimiento este mes</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">🔥 {totals.bestStreak}</span>
          <span className="stat-label">Mejor racha</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{totals.activeThisMonth}</span>
          <span className="stat-label">Hábitos activos</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Actividad · últimos {WEEKS * 7} días</h2>
        </div>
        <div className="heatmap">
          <div className="heat-months">
            {heat.monthLabels.map((m) => (
              <span key={m.index} style={{ gridColumn: m.index + 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="heat-grid">
            {heat.cells.map((c, i) =>
              c === null ? (
                <span key={i} className="heat-cell heat-cell--empty" />
              ) : (
                <span
                  key={c.key}
                  className={`heat-cell heat-cell--l${c.level}`}
                  title={`${c.count} hábito${c.count === 1 ? '' : 's'} · ${c.key}`}
                />
              )
            )}
          </div>
          <div className="heat-legend">
            <span>Menos</span>
            <span className="heat-cell heat-cell--l0" />
            <span className="heat-cell heat-cell--l1" />
            <span className="heat-cell heat-cell--l2" />
            <span className="heat-cell heat-cell--l3" />
            <span className="heat-cell heat-cell--l4" />
            <span>Más</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{formatMonth(now.getFullYear(), now.getMonth())}</h2>
          <Pill tone="muted">{totals.done} / {totals.possible} marcados</Pill>
        </div>
        <ul className="stat-list">
          {monthStats
            .slice()
            .sort((a, b) => b.rate - a.rate)
            .map((m) => (
              <li key={m.habit.id} className="stat-row">
                <div className="stat-row-head">
                  <span className="stat-row-name">
                    {m.habit.icon} {m.habit.name}
                  </span>
                  <span className="stat-row-pct">{Math.round(m.rate * 100)}%</span>
                </div>
                <ProgressBar value={m.rate} color={m.habit.color} />
                <div className="stat-row-meta">
                  <span>{m.done} de {m.total} días</span>
                  <span>🔥 racha {m.streak.current} · mejor {m.streak.best}</span>
                </div>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
