import { useEffect, useRef } from 'react';

// A checkbox that can render as "indeterminate" (dash) when only some of the options it
// covers are enabled — used for the top-level mode row, each advanced section's own
// "select all", and the Roots picker's "select all".
export default function TriStateCheckbox({
  label, state, onChange, className,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <label className={`checkbox-label${className ? ` ${className}` : ''}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={state === 'all'}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
