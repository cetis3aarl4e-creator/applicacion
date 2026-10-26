import Dexie, { type Table } from 'dexie';
import type { Habit, HabitLog, Task } from './types';

class AppDB extends Dexie {
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  tasks!: Table<Task, string>;

  constructor() {
    super('habit-tracker-db');
    this.version(1).stores({
      habits: 'id, archived, sortOrder, name',
      habitLogs: 'id, habitId, date, done',
      tasks: 'id, dueDate, done, sortOrder'
    });
  }
}

export const db = new AppDB();

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function logId(habitId: string, date: string): string {
  return `${habitId}::${date}`;
}
