export type Frequency = 'daily';

export interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: Frequency;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface HabitLog {
  id: string; // `${habitId}::${date}`
  habitId: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  updatedAt: string;
  deleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null; // YYYY-MM-DD
  done: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Settings {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  cloudEnabled: boolean;
  pin?: string;
  theme: 'dark' | 'light';
}

export const HABIT_COLORS = [
  '#f97316', // naranja
  '#f43f5e', // rosa
  '#ef4444', // rojo
  '#eab308', // amarillo
  '#22c55e', // verde
  '#14b8a6', // teal
  '#06b6d4', // cian
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#a855f7', // púrpura
  '#ec4899', // fucsia
  '#94a3b8' // gris
];

export const HABIT_ICONS = [
  '💧', '🏃', '📖', '🧘', '💪', '🥗', '😴', '✍️', '🎯', '🎸',
  '💊', '🧠', '☀️', '🚭', '💻', '🧹', '💰', '🙏', '🎨', '🌙'
];
