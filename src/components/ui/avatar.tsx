/** Initials avatars with a deterministic hue per identity. Server-safe. */

const hues = [222, 258, 280, 190, 160, 24, 340, 200];

function hueFor(identity: string): number {
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  return hues[hash % hues.length]!;
}

export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name ?? '').trim() || (email ?? '').trim();
  if (!source) return '?';
  if (source.includes('@') && !(name ?? '').trim()) return source.slice(0, 2).toUpperCase();
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || source.slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  email,
  size = 'md',
  ring = false,
}: {
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ring?: boolean;
}) {
  const sizes = { xs: 'size-6 text-[10px]', sm: 'size-7 text-[11px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' } as const;
  const hue = hueFor(email ?? name ?? '?');
  return (
    <span
      aria-hidden="true"
      title={name ?? email ?? undefined}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${sizes[size]} ${ring ? 'ring-2 ring-abyss-900' : ''}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 60% 45% / 0.9), hsl(${(hue + 40) % 360} 60% 35% / 0.9))`,
        color: 'white',
        textShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
      }}
    >
      {initialsOf(name, email)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: { name?: string | null; email?: string | null }[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((person, index) => (
        <Avatar key={`${person.email}-${index}`} name={person.name} email={person.email} size="sm" ring />
      ))}
      {extra > 0 ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-700 text-[10px] font-semibold text-slate-200 ring-2 ring-abyss-900">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
