import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean = Boolean(url && anon);

// Single client instance per app. When env vars are missing we still
// export a client-shaped value so callers can import unconditionally;
// `isSupabaseConfigured === false` gates all real calls.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // we handle /#/auth/callback explicitly
        storageKey: 'fts.auth',
        flowType: 'pkce',
      },
      realtime: { params: { eventsPerSecond: 2 } },
    })
  : // Placeholder client that will never be used because
    // `isSupabaseConfigured` gates every entry point.
    createClient('http://localhost.invalid', 'placeholder');
