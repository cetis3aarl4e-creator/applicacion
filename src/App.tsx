import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getSettings, updateSettings } from './settings';
import { seedExampleIfEmpty } from './actions';
import { isCloudConfigured, requestSync } from './sync';
import { Today } from './components/Today';
import { HabitsView } from './components/HabitsView';
import { CalendarView } from './components/CalendarView';
import { AgendaView } from './components/AgendaView';
import { StatsView } from './components/StatsView';
import { SettingsModal } from './components/SettingsModal';

type Tab = 'today' | 'habits' | 'calendar' | 'agenda' | 'stats';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: 'Hoy', icon: '☀️' },
  { id: 'habits', label: 'Hábitos', icon: '✅' },
  { id: 'calendar', label: 'Calendario', icon: '📅' },
  { id: 'agenda', label: 'Agenda', icon: '🗒️' },
  { id: 'stats', label: 'Estadísticas', icon: '📊' }
];

export default function App() {
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('ht-unlocked') === '1'
  );

  const settings = getSettings();
  const needsPin = !!settings.pin && !unlocked;

  useEffect(() => {
    if (!localStorage.getItem('ht-seeded')) {
      localStorage.setItem('ht-seeded', '1');
      if (!isCloudConfigured()) seedExampleIfEmpty();
    }
  }, []);

  useEffect(() => {
    if (isCloudConfigured()) requestSync();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const pendingToday = useMemo(
    () => tasks.filter((t) => !t.deleted && !t.done).length,
    [tasks]
  );

  function toggleTheme() {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
    document.documentElement.setAttribute('data-theme', next);
  }

  if (needsPin) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">✓</span>
          <span className="brand-name">Hábitos</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Cambiar tema">
            {settings.theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Ajustes">
            ⚙️
          </button>
        </div>
      </header>

      <main className="main">
        {tab === 'today' && (
          <Today
            habits={habits}
            logs={logs}
            tasks={tasks}
            onOpenHabits={() => setTab('habits')}
            onOpenAgenda={() => setTab('agenda')}
          />
        )}
        {tab === 'habits' && <HabitsView habits={habits} logs={logs} />}
        {tab === 'calendar' && <CalendarView habits={habits} logs={logs} />}
        {tab === 'agenda' && <AgendaView tasks={tasks} />}
        {tab === 'stats' && <StatsView habits={habits} logs={logs} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">
              {t.label}
              {t.id === 'agenda' && pendingToday > 0 && (
                <span className="tab-badge">{pendingToday}</span>
              )}
            </span>
          </button>
        ))}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const pin = getSettings().pin ?? '';

  function submit() {
    if (value === pin) {
      sessionStorage.setItem('ht-unlocked', '1');
      onUnlock();
    } else {
      setError(true);
      setValue('');
    }
  }

  return (
    <div className="pin-screen">
      <div className="pin-card">
        <span className="pin-logo">🔒</span>
        <h1>Introduce tu PIN</h1>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          className="input pin-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {error && <p className="pin-error">PIN incorrecto</p>}
        <button className="btn btn--primary" onClick={submit}>
          Entrar
        </button>
      </div>
    </div>
  );
}
