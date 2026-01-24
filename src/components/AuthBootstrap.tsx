import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global auth guard for session recovery.
 *
 * Why: If localStorage contains a stale/invalid refresh token, the client can get stuck
 * repeatedly trying to refresh (400 refresh_token_not_found), causing "login not sticking".
 *
 * This component listens once at app root and clears broken auth storage on refresh failures.
 */
export function AuthBootstrap() {
  useEffect(() => {
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

    const clearAuthStorage = () => {
      if (!projectRef) return;
      const prefixes = [
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token-code-verifier`,
      ];
      for (const key of Object.keys(localStorage)) {
        if (prefixes.some((p) => key.startsWith(p))) {
          localStorage.removeItem(key);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // NOTE: Some SDK versions include TOKEN_REFRESH_FAILED; cast to avoid TS narrowing errors.
      if ((event as unknown as string) === "TOKEN_REFRESH_FAILED") {
        // Clear broken local session and sign out on next tick (avoid auth callback deadlock)
        clearAuthStorage();
        setTimeout(() => {
          supabase.auth.signOut();
        }, 0);
      }
    });

    // If storage is corrupted, clear it early to prevent refresh loops.
    // (Don’t block render; best-effort only.)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) return;
        if (!projectRef) return;

        const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (!raw) return;

        try {
          JSON.parse(raw);
        } catch {
          clearAuthStorage();
        }
      })
      .catch(() => {
        // ignore
      });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
