-- Enable Supabase Realtime for the admin live activity feed (postgres_changes on AuditLog)
-- Run once in Supabase → SQL Editor.
-- Safe to re-run: skips if AuditLog is already in the publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'AuditLog'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "AuditLog";
  END IF;
END $$;
