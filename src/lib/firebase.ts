import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
// Resolved from the react-native build of firebase/auth by Metro; the web typings don't list it.
// @ts-expect-error getReactNativePersistence is only in the React Native entry point
import { getReactNativePersistence } from "firebase/auth";
import { Platform } from "react-native";

// From Firebase console → Project settings → Your apps → Web app config. These are public identifiers.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!(config.apiKey && config.authDomain && config.projectId && config.appId);

function createAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  const app = initializeApp(config);
  return Platform.OS === "web" ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

/** Null until the EXPO_PUBLIC_FIREBASE_* values are set in App/.env. */
export const auth = createAuth();
