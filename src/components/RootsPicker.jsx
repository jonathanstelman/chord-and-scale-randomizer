import { ALL_ROOTS, rootsCheckState } from '../music/pool';
import { pitchClassToDisplayName } from '../music/notes';
import TriStateCheckbox from './TriStateCheckbox';

// The 12-pitch-class root filter — shared as-is between the chord/scale randomizer and
// Pure Tone tabs (see docs/architecture/settings-and-presets.md and
// docs/architecture/randomizer.md's Pure Tone section): both read the same
// `enabledRoots` setting, so this fieldset's markup and behavior stay identical rather
// than drifting between two hand-copied versions.
export default function RootsPicker({ enabledRoots, toggleRoot, setAllRootsEnabled }) {
  return (
    <fieldset className="roots-fieldset">
      <div className="fieldset-head">
        <legend>Roots</legend>
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
