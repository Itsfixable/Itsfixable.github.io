-- ===========================================================================
-- Query lab demo data (Experience → Rox AI internship).
--
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once: nothing is dropped, and existing rows are kept.
-- Every company, person and number in here is fictional.
-- ===========================================================================

-- 1. Table -----------------------------------------------------------------

create table if not exists public.demo_accounts (
  id               integer     primary key,
  name             text        not null,
  industry         text        not null,
  stage            text        not null,
  region           text        not null,
  arr_usd          integer     not null,
  employees        integer     not null,
  last_activity_at timestamptz not null,
  -- Heavy columns. The list view never selects these; they are fetched only
  -- when a row is opened (or prefetched when it is hovered).
  notes            text        not null,
  contacts         jsonb       not null,
  monthly_activity integer[]   not null
);

-- 2. Rows --------------------------------------------------------------------
-- 2,000 accounts generated inside Postgres. Values come from hashing the row
-- id rather than random(), so every run produces the same data.

with
words as (
  select
    array['Aster','Basalt','Cobalt','Drift','Ember','Fable','Granite','Harbor',
          'Indigo','Juniper','Kestrel','Lumen','Meridian','Nimbus','Orchard',
          'Pylon','Quarry','Riverly','Saltbox','Tidal','Umber','Vantage',
          'Willow','Yarrow','Zephyr'] as prefixes,
    array['works','line','forge','grid','field','stack','loop','path','yard',
          'wave'] as suffixes,
    array['Labs','Systems','Health','Logistics','Robotics','Analytics','Foods',
          'Energy','Studio','Capital'] as kinds,
    -- Same order as kinds: a "Foods" company is always Food & beverage.
    array['Biotech','Software','Healthcare','Logistics','Manufacturing',
          'Software','Food & beverage','Energy','Media',
          'Financial services'] as industries,
    array['North America','Europe','Asia-Pacific','Latin America'] as regions,
    array['Maya','Jonah','Priya','Theo','Lena','Omar','Sofia','Kenji','Ava',
          'Diego','Hana','Luca','Zara','Eli','Nora','Ravi'] as first_names,
    array['Okafor','Lindqvist','Moreau','Tanabe','Alvarez','Kowalski','Haddad',
          'Brennan','Iyer','Castillo','Novak','Sato','Mensah','Ferreira',
          'Larsen','Quinn'] as last_names,
    array['VP Operations','Head of Data','CTO','Procurement lead',
          'Engineering manager','CFO','Product lead','IT director'] as roles,
    array['usage-based pricing','a security review','SSO and audit logs',
          'a pilot for one region','replacing a legacy CRM',
          'an API integration','multi-year terms',
          'onboarding support'] as topics,
    array['send pricing','book a technical demo',
          'loop in their security team','share a case study',
          'schedule a pilot kickoff',
          'follow up after their board meeting'] as next_steps
),
seeds as (
  select
    g.i,
    -- 7919 is coprime with 2500, so j visits 0..2499 without repeats and
    -- every account gets a unique prefix/suffix/kind combination.
    ((g.i - 1) * 7919) % 2500 as j,
    abs(hashtext('a' || g.i)::bigint) as h1,
    abs(hashtext('b' || g.i)::bigint) as h2,
    abs(hashtext('c' || g.i)::bigint) as h3,
    abs(hashtext('d' || g.i)::bigint) as h4,
    abs(hashtext('e' || g.i)::bigint) as h5,
    abs(hashtext('f' || g.i)::bigint) as h6
  from generate_series(1, 2000) as g(i)
),
accounts as (
  select
    s.i,
    s.h1,
    s.h2,
    s.h3,
    w.prefixes[s.j % 25 + 1] || w.suffixes[(s.j / 25) % 10 + 1] || ' '
      || w.kinds[(s.j / 250) % 10 + 1] as name,
    w.industries[(s.j / 250) % 10 + 1] as industry,
    case
      when s.h3 % 100 < 25 then 'Prospect'
      when s.h3 % 100 < 45 then 'Discovery'
      when s.h3 % 100 < 62 then 'Evaluation'
      when s.h3 % 100 < 75 then 'Negotiation'
      when s.h3 % 100 < 90 then 'Closed won'
      else 'Closed lost'
    end as stage,
    w.regions[s.h1 % 4 + 1] as region,
    -- Log-spread so most accounts are small and a few are large:
    -- $10k to $5M, rounded to the nearest thousand.
    (round(10000 * power(500, (s.h2 % 100000) / 100000.0) / 1000) * 1000)::integer
      as arr_usd,
    -- 5 to 20,000 employees, same idea.
    round(5 * power(4000, (s.h6 % 100000) / 100000.0))::integer as employees,
    -- Anchored to a fixed date so the data never changes between runs.
    timestamptz '2026-10-15 17:00:00+00'
      - make_interval(days => (s.h4 % 365)::integer,
                      mins => (s.h5 % 1440)::integer) as last_activity_at
  from seeds s
  cross join words w
)
insert into public.demo_accounts (
  id, name, industry, stage, region, arr_usd, employees, last_activity_at,
  notes, contacts, monthly_activity
)
select
  a.i,
  a.name,
  a.industry,
  a.stage,
  a.region,
  a.arr_usd,
  a.employees,
  a.last_activity_at,
  format(
    '%s reached out about %s. Their team of about %s people is comparing '
    'options this quarter, and the main open question is %s. Budget sits '
    'with the %s. Next step: %s.',
    w.first_names[a.h1 % 16 + 1],
    w.topics[a.h2 % 8 + 1],
    a.employees,
    w.topics[(a.h2 + 3) % 8 + 1],
    w.roles[a.h3 % 8 + 1],
    w.next_steps[a.h1 % 6 + 1]
  ),
  (
    select jsonb_agg(
      jsonb_build_object(
        'name', w.first_names[(a.h1 + n * 5) % 16 + 1] || ' '
                || w.last_names[(a.h2 + n * 3) % 16 + 1],
        'role', w.roles[(a.h3 + n) % 8 + 1]
      )
      order by n
    )
    from generate_series(0, 1 + (a.h1 % 3)::integer) as n
  ),
  array(
    select (abs(hashtext(a.i || '-' || m)::bigint) % 30)::integer
    from generate_series(1, 12) as m
    order by m
  )
