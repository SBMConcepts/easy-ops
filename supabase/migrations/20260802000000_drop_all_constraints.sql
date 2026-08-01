-- Strip every constraint and index from all tables in the `public` schema so
-- they can be recreated manually on the Supabase platform.
-- Order matters: foreign keys are dropped before the primary/unique keys they
-- reference, and constraint-backed indexes are removed before loose indexes.

-- 1. Drop all FOREIGN KEY constraints.
DO $$
DECLARE
  r record;
BEGIN
    FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'f'
        AND connamespace = 'public'
    ::regnamespace
  LOOP
    EXECUTE format
    ('ALTER TABLE %s DROP CONSTRAINT %I;', r.tbl, r.conname);
END LOOP;
END $$;

-- 2. Drop all CHECK constraints (does not touch NOT NULL column attributes).
DO $$
DECLARE
  r record;
BEGIN
    FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
        AND connamespace = 'public'
    ::regnamespace
  LOOP
    EXECUTE format
    ('ALTER TABLE %s DROP CONSTRAINT %I;', r.tbl, r.conname);
END LOOP;
END $$;

-- 3. Drop all UNIQUE constraints.
DO $$
DECLARE
  r record;
BEGIN
    FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'u'
        AND connamespace = 'public'
    ::regnamespace
  LOOP
    EXECUTE format
    ('ALTER TABLE %s DROP CONSTRAINT %I;', r.tbl, r.conname);
END LOOP;
END $$;

-- 4. Drop all PRIMARY KEY constraints.
DO $$
DECLARE
  r record;
BEGIN
    FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'p'
        AND connamespace = 'public'
    ::regnamespace
  LOOP
    EXECUTE format
    ('ALTER TABLE %s DROP CONSTRAINT %I;', r.tbl, r.conname);
END LOOP;
END $$;

-- 5. Drop any remaining indexes that were not backed by a constraint above.
DO $$
DECLARE
  r record;
BEGIN
    FOR r IN
    SELECT schemaname, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    LOOP
    EXECUTE format
    ('DROP INDEX IF EXISTS %I.%I;', r.schemaname, r.indexname);
END LOOP;
END $$;
