import { db, logId, nowIso, uuid } from './db';
import type { Habit, Task } from './types';
import { todayKey } from './date';
import { requestSync } from './sync';

// ---------- Hábitos ----------
export async function createHabit(input: {
  name: string;
  color: string;
  icon: string;
}): Promise<void> {
  const now = nowIso();
  const max = await db.habits.orderBy('sortOrder').last();
  await db.habits.add({
    id: uuid(),
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    frequency: 'daily',
    archived: false,
    sortOrder: (max?.sortOrder ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
    deleted: false
  });
  requestSync();
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  const h = await db.habits.get(id);
  if (!h) return;
  await db.habits.update(id, { ...patch, updatedAt: nowIso() });
  requestSync();
}

export async function archiveHabit(id: string, archived: boolean): Promise<void> {
  await updateHabit(id, { archived });
}

export async function deleteHabit(id: string): Promise<void> {
  const h = await db.habits.get(id);
  if (!h) return;
  // borrado suave para que el sync lo propague
  await db.habits.update(id, { deleted: true, updatedAt: nowIso() });
  requestSync();
}

// ---------- Registros de hábito ----------
export async function toggleHabit(habitId: string, date: string): Promise<void> {
  const id = logId(habitId, date);
  const existing = await db.habitLogs.get(id);
  const done = !(existing?.done ?? false);
  await db.habitLogs.put({
    id,
    habitId,
    date,
    done,
    updatedAt: nowIso(),
    deleted: false
  });
  requestSync();
}

export async function setHabitDone(habitId: string, date: string, done: boolean): Promise<void> {
  const id = logId(habitId, date);
  await db.habitLogs.put({
    id,
    habitId,
    date,
    done,
    updatedAt: nowIso(),
    deleted: false
  });
  requestSync();
}

// ---------- Tareas ----------
export async function createTask(input: {
  title: string;
  notes?: string;
  dueDate: string | null;
}): Promise<void> {
  const now = nowIso();
  const max = await db.tasks.orderBy('sortOrder').last();
  await db.tasks.add({
    id: uuid(),
    title: input.title.trim(),
    notes: input.notes?.trim() || '',
    dueDate: input.dueDate,
    done: false,
    sortOrder: (max?.sortOrder ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
    deleted: false
  });
  requestSync();
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, { ...patch, updatedAt: nowIso() });
  requestSync();
}

export async function toggleTask(id: string): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await updateTask(id, { done: !t.done });
}

export async function deleteTask(id: string): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, { deleted: true, updatedAt: nowIso() });
  requestSync();
}

// ---------- Semilla de ejemplo ----------
export async function seedExampleIfEmpty(): Promise<void> {
  const count = await db.habits.count();
  if (count > 0) return;
  const today = todayKey();
  const samples: Array<{ name: string; color: string; icon: string; doneToday: boolean }> = [
    { name: 'Beber 2L de agua', color: '#06b6d4', icon: '💧', doneToday: true },
    { name: 'Leer 20 minutos', color: '#8b5cf6', icon: '📖', doneToday: false },
    { name: 'Ejercicio', color: '#22c55e', icon: '💪', doneToday: true },
    { name: 'Meditar', color: '#f97316', icon: '🧘', doneToday: false }
  ];
  for (const s of samples) {
    const now = nowIso();
    const id = uuid();
    await db.habits.add({
      id,
      name: s.name,
      color: s.color,
      icon: s.icon,
      frequency: 'daily',
      archived: false,
      sortOrder: samples.indexOf(s) + 1,
      createdAt: now,
      updatedAt: now,
      deleted: false
    });
    if (s.doneToday) {
      await db.habitLogs.put({
        id: logId(id, today),
        habitId: id,
        date: today,
        done: true,
        updatedAt: now,
        deleted: false
      });
    }
  }
  await createTask({
    title: 'Planificar el día',
    notes: 'Revisar prioridades de hoy',
    dueDate: today
  });
}
