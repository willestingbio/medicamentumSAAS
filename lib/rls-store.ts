import { AsyncLocalStorage } from 'node:async_hooks';

export type RlsClaims = {
  sub: string;
  user_role?: string;
  organization_id?: string;
} | null;

export const rlsClaimsStore = new AsyncLocalStorage<RlsClaims>();
