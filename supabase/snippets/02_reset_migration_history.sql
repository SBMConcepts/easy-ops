-- reset supabase migration history to the single canonical schema file.
begin;

    create schema
    if not exists supabase_migrations;
create table
if not exists supabase_migrations.schema_migrations
(
  version text primary key,
  statements text[],
  name text
);

delete from supabase_migrations.schema_migrations;

insert into supabase_migrations.schema_migrations
    (version, name)
values
    ('20260731', '20260731_remote_schema');

commit;
