import { useMemo } from 'react';
import type { Habit, HabitLog, Task } from '../types';
import { formatLongDate, isPast, todayKey } from '../date';
import { computeStreak, doneDatesFor } from '../stats';
import { toggleHabit, toggleTask } from '../actions';
import { EmptyState, Pill, Ring } from './ui';

export function Today({
  habits,
  logs,
  tasks,
  onOpenHabits,
  onOpenAgenda
}: {
  habits: Habit[];
  logs: HabitLog[];
  tasks: Task[];
  onOpenHabits: () => void;
  onOpenAgenda: () => void;
}) {
  const today = todayKey();
  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived && !h.deleted),
    [habits]
  );

  const doneCount = useMemo(() => {
    let n = 0;
    for (const h of activeHabits) {
      const l = logs.find((x) => x.habitId === h.id && x.date === today);
      if (l && l.done) n++;
    }
    return n;
  }, [activeHabits, logs, today]);

  const rate = activeHabits.length > 0 ? doneCount / activeHabits.length : 0;

  const todayTasks = useMemo(
    () => tasks.filter((t) => !t.deleted && !t.done && t.dueDate === today),
    [tasks, today]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((t) => !t.deleted && !t.done && t.dueDate && isPast(t.dueDate)),
    [tasks]
  );

  const topStreak = useMemo(() => {
    let best = 0;
    let bestHabit: Habit | null = null;
    for (const h of activeHabits) {
      const s = computeStreak(doneDatesFor(logs, h.id));
      if (s.current > best) {
        best = s.current;
        bestHabit = h;
      }
    }
    return { best, bestHabit };
  }, [activeHabits, logs]);

  return (
    <div className="view stack">
      <section className="hero card">
        <div className="hero-left">
          <p className="hero-date">{formatLongDate(today)}</p>
          <h1 className="hero-title">Tus hábitos de hoy</h1>
          <p className="hero-sub">
            {doneCount} de {activeHabits.length} completados
          </p>
          {activeHabits.length === 0 && (
            <button className="btn btn--primary" onClick={onOpenHabits}>
              + Crear mi primer hábito
            </button>
          )}
        </div>
        <Ring value={rate} />
      </section>

      {activeHabits.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Hoy</h2>
            <button className="link-btn" onClick={onOpenHabits}>
              Gestionar
            </button>
          </div>
          <ul className="checklist">
            {activeHabits.map((h) => {
              const log = logs.find((x) => x.habitId === h.id && x.date === today);
              const done = !!log?.done;
              const streak = computeStreak(doneDatesFor(logs, h.id));
              return (
                <li key={h.id}>
                  <button
                    className={`check-item${done ? ' is-done' : ''}`}
                    onClick={() => toggleHabit(h.id, today)}
                  >
                    <span className="check-box" style={{ borderColor: h.color }}>
                      {done && <span style={{ background: h.color }}>✓</span>}
                    </span>
                    <span className="check-icon">{h.icon}</span>
                    <span className="check-name">{h.name}</span>
                    {streak.current > 0 && (
                      <span className="check-streak" title="Racha actual">
                        🔥 {streak.current}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Agenda de hoy</h2>
          <button className="link-btn" onClick={onOpenAgenda}>
            Ver agenda
          </button>
        </div>
        {(todayTasks.length > 0 || overdueTasks.length > 0) && (
          <ul className="checklist">
            {overdueTasks.map((t) => (
              <li key={t.id}>
                <button className="check-item" onClick={() => toggleTask(t.id)}>
                  <span className="check-box check-box--danger">!</span>
                  <span className="check-name">{t.title}</span>
                  <Pill tone="danger">Atrasada</Pill>
                </button>
              </li>
            ))}
            {todayTasks.map((t) => (
              <li key={t.id}>
                <button className="check-item" onClick={() => toggleTask(t.id)}>
                  <span className="check-box check-box--task" />
                  <span className="check-name">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {todayTasks.length === 0 && overdueTasks.length === 0 && (
          <EmptyState
            icon="🗓️"
            title="Sin tareas para hoy"
            hint="Añade tareas en la pestaña Agenda."
            action={
              <button className="btn btn--ghost" onClick={onOpenAgenda}>
                Ir a Agenda
              </button>
            }
          />
        )}
      </section>

      {activeHabits.length > 0 && (
        <section className="stat-grid">
          <div className="stat-card card">
            <span className="stat-value">🔥 {topStreak.best}</span>
            <span className="stat-label">Mejor racha</span>
            <span className="stat-sub">
              {topStreak.bestHabit ? topStreak.bestHabit.icon + ' ' + topStreak.bestHabit.name : '—'}
            </span>
          </div>
          <div className="stat-card card">
            <span className="stat-value">✓ {doneCount}</span>
            <span className="stat-label">Completados hoy</span>
          </div>
          <div className="stat-card card">
            <span className="stat-value">
              {todayTasks.length + overdueTasks.length}
            </span>
            <span className="stat-label">Tareas pendientes</span>
          </div>
        </section>
      )}
    </div>
  );
}
