/** Pure role names shared by client controls and server-side authorization. */
export const ROLES = ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];
