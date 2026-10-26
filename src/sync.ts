import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import { getSettings } from './settings';
import type { Habit, HabitLog, Task } from './types';

let client: SupabaseClient | null = null;
let clientKey = '';

export function isCloudConfigured(): boolean {
  const s = getSettings();
  return !!(s.cloudEnabled && s.supabaseUrl && s.supabaseAnonKey);
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  const s = getSettings();
  if (!s.cloudEnabled || !s.supabaseUrl || !s.supabaseAnonKey) return null;
  const key = `${s.supabaseUrl}|${s.supabaseAnonKey}`;
  if (!client || clientKey !== key) {
    // carga diferida: solo se descarga Supabase cuando realmente se usa
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(s.supabaseUrl, s.supabaseAnonKey, {
      auth: { persistSession: false }
    });
    clientKey = key;
  }
  return client;
}

// ---------- mapeo local <-> nube ----------
type CloudHabit = {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: string;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};
type CloudLog = {
  id: string;
  habit_id: string;
  log_date: string;
  done: boolean;
  updated_at: string;
  deleted: boolean;
};
type CloudTask = {
  id: string;
  title: string;
  notes: string;
  due_date: string | null;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

const habitToCloud = (h: Habit): CloudHabit => ({
  id: h.id,
  name: h.name,
  color: h.color,
  icon: h.icon,
  frequency: h.frequency,
  archived: h.archived,
  sort_order: h.sortOrder,
  created_at: h.createdAt,
  updated_at: h.updatedAt,
  deleted: h.deleted
});
const cloudToHabit = (c: CloudHabit): Habit => ({
  id: c.id,
  name: c.name,
  color: c.color,
  icon: c.icon,
  frequency: (c.frequency as Habit['frequency']) || 'daily',
  archived: !!c.archived,
  sortOrder: c.sort_order ?? 0,
  createdAt: c.created_at ?? c.updated_at,
  updatedAt: c.updated_at,
  deleted: !!c.deleted
});
const logToCloud = (l: HabitLog): CloudLog => ({
  id: l.id,
  habit_id: l.habitId,
  log_date: l.date,
  done: l.done,
  updated_at: l.updatedAt,
  deleted: l.deleted
});
const cloudToLog = (c: CloudLog): HabitLog => ({
  id: c.id,
  habitId: c.habit_id,
  date: c.log_date,
  done: !!c.done,
  updatedAt: c.updated_at,
  deleted: !!c.deleted
});
const taskToCloud = (t: Task): CloudTask => ({
  id: t.id,
  title: t.title,
  notes: t.notes,
  due_date: t.dueDate,
  done: t.done,
  sort_order: t.sortOrder,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
  deleted: t.deleted
});
const cloudToTask = (c: CloudTask): Task => ({
  id: c.id,
  title: c.title,
  notes: c.notes ?? '',
  dueDate: c.due_date ?? null,
  done: !!c.done,
  sortOrder: c.sort_order ?? 0,
  createdAt: c.created_at ?? c.updated_at,
  updatedAt: c.updated_at,
  deleted: !!c.deleted
});

// ---------- sync ----------
export interface SyncResult {
  habits: number;
  logs: number;
  tasks: number;
}

async function syncTable<T, C>(
  tableName: string,
  table: { toArray(): Promise<T[]>; put(item: T): Promise<unknown> },
  toCloud: (t: T) => C,
  fromCloud: (c: C) => T,
  idOf: (t: T) => string
): Promise<number> {
  const supabase = await getSupabase();
  if (!supabase) return 0;

  const locals = await table.toArray();

  // 1) push: sube todo lo local (incluye tombstones)
  if (locals.length > 0) {
    const rows = locals.map(toCloud) as unknown as Record<string, unknown>[];
    const { error } = await supabase.from(tableName).upsert(rows);
    if (error) throw new Error(`push ${tableName}: ${error.message}`);
  }

  // 2) pull: baja todo y mezcla (gana el updated_at más reciente)
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw new Error(`pull ${tableName}: ${error.message}`);

  const byId = new Map<string, T>(locals.map((l) => [idOf(l), l]));
  let changed = 0;
  for (const cloud of (data ?? []) as C[]) {
    const item = fromCloud(cloud);
    const local = byId.get(idOf(item));
    if (!local) {
      await table.put(item);
      changed++;
      continue;
    }
    const localUpdated = (local as unknown as { updatedAt?: string }).updatedAt ?? '';
    const cloudUpdated = (item as unknown as { updatedAt?: string }).updatedAt ?? '';
    if (cloudUpdated > localUpdated) {
      await table.put(item);
      changed++;
    }
  }
  return changed;
}

export async function syncNow(): Promise<SyncResult> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase no está configurado');

  const habits = await syncTable('habits', db.habits, habitToCloud, cloudToHabit, (h) => h.id);
  const logs = await syncTable(
    'habit_logs',
    db.habitLogs,
    logToCloud,
    cloudToLog,
    (l) => l.id
  );
  const tasks = await syncTable('tasks', db.tasks, taskToCloud, cloudToTask, (t) => t.id);

  return { habits, logs, tasks };
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await getSupabase();
    if (!supabase) return { ok: false, message: 'Faltan la URL o la anon key.' };
    const { error } = await supabase.from('habits').select('id', { count: 'exact', head: true });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Conexión correcta.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- sync automático (debounce) ----------
let timer: ReturnType<typeof setTimeout> | null = null;
export function requestSync(): void {
  if (!isCloudConfigured()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow().catch(() => {
      /* silencioso: el botón manual mostrará el error */
    });
  }, 1200);
}
