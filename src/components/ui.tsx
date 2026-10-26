import { useEffect, type ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card${wide ? ' modal-card--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct}>
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }}
      />
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'danger' | 'muted' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint, action }: { icon: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action}
    </div>
  );
}

export function Ring({ value, size = 96, stroke = 8 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const offset = c * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-value"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" className="ring-label" dominantBaseline="central" textAnchor="middle">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
