import NumberField from './NumberField';
import { NUMERIC_LIMITS } from '../hooks/useSettings';

// Shared by both practice tabs, in the player column: how deep the queue runs is about
// how the session is presented back to you, not about what gets picked. One field today
// — see docs/architecture/randomizer.md's "Queue depth" for why depth and the veil
// toggle are separate settings rather than one control.
export default function DisplaySection({ settings, updateSettings }) {
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
        </div>
      </div>
    </details>
  );
}
