import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Cookie wiring is in place so auth (Phase 5) works without touching callers.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll is a no-op in Server Components (cookies are read-only
          // there); auth session refresh happens in route handlers instead.
        }
      },
    },
  });
}
