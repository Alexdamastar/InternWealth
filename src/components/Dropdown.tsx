'use client';

// A custom dropdown used everywhere in place of a native <select>. A native
// <select>'s option popup is sized by the browser and can't be height-constrained
// with CSS, so long lists (e.g. 30–51 states) filled the whole screen. This renders
// a fixed-height (max-h-56), scrollable panel styled to the warm-ledger palette, and
// closes on outside-click or Escape. Controlled: parent owns the value.

import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Optional column label rendered above the trigger. */
  label?: string;
  placeholder?: string;
  /** Wrapper classes when `label` is set — controls the label text style. */
  labelClassName?: string;
  /** Extra classes on the relative container (e.g. width for inline use). */
  className?: string;
}

export default function Dropdown({
  value,
  options,
  onChange,
  label,
  placeholder = 'Select…',
  labelClassName = 'flex flex-col gap-1 text-xs text-ink-2',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  const control = (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-paper/60 border border-line px-2 py-1.5 text-left text-sm normal-case tracking-normal focus:border-moss"
      >
        <span className={selected ? 'text-ink' : 'text-faint'}>
          {selected ? selected.label : placeholder}
        </span>
        <span aria-hidden className="text-faint text-[10px]">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-line bg-card shadow-card"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => choose(o.value)}
                className={`block w-full px-2 py-1.5 text-left text-sm normal-case tracking-normal hover:bg-moss/10 ${
                  o.value === value ? 'bg-moss/5 text-moss font-semibold' : 'text-ink-2'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!label) return control;

  return (
    <div className={labelClassName}>
      {label}
      {control}
    </div>
  );
}
