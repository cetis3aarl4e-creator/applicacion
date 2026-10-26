import { db } from './db';
import { getSettings } from './settings';
import { todayKey } from './date';

function download(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportJSON(): Promise<void> {
  const [habits, habitLogs, tasks] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.tasks.toArray()
  ]);
  const payload = {
    app: 'habit-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    habits,
    habitLogs,
    tasks
  };
  download(
    `habit-tracker-backup-${todayKey()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export async function importJSON(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.habits)) {
    throw new Error('Archivo no válido: no es un backup de Habit Tracker.');
  }
  await db.transaction('rw', db.habits, db.habitLogs, db.tasks, async () => {
    await Promise.all([db.habits.clear(), db.habitLogs.clear(), db.tasks.clear()]);
    await Promise.all([
      db.habits.bulkPut(data.habits),
      db.habitLogs.bulkPut(data.habitLogs ?? []),
      db.tasks.bulkPut(data.tasks ?? [])
    ]);
  });
}

export async function exportCSV(): Promise<void> {
  const [habits, habitLogs, tasks] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.tasks.toArray()
  ]);
  const nameById = new Map(habits.map((h) => [h.id, h.name]));

  const logRows: string[][] = [['Fecha', 'Hábito', 'Completado']];
  const sortedLogs = [...habitLogs].sort((a, b) =>
    a.date === b.date ? a.habitId.localeCompare(b.habitId) : a.date.localeCompare(b.date)
  );
  for (const l of sortedLogs) {
    logRows.push([l.date, nameById.get(l.habitId) ?? l.habitId, l.done ? 'Sí' : 'No']);
  }
  const logsCsv = logRows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');

  const taskRows: string[][] = [['Título', 'Notas', 'Fecha', 'Completado']];
  for (const t of tasks.filter((x) => !x.deleted)) {
    taskRows.push([
      t.title,
      t.notes,
      t.dueDate ?? '',
      t.done ? 'Sí' : 'No'
    ]);
  }
  const tasksCsv = taskRows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');

  download(`habitos-historial-${todayKey()}.csv`, '\ufeff' + logsCsv, 'text/csv;charset=utf-8');
  download(`tareas-${todayKey()}.csv`, '\ufeff' + tasksCsv, 'text/csv;charset=utf-8');
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
