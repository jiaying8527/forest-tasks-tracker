-- Forest Tasks Tracker — Cloud Sync (feature 002-cloud-sync)
-- Schema + Row Level Security policies for the Supabase `profiles` table.
--
-- Apply this once per Supabase project by pasting it into the
-- SQL editor in the dashboard (Database → SQL → New query).
--
-- Safety: every statement is idempotent (CREATE ... IF NOT EXISTS,
-- CREATE OR REPLACE, DROP POLICY IF EXISTS before CREATE POLICY) so
-- re-running is safe.

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Trigger: keep updated_at fresh on every UPDATE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (belt + braces; prevents accidental
-- bypass if a future role is given ownership).
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Note: there is NO policy for the 'anon' role. Signed-out users
-- cannot read or write profiles rows at all. This matches FR-017 and
-- the v2.0.0 constitution: no anonymous access to user data, ever.

-- ----------------------------------------------------------------------------
-- 4. Realtime publication
-- ----------------------------------------------------------------------------

-- Ensure the `profiles` table is published to Supabase's realtime
-- stream. RLS still applies to realtime, so clients only see changes
-- to their own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
    AND    schemaname = 'public'
    AND    tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END
$$;
