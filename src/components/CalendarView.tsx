import { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '../types';
import {
  dateKey,
  daysInMonth,
  firstWeekday,
  formatLongDate,
  formatMonth,
  isToday,
  shiftMonth,
  todayKey,
  weekdayLabel
} from '../date';
import { setHabitDone } from '../actions';
import { EmptyState, Pill } from './ui';

export function CalendarView({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayKey());

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived && !h.deleted), [habits]);

  // mapa fecha -> ids de hábitos completados ese día
  const doneByDate = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of logs) {
      if (!l.done) continue;
      if (!m.has(l.date)) m.set(l.date, new Set());
      m.get(l.date)!.add(l.habitId);
    }
    return m;
  }, [logs]);

  const days = useMemo(() => {
    const total = daysInMonth(cursor.year, cursor.month);
    const offset = firstWeekday(cursor.year, cursor.month);
    const cells: Array<{ day: number; key: string } | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      cells.push({ day: d, key: dateKey(new Date(cursor.year, cursor.month, d)) });
    }
    return cells;
  }, [cursor]);

  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(weekdayLabel);

  const selectedDone = doneByDate.get(selected) ?? new Set<string>();

  return (
    <div className="view stack">
      <section className="card">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))}>
            ‹
          </button>
          <h2 className="cal-title">{formatMonth(cursor.year, cursor.month)}</h2>
          <button className="icon-btn" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))}>
            ›
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setCursor({ year: now.getFullYear(), month: now.getMonth() });
              setSelected(todayKey());
            }}
          >
            Hoy
          </button>
        </div>

        <div className="cal-weekdays">
          {weekdays.map((w) => (
            <span key={w} className="cal-weekday">
              {w}
            </span>
          ))}
        </div>

        <div className="cal-grid">
          {days.map((cell, i) =>
            cell === null ? (
              <span key={`e${i}`} className="cal-cell cal-cell--empty" />
            ) : (
              <button
                key={cell.key}
                className={`cal-cell${isToday(cell.key) ? ' is-today' : ''}${
                  selected === cell.key ? ' is-selected' : ''
                }`}
                onClick={() => setSelected(cell.key)}
              >
                <span className="cal-day">{cell.day}</span>
                <span className="cal-dots">
                  {activeHabits.map((h) => {
                    const done = doneByDate.get(cell.key)?.has(h.id);
                    return (
                      <span
                        key={h.id}
                        className={`cal-dot${done ? '' : ' is-off'}`}
                        style={done ? { background: h.color } : undefined}
                      />
                    );
                  })}
                </span>
              </button>
            )
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{formatLongDate(selected)}</h2>
          {isToday(selected) && <Pill tone="success">Hoy</Pill>}
        </div>

        {activeHabits.length === 0 ? (
          <EmptyState icon="🌱" title="Crea hábitos primero" hint="Aparecerán aquí para marcarlos por día." />
        ) : (
          <ul className="checklist">
            {activeHabits.map((h) => {
              const done = selectedDone.has(h.id);
              return (
                <li key={h.id}>
                  <button
                    className={`check-item${done ? ' is-done' : ''}`}
                    onClick={() => setHabitDone(h.id, selected, !done)}
                  >
                    <span className="check-box" style={{ borderColor: h.color }}>
                      {done && <span style={{ background: h.color }}>✓</span>}
                    </span>
                    <span className="check-icon">{h.icon}</span>
                    <span className="check-name">{h.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
