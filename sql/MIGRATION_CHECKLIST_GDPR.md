# Migrare GDPR & Planuri — Checklist Supabase Dashboard

**Versiune:** P0-5 (18 aprilie 2026)
**Fișier sursă:** `sql/migration_20_plans_expand.sql`
**Durată estimată:** 5–10 minute
**Reversibil:** Da (rollback la finalul fișierului sursă)

---

## 📋 Context

Pre-lansare, baza de date Supabase trebuie extinsă cu:

1. **Plan constraint expansion** — `profiles.plan` și `teams.plan` de la 3 la 6 valori (free/starter/standard/pro/asociatie/business)
2. **Consimțăminte GDPR** — coloane noi pe `profiles` (Art. 6-7 GDPR)
3. **Retenție proiecte** — coloane pe `projects` (Art. 5(1)(e) + arhivare fiscală 10 ani)
4. **Data Subject Requests** — tabelul `data_subject_requests` (Art. 15-22)
5. **Audit log acces** — tabelul `access_log` (Art. 30 minim)
6. **Funcție RPC ștergere** — `request_account_deletion()` (Art. 17 — dreptul la ștergere)

Tabelele `data_subject_requests` și `access_log` **NU** sunt în `schema.sql` sau `supabase/schema.sql` — se adaugă numai prin această migrare.

---

## ✅ Pași de rulare (SQL Editor Supabase)

### PAS 0 — Backup preventiv (2 min)

În Supabase Dashboard:
1. **Settings** → **Database** → **Backups**
2. Click **Create backup** — așteaptă confirmarea (nu e instant, dar e rapid pentru DB < 100 MB)
3. Notează ID-ul backup-ului pentru rollback potențial

### PAS 1 — Verificare stare curentă (1 min)

În **SQL Editor** → **New query**, rulați:

```sql
-- Verifică dacă constraint-ul actual admite noile planuri
SELECT pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname = 'profiles_plan_check';

-- Verifică ce coloane GDPR există deja pe profiles
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name LIKE 'consent_%' OR column_name LIKE '%_version';

-- Verifică dacă tabelele GDPR există
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('data_subject_requests', 'access_log');
```

**Rezultat așteptat (pre-migrare):**
- Constraint permite doar `'free', 'pro', 'business'`
- Coloanele `consent_*` → **nu apar**
- Tabelele `data_subject_requests` și `access_log` → **nu apar**

### PAS 2 — Aplicare migrare (2 min)

1. Deschide fișierul local: `sql/migration_20_plans_expand.sql`
2. Copiază **tot conținutul** (142 linii)
3. În Supabase SQL Editor → **New query** → lipește
4. Verifică că rulezi pe **proiectul corect** (colțul stânga-sus — nu pe `production` dacă nu ești 100% sigur)
5. Click **Run** sau `Ctrl+Enter`
6. Așteaptă mesajul `Success. No rows returned`

**Dacă primești eroare:**
- `constraint "profiles_plan_check" does not exist` → OK, e prima rulare, continuă
- `relation "public.certificates" does not exist` → linia 114 se va sări dacă tabela nu există; elimină manual blocul `delete from public.certificates...` din funcție înainte de rerulare
- `permission denied` → folosești `anon` key în loc de Dashboard SQL Editor; treci pe SQL Editor logat ca admin

### PAS 3 — Verificare post-migrare (2 min)

```sql
-- 3.1. Verifică constraint-ul nou (trebuie să conțină 6 valori)
SELECT pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname IN ('profiles_plan_check', 'teams_plan_check');

-- 3.2. Coloane noi pe profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN (
    'consent_privacy_at', 'consent_terms_at', 'consent_marketing_at',
    'privacy_version', 'terms_version'
  );

-- 3.3. Coloane retenție pe projects
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
  AND column_name IN ('retention_until', 'anonymized_at', 'archived_at');

-- 3.4. Tabele GDPR create
SELECT table_name, pg_relation_size(quote_ident(table_name)::regclass) AS size_bytes
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('data_subject_requests', 'access_log');

-- 3.5. RLS activat
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('data_subject_requests', 'access_log');
-- rowsecurity = true pe ambele

-- 3.6. Funcția RPC există și e callable de authenticated
SELECT
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_exec
FROM pg_proc p
WHERE p.proname = 'request_account_deletion';
-- authenticated_can_exec = true
```

**Toate cele 6 query-uri trebuie să returneze rânduri conforme.**

### PAS 4 — Smoke test funcțional (1 min)

