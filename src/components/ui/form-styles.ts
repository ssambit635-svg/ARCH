/**
 * Shared control styling for form inputs. Kept in its own module so `form.tsx` (plain
 * inputs) and `password-input.tsx` (input + toggle button) style identically without
 * duplicating the class string.
 */
export const controlClass =
  'w-full rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 shadow-[0_1px_0_rgb(255_255_255/0.04)_inset] transition focus:border-indigo-500/60 focus:bg-abyss-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50';
