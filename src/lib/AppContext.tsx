import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, loadToken, setToken } from "./api";
import { toISODate } from "./date";
import type { Profile, Targets, User } from "./types";

interface AppState {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  targets: Targets | null;
  date: string; // selected diary date
  setDate: (d: string) => void;
  diaryVersion: number; // bump to make screens refetch the diary
  refreshDiary: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<Targets>;
  reloadMe: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [date, setDate] = useState(toISODate());
  const [diaryVersion, setDiaryVersion] = useState(0);

  const reloadMe = useCallback(async () => {
    const me = await api.me();
    setUser(me.user);
    setProfile(me.profile);
    setTargets(me.targets);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (await loadToken()) await reloadMe();
      } catch {
        await setToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, [reloadMe]);

  const value = useMemo<AppState>(
    () => ({
      ready, user, profile, targets, date, setDate, diaryVersion,
      refreshDiary: () => setDiaryVersion((v) => v + 1),
      signIn: async (email, password) => {
        const r = await api.login(email, password);
        await setToken(r.token);
        await reloadMe();
      },
      signUp: async (name, email, password) => {
        const r = await api.register(name, email, password);
        await setToken(r.token);
        await reloadMe();
      },
      signOut: async () => {
        await setToken(null);
        setUser(null);
        setProfile(null);
        setTargets(null);
      },
      saveProfile: async (p) => {
        const r = await api.saveProfile(p);
        setProfile(r.profile);
        setTargets(r.targets);
        return r.targets;
      },
      reloadMe,
    }),
    [ready, user, profile, targets, date, diaryVersion, reloadMe]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
