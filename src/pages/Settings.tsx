import { useState } from 'react';
import { useProgress } from '../state/ProgressContext';

const LENIENCY_LABELS: Record<string, string> = { '0.6': 'Strict', '1': 'Normal', '1.4': 'Relaxed' };

export function SettingsPage() {
  const { state, updateSettings, resetProgress } = useProgress();
  const { settings } = state;
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <section className="page settings">
      <h1>Settings</h1>

      <fieldset className="field">
        <legend>Stroke checking</legend>
        <div className="segmented" role="radiogroup" aria-label="Stroke checking strictness">
          {Object.entries(LENIENCY_LABELS).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={settings.leniency === Number(value)}
              className={settings.leniency === Number(value) ? 'is-active' : ''}
              onClick={() => updateSettings({ leniency: Number(value) })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="hint">How closely your strokes must match the real shape.</p>
      </fieldset>

      <fieldset className="field">
        <legend>Hints when writing from memory</legend>
        <select
          value={settings.hintAfterMisses === false ? 'off' : String(settings.hintAfterMisses)}
          onChange={(e) => updateSettings({ hintAfterMisses: e.target.value === 'off' ? false : Number(e.target.value) })}
        >
          <option value="1">After 1 miss</option>
          <option value="2">After 2 misses</option>
          <option value="3">After 3 misses</option>
          <option value="off">Never</option>
        </select>
      </fieldset>

      <fieldset className="field">
        <legend>Display</legend>
        <label className="checkbox">
          <input type="checkbox" checked={settings.showGrid} onChange={(e) => updateSettings({ showGrid: e.target.checked })} />
          Show practice grid (米字格)
        </label>
      </fieldset>

      <fieldset className="field">
        <legend>Progress</legend>
        <p className="hint">Progress is saved in this browser only.</p>
        {confirmingReset ? (
          <div className="button-row">
            <button
              className="btn btn-danger"
              onClick={() => {
                resetProgress();
                setConfirmingReset(false);
              }}
            >
              Yes, erase all progress
            </button>
            <button className="btn" onClick={() => setConfirmingReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setConfirmingReset(true)}>
            Reset progress…
          </button>
        )}
      </fieldset>
    </section>
  );
}