from accounts a
cross join words w
on conflict (id) do nothing;

-- 3. Indexes -----------------------------------------------------------------
-- Every sort ends in id so infinite-scroll pages never overlap or skip rows.

create index if not exists demo_accounts_arr_idx
  on public.demo_accounts (arr_usd desc, id);
create index if not exists demo_accounts_activity_idx
  on public.demo_accounts (last_activity_at desc, id);
create index if not exists demo_accounts_name_idx
  on public.demo_accounts (name, id);
create index if not exists demo_accounts_filters_idx
  on public.demo_accounts (industry, stage);

-- Fuzzy "name contains ..." search. Supabase installs extensions into the
-- `extensions` schema, but older projects may have pg_trgm in `public`, so
-- the index looks up wherever it actually lives.
create extension if not exists pg_trgm with schema extensions;

do $$
declare
  trgm_schema text;
begin
  select n.nspname into trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  execute format(
    'create index if not exists demo_accounts_name_trgm_idx '
    'on public.demo_accounts using gin (name %I.gin_trgm_ops)',
    trgm_schema
  );
end
$$;

-- 4. Access: read-only for the public API key ------------------------------

alter table public.demo_accounts enable row level security;

revoke all on public.demo_accounts from anon, authenticated;
grant select on public.demo_accounts to anon, authenticated;

drop policy if exists "Anyone can read demo accounts" on public.demo_accounts;
create policy "Anyone can read demo accounts"
  on public.demo_accounts
  for select
  to anon, authenticated
  using (true);

-- 5. Check -------------------------------------------------------------------
-- The SQL editor shows this last result: expect 2000.

select count(*) as rows_loaded from public.demo_accounts;