```sql
-- Test 1: insert direct într-un plan nou (ca service_role / admin)
-- (NU rula pe user real în producție — doar verifică că nu dă constraint error)
-- Exemplu: pe un test user:
-- UPDATE profiles SET plan = 'starter' WHERE id = '<test-user-uuid>';

-- Test 2: policy RLS pentru data_subject_requests
-- (Ca user autentificat — ar trebui să meargă doar pe propriul user_id)
SELECT * FROM public.data_subject_requests LIMIT 1;
-- Expected: 0 rows (tabel gol) — fără eroare permission denied

-- Test 3: verifică că access_log e gol și RLS blochează INSERT fără service_role
-- (Rulat ca user normal ar trebui să dea permission denied la INSERT)
```

### PAS 5 — Actualizare `supabase/schema.sql` ȘI `sql/schema.sql` (1 min)

După ce migrarea e aplicată în cloud, actualizează și fișierele de schemă din repo pentru coerență:

1. Adaugă în `sql/schema.sql` și `supabase/schema.sql` definițiile tabelelor `data_subject_requests` și `access_log` (copiază din `migration_20_plans_expand.sql` secțiunile 5 + 6).
2. Actualizează constraint-ul `profiles.plan` să permită cele 6 valori (secțiunea 1).
3. Commit: `sql: consolidare schema după migrare GDPR P0-5`

**De ce:** următorul `supabase db reset` sau setup mediu nou trebuie să reproducă exact starea din producție.

---

## 🔄 Rollback (dacă ceva merge prost)

Deschide `sql/migration_20_plans_expand.sql`, secțiunea de la linia 132 (ROLLBACK):

```sql
-- Revenire constraint plan la 3 valori
ALTER TABLE public.profiles DROP CONSTRAINT profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'pro', 'business'));

-- Șterge coloanele GDPR adăugate
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS consent_privacy_at,
  DROP COLUMN IF EXISTS consent_terms_at,
  DROP COLUMN IF EXISTS consent_marketing_at,
  DROP COLUMN IF EXISTS privacy_version,
  DROP COLUMN IF EXISTS terms_version;

-- Coloane retenție projects
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS retention_until,
  DROP COLUMN IF EXISTS anonymized_at,
  DROP COLUMN IF EXISTS archived_at;

-- Tabelele GDPR
DROP TABLE IF EXISTS public.data_subject_requests CASCADE;
DROP TABLE IF EXISTS public.access_log CASCADE;

-- Funcția RPC
DROP FUNCTION IF EXISTS public.request_account_deletion();
```

**Important:** rollback-ul pierde orice DSR-uri deja înregistrate. Restaurează backup-ul de la PAS 0 dacă s-au acumulat date reale.

---

## 🔐 Obligații operaționale post-migrare

1. **Loghează evenimente în `access_log`** din endpoint-urile server-side critice:
   - `login`, `project_read`, `project_write`, `project_delete`, `export_json`, `export_docx`, `export_xml`
   - Câmpurile necesare: `user_id`, `action`, `resource` (project_id), `ip_address`, `user_agent`
   - Folosește `SUPABASE_SERVICE_KEY` (nu anon) — RLS nu permite INSERT pe user normal.

2. **Expune UI pentru cereri DSR** (Settings → GDPR):
   - Dropdown request_type: access / rectification / erasure / portability / restriction / objection
   - INSERT în `data_subject_requests` via Supabase client autentificat
   - Confirmare în email (Resend)
   - Termen răspuns: max. 30 zile (Art. 12 GDPR)

3. **Cron mensual** — ștergere fizică proiecte `archived_at < now() - interval '30 days'`
   (păstrăm 10 ani doar anonimizate, pentru fisc — nu PII).

4. **Update Privacy Policy** — să menționeze:
   - Pașii DSR (acces, rectificare, ștergere, portabilitate)
   - Adresa de contact DPO (dpo@zephren.com sau contact@zephren.com)
   - Versiunile `privacy_version` / `terms_version` tracked în DB

---

## ✅ Checklist final

- [ ] Backup creat înainte de rulare
- [ ] Query-urile de verificare pre-migrare rulate (PAS 1)
- [ ] Migrarea `migration_20_plans_expand.sql` executată complet (PAS 2)
- [ ] Toate 6 query-uri de verificare post-migrare OK (PAS 3)
- [ ] Smoke test RLS funcțional (PAS 4)
- [ ] `supabase/schema.sql` și `sql/schema.sql` consolidate (PAS 5)
- [ ] Commit repo: `sql: consolidare schema după migrare GDPR P0-5`
- [ ] UI DSR + endpoint access_log planificat pentru sprint următor
- [ ] Privacy Policy actualizat cu proces DSR + versioning

---

**Sursă completă:** `sql/migration_20_plans_expand.sql`
**Referință GDPR:** Regulamentul UE 2016/679, Art. 5(1)(e), 6, 7, 15-22, 30
