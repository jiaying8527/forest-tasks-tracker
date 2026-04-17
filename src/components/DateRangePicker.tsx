import type { Granularity, RangeSelection } from '../lib/dateRange';
import { GRANULARITIES, labelForSelection } from '../lib/dateRange';
import './DateRangePicker.css';

interface Props {
  value: RangeSelection;
  onChange: (value: RangeSelection) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const setGranularity = (granularity: Granularity) => {
    onChange({ granularity, offset: 0 });
  };

  const step = (delta: number) => {
    if (value.granularity === 'all') return;
    onChange({ ...value, offset: value.offset + delta });
  };

  const isAll = value.granularity === 'all';

  return (
    <div className="date-range-picker" role="group" aria-label="Date range">
      <div className="drp-tabs" role="tablist" aria-label="Granularity">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={value.granularity === g.id}
            className={`drp-tab${value.granularity === g.id ? ' is-active' : ''}`}
            onClick={() => setGranularity(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className={`drp-stepper${isAll ? ' is-muted' : ''}`}>
        <button
          type="button"
          className="drp-step-btn"
          onClick={() => step(-1)}
          disabled={isAll}
          aria-label="Previous period"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="drp-label" aria-live="polite">
          {labelForSelection(value)}
        </span>
        <button
          type="button"
          className="drp-step-btn"
          onClick={() => step(1)}
          disabled={isAll}
          aria-label="Next period"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
