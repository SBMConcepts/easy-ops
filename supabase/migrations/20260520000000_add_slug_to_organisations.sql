-- Add a URL-safe slug column to organisations so tenant-lookup can resolve
-- a subdomain (e.g. "acme") directly without guessing from auth0_org_id.
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organisations_slug
  ON public.organisations (slug);

-- Back-fill existing rows: derive slug from name using the same toSlug logic
-- as organisation-setup (lower-case, replace non-alphanumeric runs with '-').
UPDATE public.organisations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;
