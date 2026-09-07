import { ALL_ROOTS, rootsCheckState } from '../music/pool';
import { pitchClassToDisplayName } from '../music/notes';
import TriStateCheckbox from './TriStateCheckbox';

// The 12-pitch-class filter — shared as-is between the chord/scale randomizer and Pure
// Tone tabs (see docs/architecture/settings-and-presets.md and
// docs/architecture/randomizer.md's Pure Tone section): both read the same
// `enabledRoots` setting, so this fieldset's markup and behavior stay identical rather
// than drifting between two hand-copied versions.
//
// `label` differs by tab because the twelve pitch classes mean different things in each:
// in Chords & Scales they're the roots chords and scales get built on, while Pure Tone
// plays them as bare pitches with nothing built on top, so calling them roots there
// would name something the mode doesn't have. `hideLabel` renders it for assistive tech
// only — Pure Tone's enclosing Notes header already names the group on screen.
export default function RootsPicker({
  enabledRoots, toggleRoot, setAllRootsEnabled, label, hideLabel = false,
}) {
  return (
    <fieldset className="roots-fieldset" aria-label={hideLabel ? label : undefined}>
      <div className="fieldset-head">
        {!hideLabel && <legend>{label}</legend>}
        <TriStateCheckbox
          className="category-select-all"
          label="select all"
          state={rootsCheckState(enabledRoots)}
          onChange={setAllRootsEnabled}
        />
      </div>
      <div className="roots-grid">
        {ALL_ROOTS.map((pc) => (
          <label key={pc} className="checkbox-label track-row">
            <input
              type="checkbox"
              checked={enabledRoots.includes(pc)}
              onChange={() => toggleRoot(pc)}
            />
            {pitchClassToDisplayName(pc)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
