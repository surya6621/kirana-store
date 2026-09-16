import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export function QuantityControl({ value, min = 1, max, onIncrease, onDecrease, onChange, onInvalid, allowDecimal = false }) {
  const [draft, setDraft] = useState(String(value));
  const pattern = allowDecimal ? /^\d*(\.\d*)?$/ : /^\d*$/;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const restore = () => setDraft(String(value));

  const handleChange = (event) => {
    const next = event.target.value;
    if (!pattern.test(next)) {
      onInvalid?.('Enter a valid quantity.');
      restore();
      return;
    }
    setDraft(next);
    if (next === '' || next === '.') return;

    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed < min) {
      onInvalid?.(`Quantity must be at least ${min}.`);
      restore();
      return;
    }
    if (max !== undefined && parsed > max) {
      onInvalid?.(`Only ${max} units available.`);
      restore();
      return;
    }
    onChange(parsed);
  };

  const handleBlur = () => {
    if (draft === '' || draft === '.') restore();
  };

  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Quantity controls">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={onDecrease}
        className="flex min-w-9 items-center justify-center border-r border-slate-200 px-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label="Quantity"
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 border-0 bg-transparent px-1 text-center text-sm font-bold text-slate-800 outline-none focus:bg-emerald-50"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={max !== undefined && value >= max}
        onClick={onIncrease}
        className="flex min-w-9 items-center justify-center border-l border-slate-200 px-2 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
