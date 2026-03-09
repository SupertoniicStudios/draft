# Pseudocode & File Breakdown

## Core Hooks (The Data Layer)

### `useDraftState.ts`
The foundational context of a Draft Lobby.
* **Inputs:** `draftId`
* **Fetches:** `teams`, `draft_order`, `draft_log`, `keeper_lists`.
* **Flow:** 
  1. Bootstraps the environment by firing `fetchState()` which resolves all four data arrays via Supabase API.
  2. Bootstraps a Supabase Realtime Channel. It listens to ANY mutation on ANY of the 4 core tables.
  3. If a mutation fires, it evaluates if the payload belongs to the active `draftId`. If yes, it re-fires `fetchState()`, creating a unified data update lock.
* **Exports:** The arrays, plus computed metrics: `currentPick` and `currentTeam` (using the length of `draftLog` mapped against the `draftOrder` grid).

### `usePlayers.ts`
Serves the global master pool of baseball players.
* **Inputs:** `draftId` (to grab the `draftLog` from `useDraftState`).
* **Flow:** Fetches the immutable `/players` database table. Maps through every player, cross-referencing their ID against the `draftLog` and `keepers` arrays.
* **Exports:** `computedPlayers`, where each object now possesses an `is_drafted: boolean` attribute specific solely to this lobby.

## Page Components (The View Layer)

### `DraftSetup.tsx`
* Uses `fetchDrafts` to list lobbies. 
* Houses `handleCreateDraft()`.
* Mounts child component `DraftOrderSetup.tsx` for visual drag-and-drop array mutations of `teams`, passing the resulting map to `handleStartDraft()`.
* **SQL Output:** Inserts 140 linear rows into `draft_order` upon draft initialization.

### `BigBoard.tsx`
* The primary interaction loop.
* Merges `useBigBoardPlayers` (the list) and `useWatchlist` (the stars).
* Employs memoized filtering to process diacritic-agnostic search heuristics and position maps.
* **SQL Output:** `handleDraftPlayer` inserts an entry into `draft_log`, verifying standard player turns.

### `Commish.tsx`
* Built to intentionally bypass standard logic rules.
* Mounts dropdowns populated by `teams` and `players`.
* **SQL Output:** `handleForcePick` fires directly to `draft_log` without assessing `currentPick` turn authority. `handleUndo` executes direct HTTP DELETE against `draft_log.id`. `handleUploadKeepers` loops over PapaParse results to execute HTTP UPSERT against `keeper_lists`.

### `Layout.tsx`
* The application shell.
* Validates `userId` auth bounds in a `useEffect`.
* Re-renders the Header navigation based on the existence of `localStorage.getItem('active_draft_id')`.
* Mounts `UpcomingPicks.tsx` in the Header to render a scrolling ticker fueled by `useDraftState`.
