alter table public.app_state
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1
    CHECK (version > 0);

NOTIFY pgrst, 'reload schema';
