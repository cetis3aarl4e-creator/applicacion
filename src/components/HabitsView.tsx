import { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '../types';
import { HABIT_COLORS, HABIT_ICONS } from '../types';
import { computeStreak, doneDatesFor } from '../stats';
import { archiveHabit, createHabit, deleteHabit, updateHabit } from '../actions';
import { EmptyState, Modal, Pill, ProgressBar } from './ui';

export function HabitsView({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  const active = useMemo(() => habits.filter((h) => !h.archived && !h.deleted), [habits]);
  const archived = useMemo(() => habits.filter((h) => h.archived && !h.deleted), [habits]);

  const statsById = useMemo(() => {
    const m = new Map<string, { streak: number; monthDone: number; monthTotal: number }>();
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthDays = now.getDate();
    for (const h of active) {
      const dates = doneDatesFor(logs, h.id);
      const streak = computeStreak(dates).current;
      let monthDone = 0;
      for (const d of dates) if (d.startsWith(prefix)) monthDone++;
      m.set(h.id, { streak, monthDone, monthTotal: monthDays });
    }
    return m;
  }, [active, logs]);

  return (
    <div className="view stack">
      <div className="card-head">
        <h2 className="section-title">Mis hábitos</h2>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          + Nuevo
        </button>
      </div>

      {active.length === 0 && (
        <EmptyState
          icon="🌱"
          title="Aún no tienes hábitos"
          hint="Crea uno y empieza tu racha hoy."
          action={
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              Crear hábito
            </button>
          }
        />
      )}

      <ul className="habit-list">
        {active.map((h) => {
          const s = statsById.get(h.id);
          return (
            <li key={h.id} className="card habit-row">
              <div className="habit-row-top">
                <span className="habit-avatar" style={{ background: h.color + '22', color: h.color }}>
                  {h.icon}
                </span>
                <div className="habit-info">
                  <span className="habit-name">{h.name}</span>
                  <span className="habit-meta">
                    <span className="dot" style={{ background: h.color }} /> Diario
                  </span>
                </div>
                <div className="habit-actions">
                  <button className="icon-btn" title="Editar" onClick={() => setEditing(h)}>
                    ✏️
                  </button>
                  <button
                    className="icon-btn"
                    title="Archivar"
                    onClick={() => archiveHabit(h.id, true)}
                  >
                    📦
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Eliminar"
                    onClick={() => {
                      if (confirm(`¿Eliminar «${h.name}» y su historial?`)) deleteHabit(h.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="habit-row-bottom">
                <Pill tone={s && s.streak > 0 ? 'success' : 'muted'}>
                  🔥 {s?.streak ?? 0} racha
                </Pill>
                <div className="habit-progress">
                  <ProgressBar value={(s?.monthDone ?? 0) / (s?.monthTotal || 1)} color={h.color} />
                  <span className="habit-progress-label">
                    {s?.monthDone ?? 0}/{s?.monthTotal ?? 0} este mes
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Archivados</h2>
          </div>
          <ul className="habit-list habit-list--muted">
            {archived.map((h) => (
              <li key={h.id} className="habit-row">
                <span className="habit-avatar" style={{ background: h.color + '22', color: h.color }}>
                  {h.icon}
                </span>
                <span className="habit-name">{h.name}</span>
                <div className="habit-actions">
                  <button className="icon-btn" title="Restaurar" onClick={() => archiveHabit(h.id, false)}>
                    ↩️
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Eliminar"
                    onClick={() => {
                      if (confirm(`¿Eliminar «${h.name}» definitivamente?`)) deleteHabit(h.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HabitModal
        open={creating || editing !== null}
        habit={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function HabitModal({
  open,
  habit,
  onClose
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [touched, setTouched] = useState(false);

  // sincroniza el formulario cuando cambia el hábito a editar
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (!open && lastKey !== null) {
    setLastKey(null);
  }
  if (open && habit?.id !== lastKey) {
    setLastKey(habit?.id ?? null);
    setName(habit?.name ?? '');
    setIcon(habit?.icon ?? HABIT_ICONS[0]);
    setColor(habit?.color ?? HABIT_COLORS[0]);
    setTouched(false);
  }
  if (open && habit === null && lastKey !== '__new__') {
    setLastKey('__new__');
    setName('');
    setIcon(HABIT_ICONS[Math.floor(Math.random() * HABIT_ICONS.length)]);
    setColor(HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)]);
    setTouched(false);
  }

  const valid = name.trim().length > 0;

  async function save() {
    if (!valid) {
      setTouched(true);
      return;
    }
    if (habit) {
      await updateHabit(habit.id, { name: name.trim(), icon, color });
    } else {
      await createHabit({ name: name.trim(), icon, color });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Editar hábito' : 'Nuevo hábito'}>
      <div className="form stack">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            autoFocus
            className="input"
            placeholder="Ej. Beber 2L de agua"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          {touched && !valid && <span className="field-error">Escribe un nombre.</span>}
        </label>

        <div className="field">
          <span className="field-label">Icono</span>
          <div className="picker-grid">
            {HABIT_ICONS.map((i) => (
              <button
                key={i}
                className={`picker-cell${icon === i ? ' is-active' : ''}`}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Color</span>
          <div className="picker-grid picker-grid--colors">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                className={`picker-color${color === c ? ' is-active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={!valid}>
            {habit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
