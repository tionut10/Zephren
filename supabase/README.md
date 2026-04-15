# Zephren — Backend Supabase

Setup-ul și documentația infrastructurii cloud Zephren, bazată pe Supabase (PostgreSQL + Auth + Edge Functions).

## Arhitectura

```
┌──────────────────┐           ┌─────────────────────┐
│  React SPA       │ ←Vite→    │  Vercel Static      │
│  energy-calc.jsx │           │  energy-app.vercel  │
└────────┬─────────┘           └──────────┬──────────┘
         │                                │
         │ fetch /api/*                   │ POST/GET
         ↓                                ↓
┌──────────────────────────────────────────────────────┐
│  Vercel Serverless Functions (api/*.js, api/*.py)    │
│  • generate-cpe.py   — CPE DOCX                      │
│  • ocr-cpe.js        — Claude Vision                 │
│  • ai-assistant.js   — Claude API pentru chat import │
│  • calculate.js      — compute wrapper               │
│  • ancpi-proxy.js    — ANCPI registry proxy          │
└────────┬─────────────────────────────────────────────┘
         │
         │ @supabase/supabase-js
         ↓
┌──────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL 15 + Auth + Storage)           │
│  • profiles, teams, team_members, team_invitations   │
│  • projects (JSONB) — state complet proiect          │
│  • Storage bucket (opțional): photos, templates      │
└──────────────────────────────────────────────────────┘
```

## Setup inițial

### 1. Creează un proiect Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. New Project → alege regiunea `Frankfurt (EU Central)` pentru latență scăzută
3. Salvează `Project URL` și `anon public key`

### 2. Aplică schema

```bash
# Via Supabase CLI (recomandat)
npx supabase db push supabase/schema.sql

# Sau copy-paste în Dashboard → SQL Editor → Run
cat supabase/schema.sql | clip   # Windows
# → Paste în SQL Editor → Click "Run"
```

### 3. Configurează variabilele de mediu

**Local (`.env.local`)**:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Vercel (Dashboard → Settings → Environment Variables)**:

- `VITE_SUPABASE_URL` — aceeași valoare
- `VITE_SUPABASE_ANON_KEY` — aceeași valoare
- `SUPABASE_SERVICE_ROLE_KEY` — doar pentru serverless functions care au nevoie de bypass RLS

### 4. Verifică conexiunea

```bash
npm run dev
# Deschide http://localhost:5173
# Console browser: nu trebuie să apară "Running in offline mode"
```

## Schema overview

### `profiles`

Extensie peste `auth.users` cu date de aplicație:

| Column | Type | Note |
|---|---|---|
| `id` | uuid | → auth.users(id) |
| `name` | text | Din signup form |
| `email` | text | Redundant cu auth.users.email |
| `tier` | text | `free\|starter\|standard\|pro\|business\|asociatie` |
| `project_count` | int | Auto-increment la save proiect |
| `cert_count` | int | Auto-increment la generare CPE |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

**Trigger**: la `INSERT INTO auth.users`, se creează automat un rând în `profiles`.

### `teams` + `team_members` + `team_invitations`

Multi-user collaboration pentru planurile **Business** și **Asociație**:

- Owner = user care a creat team-ul (`teams.owner_id`)
- Membri = `team_members.role IN ('owner','admin','member','viewer')`
- Invitații pending expiră după 14 zile (auto via pg_cron — opțional)

### `projects`

JSONB blob pentru state complet:

```json
{
  "building": { "address": "...", "category": "RI", ... },
  "opaqueElements": [...],
  "glazingElements": [...],
  "heating": { "source": "CAZAN_GAZ", ... },
  "meta": { "name": "...", "date": "2026-04-15" }
}
```

Folosit de `cloudHandlers.saveToCloud()` și `loadFromCloud()`.

## RLS (Row Level Security) — Policies

Toate tabelele au RLS activat cu policies minime:

- **profiles**: user citește/editează doar propriul profil
- **teams**: user vede doar echipele unde e membru
- **team_members**: user vede doar membrii echipelor sale; owner poate șterge
- **team_invitations**: membri echipă + destinatar invitație (match pe email)
- **projects**: user vede proiectele proprii + cele ale echipei

**Production hardening** (TODO):
- Adaugă rate-limiting la insert (prevent spam)
- Audit log separat pentru modificări critice (change tracking)
- Policies mai fine pentru `admin` vs `member` pe teams

## Offline fallback

Aplicația rulează **fără Supabase** dacă variabilele de mediu lipsesc:

```js
// src/lib/supabase.js
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing env vars. Running in offline mode.");
}
export const supabase = (url && key) ? createClient(url, key, ...) : null;
```

În modul offline:
- Proiectele sunt salvate doar în `localStorage` / `window.storage`
- Undo/redo + versioning funcționează
- Export PDF/Excel/XML/CSV funcționează
- **Nu funcționează**: save cloud, team management, share links

## Migrații viitoare

Când modifici schema, creează fișier nou:

```bash
supabase/migrations/20260415_add_photos_table.sql
```

Aplică cu:
```bash
npx supabase db push
```

## Backup manual

```bash
# Export proiecte (pentru un user)
psql $DATABASE_URL -c "COPY (SELECT * FROM projects WHERE user_id='xxx') TO STDOUT" > backup.csv

# Export tot (admin)
pg_dump $DATABASE_URL --schema=public > full-backup.sql
```

## Troubleshooting

### „PGRST116 — Results contain 0 rows"

RLS blochează SELECT-ul. Verifică că user-ul curent are policy-ul corect.

### „duplicate key value violates unique constraint"

Trigger `on_auth_user_created` a încercat să INSERT în profiles un user care există deja. Nu e o eroare — e prevenit de `ON CONFLICT (id) DO NOTHING`.

### „relation 'team_members' does not exist"

Schema n-a fost aplicată. Re-run `supabase/schema.sql` în Dashboard.

## Referințe

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL 15 Docs](https://www.postgresql.org/docs/15/)
- [RLS Policies Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
