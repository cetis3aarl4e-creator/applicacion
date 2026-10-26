import { useRef, useState } from 'react';
import { getSettings, updateSettings } from '../settings';
import { exportCSV, exportJSON, importJSON } from '../io';
import { isCloudConfigured, syncNow, testConnection } from '../sync';
import { Modal } from './ui';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = getSettings();
  const [url, setUrl] = useState(s.supabaseUrl ?? '');
  const [key, setKey] = useState(s.supabaseAnonKey ?? '');
  const [pin, setPin] = useState(s.pin ?? '');
  const [enabled, setEnabled] = useState(s.cloudEnabled);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const configured = isCloudConfigured();

  async function saveCloud() {
    updateSettings({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim(), cloudEnabled: enabled });
    setStatus(null);
    if (enabled && url.trim() && key.trim()) {
      const r = await testConnection();
      setStatus({ ok: r.ok, text: r.ok ? 'Configuración guardada y conexión correcta.' : r.message });
    } else {
      setStatus({ ok: true, text: 'Configuración guardada (sync desactivado).' });
    }
  }

  async function onTest() {
    updateSettings({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim(), cloudEnabled: true });
    setEnabled(true);
    const r = await testConnection();
    setStatus({ ok: r.ok, text: r.message });
  }

  async function onSync() {
    if (!configured) {
      setStatus({ ok: false, text: 'Primero guarda la URL y la anon key.' });
      return;
    }
    setStatus({ ok: true, text: 'Sincronizando…' });
    try {
      const r = await syncNow();
      setStatus({
        ok: true,
        text: `Sincronizado. Cambios aplicados: ${r.habits} hábitos, ${r.logs} registros, ${r.tasks} tareas.`
      });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  }

  function savePin() {
    updateSettings({ pin: pin.trim() || undefined });
    setStatus({ ok: true, text: 'PIN guardado.' });
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importJSON(file);
      setStatus({ ok: true, text: 'Backup importado. Recargando…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajustes" wide>
      <div className="stack">
        <section className="settings-section">
          <h3>☁️ Sincronización con Supabase</h3>
          <p className="settings-hint">
            Opcional. Guarda tus datos en la nube y sincroniza entre dispositivos. Si lo dejas
            vacío, todo queda local en este dispositivo.
          </p>
          <label className="field">
            <span className="field-label">URL del proyecto</span>
            <input
              className="input"
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Anon public key</span>
            <input
              className="input"
              placeholder="eyJhbGciOi…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
            />
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Activar sincronización automática</span>
          </label>
          <div className="btn-row">
            <button className="btn btn--ghost" onClick={onTest}>
              Probar conexión
            </button>
            <button className="btn btn--ghost" onClick={onSync} disabled={!configured}>
              Sincronizar ahora
            </button>
            <button className="btn btn--primary" onClick={saveCloud}>
              Guardar
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3>🔒 PIN de acceso</h3>
          <p className="settings-hint">
            Pide un PIN al abrir la app en este dispositivo (protección casual, no cifra los
            datos).
          </p>
          <div className="btn-row">
            <input
              className="input"
              style={{ maxWidth: 160 }}
              placeholder="Dejar vacío = sin PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
            />
            <button className="btn btn--ghost" onClick={savePin}>
              Guardar PIN
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3>💾 Respaldo y exportación</h3>
          <p className="settings-hint">
            Descarga un respaldo JSON para restaurarlo en otro navegador o dispositivo, o exporta a
            CSV para abrirlo en Excel.
          </p>
          <div className="btn-row">
            <button className="btn btn--ghost" onClick={exportJSON}>
              Exportar JSON
            </button>
            <button className="btn btn--ghost" onClick={exportCSV}>
              Exportar CSV (Excel)
            </button>
            <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              Importar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={onImportFile}
            />
          </div>
        </section>

        {status && (
          <p className={`settings-status${status.ok ? ' is-ok' : ' is-err'}`}>{status.text}</p>
        )}

        <p className="settings-foot">
          Los datos viven primero en tu navegador (IndexedDB). Supabase es un respaldo/sync
          opcional. Consulta <code>supabase/schema.sql</code> para crear las tablas.
        </p>
      </div>
    </Modal>
  );
}
