import {
  createUserWithEmailAndPassword, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut as firebaseSignOut, updateProfile,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { toISODate } from "./date";
import { auth } from "./firebase";
import type { Profile, Targets, User } from "./types";

interface AppState {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  targets: Targets | null;
  /** True when the account signs in with email + password (not only Google/Facebook/Discord). */
  hasPassword: boolean;
  date: string; // selected diary date
  setDate: (d: string) => void;
  diaryVersion: number; // bump to make screens refetch the diary
  refreshDiary: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<Targets>;
  /** Password accounts pass their password, which is re-checked by Firebase first. */
  deleteAccount: (password?: string) => Promise<void>;
  setAvatar: (avatar: string | null) => Promise<void>;
  reloadMe: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

const NOT_SET_UP = "Sign-in isn't set up yet. Add the Firebase settings to App/.env and restart the app.";

function requireAuth() {
  if (!auth) throw new Error(NOT_SET_UP);
  return auth;
}

/** Turns Firebase error codes into messages people can act on. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  const known: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/email-already-in-use": "That email is already registered. Sign in instead.",
    "auth/weak-password": "Use a password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/network-request-failed": "No internet connection. Check your network and try again.",
    "auth/account-exists-with-different-credential": "This email already uses a different sign-in method. Sign in that way first.",
    "auth/operation-not-allowed": "This sign-in method isn't turned on in Firebase yet.",
  };
  return known[code] ?? (e as Error).message ?? "Something went wrong.";
}

async function friendly<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(authMessage(e));
  }
}

const LEGACY_CODES = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [date, setDate] = useState(toISODate());
  const [diaryVersion, setDiaryVersion] = useState(0);
  // While sign-in/up runs its own steps, the auth listener must not load the profile early
  // (it would create the server-side account before the name or old-account link is in place).
  const busy = useRef(false);

  const clear = useCallback(() => {
    setUser(null);
    setProfile(null);
    setTargets(null);
  }, []);

  const reloadMe = useCallback(async () => {
    const me = await api.me();
    setUser(me.user);
    setProfile(me.profile);
    setTargets(me.targets);
  }, []);

  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (busy.current) return;
      if (!fbUser) {
        clear();
        setReady(true);
        return;
      }
      try {
        await reloadMe();
      } catch {
        clear();
      } finally {
        setReady(true);
      }
    });
  }, [reloadMe, clear]);

  const value = useMemo<AppState>(() => {
    const exclusive = async (fn: () => Promise<void>) => {
      busy.current = true;
      try {
        await fn();
      } finally {
        busy.current = false;
      }
    };
    const signOut = async () => {
      if (auth) await firebaseSignOut(auth);
      clear();
    };
    return {
      ready, user, profile, targets, date, setDate, diaryVersion,
      hasPassword: !!auth?.currentUser?.providerData.some((p) => p.providerId === "password"),
      refreshDiary: () => setDiaryVersion((v) => v + 1),
      signIn: (email, password) =>
        exclusive(async () => {
          const a = requireAuth();
          try {
            await signInWithEmailAndPassword(a, email, password);
          } catch (e) {
            if (!LEGACY_CODES.includes((e as { code?: string }).code ?? "")) throw new Error(authMessage(e));
            // Maybe an account from before Firebase: if the old password matches, move it over.
            const legacy = await api.legacyCheck(email, password).catch(() => ({ ok: false }));
            if (!legacy.ok) throw new Error(authMessage(e));
            await friendly(() => createUserWithEmailAndPassword(a, email, password));
            await api.legacyLink(email, password);
          }
          await reloadMe();
        }),
      signUp: (name, email, password) =>
        exclusive(async () => {
          const a = requireAuth();
          const cred = await friendly(() => createUserWithEmailAndPassword(a, email, password));
          await updateProfile(cred.user, { displayName: name });
          await cred.user.getIdToken(true); // so the server sees the name on first load
          await reloadMe();
        }),
      resetPassword: (email) => friendly(() => sendPasswordResetEmail(requireAuth(), email)),
      signOut,
      deleteAccount: async (password) => {
        const current = requireAuth().currentUser;
        if (!current) throw new Error("You're not signed in.");
        if (password) await friendly(() => reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? "", password)));
        await api.deleteAccount();
        await signOut();
      },
      setAvatar: async (avatar) => {
        const r = await api.setAvatar(avatar);
        setUser((u) => (u ? { ...u, avatar: r.avatar } : u));
      },
      saveProfile: async (p) => {
        const r = await api.saveProfile(p);
        setProfile(r.profile);
        setTargets(r.targets);
        return r.targets;
      },
      reloadMe,
    };
  }, [ready, user, profile, targets, date, diaryVersion, reloadMe, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
