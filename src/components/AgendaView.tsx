import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { formatShortDate, isPast, isToday, todayKey } from '../date';
import { createTask, deleteTask, toggleTask, updateTask } from '../actions';
import { EmptyState, Modal, Pill } from './ui';

type Filter = 'pending' | 'done' | 'all';

export function AgendaView({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const list = useMemo(() => {
    const base = tasks.filter((t) => !t.deleted);
    const pending = base.filter((t) => !t.done);
    const done = base.filter((t) => t.done);
    const sortPending = (arr: Task[]) =>
      [...arr].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
    if (filter === 'pending') return sortPending(pending);
    if (filter === 'done') return [...done].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sortPending(pending).concat([...done].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, [tasks, filter]);

  const pendingCount = tasks.filter((t) => !t.deleted && !t.done).length;

  return (
    <div className="view stack">
      <div className="card-head">
        <h2 className="section-title">Agenda</h2>
        <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
          + Tarea
        </button>
      </div>

      <div className="segmented">
        {(['pending', 'done', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`seg-btn${filter === f ? ' is-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? `Pendientes (${pendingCount})` : f === 'done' ? 'Completadas' : 'Todas'}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="🗒️"
          title={filter === 'done' ? 'Aún no hay tareas completadas' : 'No hay tareas'}
          hint="Añade una tarea con fecha opcional."
          action={
            <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
              + Tarea
            </button>
          }
        />
      ) : (
        <ul className="checklist">
          {list.map((t) => {
            const overdue = !t.done && t.dueDate && isPast(t.dueDate);
            const dueToday = t.dueDate && isToday(t.dueDate);
            return (
              <li key={t.id} className="task-item card">
                <button className="check-item" onClick={() => toggleTask(t.id)}>
                  <span className={`check-box check-box--task${t.done ? ' is-done' : ''}`}>
                    {t.done && <span className="task-check-mark">✓</span>}
                  </span>
                  <span className={`check-name${t.done ? ' is-struck' : ''}`}>{t.title}</span>
                </button>
                <div className="task-meta">
                  {t.dueDate && (
                    <Pill tone={overdue ? 'danger' : dueToday ? 'success' : 'muted'}>
                      {overdue ? '⚠ ' : '📅 '}
                      {dueToday ? 'Hoy' : formatShortDate(t.dueDate)}
                    </Pill>
                  )}
                  {t.notes && <span className="task-notes">{t.notes}</span>}
                  <div className="task-actions">
                    <button className="icon-btn" title="Editar" onClick={() => setEditing(t)}>
                      ✏️
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      title="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar «${t.title}»?`)) deleteTask(t.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TaskModal
        open={modalOpen || editing !== null}
        task={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function TaskModal({
  open,
  task,
  onClose
}: {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [touched, setTouched] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  if (!open && lastKey !== null) {
    setLastKey(null);
  }
  if (open && task?.id !== lastKey) {
    setLastKey(task?.id ?? null);
    setTitle(task?.title ?? '');
    setNotes(task?.notes ?? '');
    setDueDate(task?.dueDate ?? '');
    setTouched(false);
  }
  if (open && task === null && lastKey !== '__new__') {
    setLastKey('__new__');
    setTitle('');
    setNotes('');
    setDueDate(todayKey());
    setTouched(false);
  }

  const valid = title.trim().length > 0;

  async function save() {
    if (!valid) {
      setTouched(true);
      return;
    }
    const payload = { title: title.trim(), notes: notes.trim(), dueDate: dueDate || null };
    if (task) await updateTask(task.id, payload);
    else await createTask(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'}>
      <div className="form stack">
        <label className="field">
          <span className="field-label">Título</span>
          <input
            autoFocus
            className="input"
            placeholder="Ej. Llamar al dentista"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          {touched && !valid && <span className="field-error">Escribe un título.</span>}
        </label>

        <label className="field">
          <span className="field-label">Fecha (opcional)</span>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Notas (opcional)</span>
          <textarea
            className="input"
            rows={3}
            placeholder="Detalles…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="form-actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save} disabled={!valid}>
            {task ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
