# Database Architecture & RLS

## Conceptual Model
The architecture is inherently built around isolated ecosystems called `drafts` (Lobbies). Data in this application is divided into two strict categories:

1. **Global Constants:** `players` 
2. **Lobby Contexts:** Data intrinsically tied to a specific draft room (`teams`, `draft_log`, `draft_order`, `keeper_lists`). 

## Tables Overview

### `drafts`
* **Purpose:** The top-level parent entity representing a draft session.
* **Key Columns:** `id`, `name`, `status` (`setup`, `active`, `completed`), `created_by`.

### `teams`
* **Purpose:** A fantasy baseball franchise within a specific draft.
* **Key Columns:** `id`, `name`, `user_id` (Auth claim), `draft_id`.

### `players`
* **Purpose:** The master dictionary of draftable assets. Sourced via CSV upload.
* **Key Columns:** `id`, `name`, `team`, `position`, `adp`.
* *Note:* We do NOT track draft status here, as a single player can be drafted by Team X in Lobby A and Team Y in Lobby B.

### `draft_order`
* **Purpose:** Denotes the structural roadmap of entire draft. Pre-generated when the draft "Launches".
* **Key Columns:** `draft_id`, `round`, `pick_number`, `current_team_id`.
* **Constraints:** A rigorous uniqueness constraint locking `(draft_id, round, pick_number)` ensuring no two picks share the exact same slot in a given lobby.

### `draft_log`
* **Purpose:** The chronological event stream of the draft. Think of this as the "Blockchain" ledger.
* **Key Columns:** `draft_id`, `team_id`, `player_id`, `timestamp`.
* *Note:* The front-end calculates the "Current Pick" by assessing `draft_order[draft_log.length]`.

### `keeper_lists`
* **Purpose:** Players securely pre-assigned to teams prior to the draft commencing.
* **Key Columns:** `draft_id`, `team_id`, `player_id`.

## Security Model (Row Level Security)

All functional endpoints are protected via **Row Level Security (RLS)** in PostgreSQL.
* `SELECT` policies are largely open to `authenticated` users, facilitating smooth spectator functionality.
* `INSERT` on `drafts` is open to authenticated users.
* `DELETE` on `drafts` is strictly prohibited unless `auth.uid() = created_by`.
* **Cascading:** All Foreign Keys pointing to `drafts(id)` enforce `ON DELETE CASCADE`. When a creator deletes their mock draft, all underlying logs, teams, and orders are automatically garbage-collected.

## Realtime Replication
Supabase evaluates realtime broadcasting at the Postgres logical replication slot.
**Critical Infrastructure:** 
```sql
ALTER TABLE draft_log REPLICA IDENTITY FULL;
```
For our front-end Websockets, standard row deletion typically only transmits the deleted UUID. We enforce `REPLICA IDENTITY FULL` so the database pushes the *entire* legacy schema of the row over the socket upon death. This is mandatory so the frontend can receive `{ draft_id: '123' }` during a DELETE event and verify it needs to update the active lobby.
