/** 16px stroke icons for the shell nav — no dependency, currentColor. */

type P = { className?: string };

function Base({ className = 'size-[18px]', children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const IconOverview = (p: P) => (
  <Base {...p}>
    <rect x="3" y="3" width="6" height="6" rx="1.5" />
    <rect x="11" y="3" width="6" height="4" rx="1.5" />
    <rect x="11" y="9" width="6" height="8" rx="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.5" />
  </Base>
);

export const IconIncident = (p: P) => (
  <Base {...p}>
    <path d="M10 2.5L17.5 15.5h-15L10 2.5z" />
    <path d="M10 8v3.5" />
    <circle cx="10" cy="13.8" r="0.4" fill="currentColor" />
  </Base>
);

export const IconServices = (p: P) => (
  <Base {...p}>
    <rect x="3" y="3" width="14" height="5" rx="1.5" />
    <rect x="3" y="12" width="14" height="5" rx="1.5" />
    <circle cx="6" cy="5.5" r="0.5" fill="currentColor" />
    <circle cx="6" cy="14.5" r="0.5" fill="currentColor" />
  </Base>
);

export const IconStatus = (p: P) => (
  <Base {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 2.5" />
  </Base>
);

export const IconSpark = (p: P) => (
  <Base {...p}>
    <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z" />
  </Base>
);

export const IconCode = (p: P) => (
  <Base {...p}>
    <path d="M7 5L3 10l4 5" />
    <path d="M13 5l4 5-4 5" />
  </Base>
);

export const IconChat = (p: P) => (
  <Base {...p}>
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-4 4v-4H5.5A2.5 2.5 0 0 1 3 10.5v-5z" />
  </Base>
);

export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M3.5 5.5h13M8 5.5V4h4v1.5M5.5 5.5l.7 11h7.6l.7-11" />
  </Base>
);

export const IconPencil = (p: P) => (
  <Base {...p}>
    <path d="M13.5 3.5l3 3L7 16H4v-3z" />
    <path d="M12 5l3 3" />
  </Base>
);

export const IconBook = (p: P) => (
  <Base {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12.5H5.5A1.5 1.5 0 0 0 4 17V4.5z" />
    <path d="M4 17a1.5 1.5 0 0 1 1.5-1.5H16" />
  </Base>
);

export const IconRepo = (p: P) => (
  <Base {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="14.5" r="2.5" />
    <circle cx="14" cy="10" r="2.5" />
    <path d="M6 8.5v3.5M8 7c2.5 0 2 2 3.7 2.4" />
  </Base>
);

export const IconGauge = (p: P) => (
  <Base {...p}>
    <path d="M3.5 14.5a7 7 0 1 1 13 0" />
    <path d="M10 14.5l3.5-4.5" />
    <circle cx="10" cy="14.5" r="1" fill="currentColor" />
  </Base>
);

export const IconGraph = (p: P) => (
  <Base {...p}>
    <circle cx="5" cy="5" r="2" />
    <circle cx="15" cy="5" r="2" />
    <circle cx="10" cy="15" r="2" />
    <path d="M6.5 6.5l2.5 6M13.5 6.5l-2.5 6M7 5h6" />
  </Base>
);

export const IconAudit = (p: P) => (
  <Base {...p}>
    <path d="M5 3h10v14H5z" />
    <path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" />
  </Base>
);

export const IconSettings = (p: P) => (
  <Base {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M5 5l1.4 1.4M13.6 13.6L15 15M15 5l-1.4 1.4M6.4 13.6L5 15" />
  </Base>
);

export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.5 13.5L17 17" />
  </Base>
);

export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M10 4v12M4 10h12" />
  </Base>
);

export const IconBell = (p: P) => (
  <Base {...p}>
    <path d="M10 3a5 5 0 0 1 5 5v3l1.5 2.5h-13L5 11V8a5 5 0 0 1 5-5z" />
    <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" />
  </Base>
);

export const IconExternal = (p: P) => (
  <Base {...p}>
    <path d="M8 5H5v11h11v-3" />
    <path d="M12 3h5v5M17 3l-7 7" />
  </Base>
);

export const IconCopy = (p: P) => (
  <Base {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
  </Base>
);

export const IconRetry = (p: P) => (
  <Base {...p}>
    <path d="M17 10a7 7 0 1 1-2.1-5" />
    <path d="M17 3v4h-4" />
  </Base>
);

export const IconDownload = (p: P) => (
  <Base {...p}>
    <path d="M10 3v9" />
    <path d="M6.5 8.5L10 12l3.5-3.5" />
    <path d="M4 15.5h12" />
  </Base>
);

export const IconMemory = (p: P) => (
  <Base {...p}>
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M7.5 3v14M12.5 3v14M3 7.5h14M3 12.5h14" />
  </Base>
);
