import * as AuthSession from "expo-auth-session";
import {
  FacebookAuthProvider, GoogleAuthProvider, signInWithCredential, signInWithCustomToken, signInWithPopup,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { authMessage } from "./AppContext";
import { auth } from "./firebase";

export type SocialProvider = "google" | "facebook" | "discord";

export const PROVIDER_LABEL: Record<SocialProvider, string> = { google: "Google", facebook: "Facebook", discord: "Discord" };

const isWeb = Platform.OS === "web";

// Public client IDs only. On web, Google and Facebook use Firebase's popup and need none of these.
const CLIENT_ID: Record<SocialProvider, string | undefined> = {
  google: Platform.select({ ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, default: undefined }),
  facebook: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
  discord: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID,
};

const DISCOVERY: Record<SocialProvider, AuthSession.DiscoveryDocument> = {
  google: { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth", tokenEndpoint: "https://oauth2.googleapis.com/token" },
  facebook: { authorizationEndpoint: "https://www.facebook.com/v19.0/dialog/oauth" },
  discord: { authorizationEndpoint: "https://discord.com/oauth2/authorize", tokenEndpoint: "https://discord.com/api/oauth2/token" },
};

const SCOPES: Record<SocialProvider, string[]> = {
  google: ["openid", "email", "profile"],
  facebook: ["public_profile", "email"],
  discord: ["identify", "email"],
};

function redirectUri(p: SocialProvider) {
  // Google's Android/iOS clients only accept the reverse-package scheme; Facebook expects fb<APP_ID>://authorize.
  if (p === "google") return AuthSession.makeRedirectUri({ native: "com.sibs.fittonesugo:/oauthredirect" });
  if (p === "facebook") return AuthSession.makeRedirectUri({ native: `fb${CLIENT_ID.facebook}://authorize` });
  return AuthSession.makeRedirectUri({ scheme: "fittonesugo", path: "oauth" });
}

/** Whether this provider can be used on this platform with the keys that are set. */
function isConfigured(p: SocialProvider) {
  if (!auth) return false;
  if (isWeb && p !== "discord") return true;
  return !!CLIENT_ID[p];
}

/**
 * One provider's sign-in button logic. Success signs in to Firebase; the app's auth listener
 * then loads the account, so callers only need to show errors.
 */
export function useSocialSignIn(provider: SocialProvider, onError: (message: string) => void) {
  const clientId = CLIENT_ID[provider];
  const redirect = redirectUri(provider);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? "not-configured",
      scopes: SCOPES[provider],
      redirectUri: redirect,
      // Facebook's native flow returns an access token directly; the others return a code (PKCE).
      responseType: provider === "facebook" ? AuthSession.ResponseType.Token : AuthSession.ResponseType.Code,
      usePKCE: provider !== "facebook",
    },
    DISCOVERY[provider]
  );
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    setBusy(false);
    const code = (e as { code?: string }).code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    onError(authMessage(e));
  };

  useEffect(() => {
    if (!response || !request || !auth) return;
    if (response.type === "error") return fail(new Error(response.error?.message ?? `${PROVIDER_LABEL[provider]} sign-in failed.`));
    if (response.type !== "success") return setBusy(false);
    const a = auth;
    (async () => {
      try {
        if (provider === "google") {
          const tokens = await AuthSession.exchangeCodeAsync(
            { clientId: clientId!, code: response.params.code, redirectUri: redirect, extraParams: { code_verifier: request.codeVerifier ?? "" } },
            DISCOVERY.google
          );
          if (!tokens.idToken) throw new Error("Google didn't return an ID token.");
          await signInWithCredential(a, GoogleAuthProvider.credential(tokens.idToken));
        } else if (provider === "facebook") {
          await signInWithCredential(a, FacebookAuthProvider.credential(response.params.access_token));
        } else {
          const r = await api.discord({ code: response.params.code, code_verifier: request.codeVerifier ?? "", redirect_uri: redirect, client_id: clientId! });
          await signInWithCustomToken(a, r.firebase_token);
        }
        setBusy(false);
      } catch (e) {
        fail(e);
      }
    })();
    // Run once per provider response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    configured: isConfigured(provider),
    busy,
    start: () => {
      if (!auth) return;
      setBusy(true);
      if (isWeb && provider !== "discord") {
        const p = provider === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
        signInWithPopup(auth, p).then(() => setBusy(false), fail);
        return;
      }
      promptAsync().catch(fail);
    },
  };
}
