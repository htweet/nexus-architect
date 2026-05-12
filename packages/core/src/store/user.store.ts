/**
 * UserStore — Authentication state, plan tier, and feature flags.
 *
 * The feature flag system reads from here.
 * Populated on app boot by the adapter's getCurrentUser().
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { resolveFeatureFlags } from '../types/features.js';
import type { AdapterUser } from '../types/adapter.js';
import type { FeatureFlags } from '../types/features.js';

// ─── State ───────────────────────────────────────────────────────────────────

interface UserState {
  user: AdapterUser | null;
  flags: FeatureFlags;
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  setUser: (user: AdapterUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  devtools(
    (set) => ({
      user: null,
      flags: resolveFeatureFlags('free'),
      isLoading: true,
      error: null,

      setUser: (user) =>
        set(
          {
            user,
            flags: resolveFeatureFlags(user.tier),
            isLoading: false,
            error: null,
          },
          false,
          'user/setUser',
        ),

      clearUser: () =>
        set(
          {
            user: null,
            flags: resolveFeatureFlags('free'),
            isLoading: false,
            error: null,
          },
          false,
          'user/clearUser',
        ),

      setLoading: (loading) => set({ isLoading: loading }, false, 'user/setLoading'),

      setError: (error) =>
        set({ error, isLoading: false }, false, 'user/setError'),
    }),
    { name: 'NexusUserStore' },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectFlags = (state: UserStore): FeatureFlags => state.flags;
export const selectTier = (state: UserStore) => state.flags.tier;
export const selectUser = (state: UserStore) => state.user;
export const selectIsAuthenticated = (state: UserStore) => state.user !== null;
