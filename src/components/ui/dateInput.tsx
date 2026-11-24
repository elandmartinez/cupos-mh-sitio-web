import { useState } from 'react';
import { toDisplayDate, toIsoDate } from '../../helpers/date';

interface DateInputProps {
  id?: string;
  name?: string;
  /** ISO `YYYY-MM-DD`, or an empty string. */
  value: string;
  /** Called with ISO `YYYY-MM-DD` (or empty) once a complete valid date is entered or cleared. */
  onChange: (iso: string) => void;
  className?: string;
  required?: boolean;
  /** Marks the field invalid for assistive tech (mirrors `aria-invalid`). */
  invalid?: boolean;
  /** id of the element describing the validation error (mirrors `aria-describedby`). */
  ariaDescribedBy?: string;
}

/** Insert the `DD/MM/YYYY` slashes as the user types, keeping at most 8 digits. */
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * A calendar field that always reads and writes `DD/MM/YYYY`, regardless of the
 * browser locale — a native `<input type="date">` renders in the browser's own
 * format and cannot be forced.
 *
 * The stored value stays ISO (`YYYY-MM-DD`), the same shape Supabase's `date`
 * columns hand back, so the form code above it is unchanged. An incomplete or
 * impossible entry (e.g. `31/02`) reverts to the last committed date on blur.
 */
export default function DateInput({ id, name, value, onChange, className, required, invalid, ariaDescribedBy }: DateInputProps) {
  const [text, setText] = useState(() => toDisplayDate(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDateInput(e.target.value);
    setText(masked);
    if (masked === '') {
      onChange('');
      return;
    }
    const iso = toIsoDate(masked);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    if (text === '') return;
    // An incomplete or invalid entry never committed, so revert it.
    if (!toIsoDate(text)) setText(toDisplayDate(value));
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/YYYY"
      maxLength={10}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      required={required}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={ariaDescribedBy}
    />
  );
}
