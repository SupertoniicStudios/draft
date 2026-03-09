# Developer Best Practices

## Tech Stack
* **Framework:** React + Vite
* **Language:** TypeScript
* **Database & Auth:** Supabase (PostgreSQL, Realtime websockets, Auth)
* **Styling:** Vanilla CSS (`index.css`) utilizing global design tokens
* **Routing:** `react-router-dom`

## Naming Conventions
* **React Components:** `PascalCase` (e.g., `BigBoard.tsx`, `UpcomingPicks.tsx`). One component per file.
* **Hooks:** `camelCase` prefixed with `use` (e.g., `useDraftState.ts`).
* **Interfaces / Types:** `PascalCase` exported from their respective hook.
* **Database Tables / Columns:** `snake_case` (e.g., `draft_log`, `pick_number`, `draft_id`).

## Architectural Guidelines & Hard Boundaries

### 1. State Management (The Golden Rule)
**The Database is the Source of Truth.** Do not attempt to optimistically manipulate massive local arrays on websocket triggers.
* **BAD:** Receiving a realtime `INSERT` payload and attempting to manually `.push()` or `.filter()` local state arrays. Desyncs, missing relational data, and race conditions are inevitable.
* **GOOD:** Receiving a realtime event block and immediately calling `fetchState()` to redownload the deterministic, finalized state of the DB. 
* *Note:* UI Optimism should be restricted to visual state blocks (e.g., `isDrafting` spinners), not data integrity loops.

### 2. Multi-Tenancy
* **Always filter by `draft_id`.** Every table (except `players` and global config tables) has a `draft_id` foreign key. Querying without it leaks data across lobbies.
* **Supabase Realtime Filters:** Avoid utilizing Supabase `filter` attributes on channel subscriptions for `DELETE` commands. PostgreSQL drops all column data besides the primary key on a deletion. Thus, a filtered `.on('postgres_changes', { filter: 'draft_id=x' })` will silently drop `DELETE` events. 
* *Solution:* Subscribe to the *full* table and validate `draft_id` via the client payload, OR ensure your SQL migration utilizes `ALTER TABLE x REPLICA IDENTITY FULL;`.

### 3. Styling & Aesthetics
* Avoid utility heavy frameworks unless explicitly agreed upon. This project relies on a centralized `index.css` leveraging variables.
* Reference `--accent-primary` and `--bg-secondary` rather than hardcoding hex values to ensure effortless light/dark mode transitions down the line.

### 4. Database Migrations
* No manual clicking around the Supabase Studio dashboard to alter the schema.
* **ALL** changes to tables, functions, triggers, and Row Level Security (RLS) policies must be committed as `.sql` files in `supabase/migrations/` to guarantee reproduciability across branches.

### 5. String Normalization
* User input and text searches must be completely stripped of diacritics before matching. Use `str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")` to ensure "Acuña" and "Acuna" evaluate accurately.
