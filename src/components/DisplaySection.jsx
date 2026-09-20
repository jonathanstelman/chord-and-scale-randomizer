import NumberField from './NumberField';
import { NUMERIC_LIMITS } from '../hooks/useSettings';

// Shared by every practice tab, in the player column: how the session is presented back
// to you, not what gets picked — the queue's depth (see docs/architecture/randomizer.md's
// "Queue depth" for why depth and the veil toggle are separate settings), and on Scale
// Degrees how a degree is written (`children`: that tab passes its Labels field).
export default function DisplaySection({ settings, updateSettings, children }) {
  return (
    <details className="settings-section" open>
      <summary>Display</summary>
      <div className="settings-body">
        <div className="session-data-fields">
          <label className="data-field">
            <span>Queue</span>
            <NumberField
              {...NUMERIC_LIMITS.queueDepth}
              value={settings.queueDepth}
              onCommit={(queueDepth) => updateSettings({ queueDepth })}
              aria-label="Upcoming tonal centers to show"
            />
            <span className="data-unit">upcoming</span>
          </label>
          {children}
        </div>
      </div>
    </details>
  );
}
