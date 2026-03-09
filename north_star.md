# North Star: Fantasy Baseball Draft Application

## High-Level Goal
The primary objective of this project is to provide a robust, multi-tenant fantasy baseball draft client capable of supporting concurrent real-time "Draft Lobbies" (or "Rooms"). It prioritizes speed, accuracy, and administrative control, ensuring that leagues utilizing non-standard drafting mechanics (like keepers, traded picks, or offline adjustments) can execute their draft smoothly.

The application serves a league that requires granular, pick-by-pick override capabilities and linear straight draft orders as opposed to standard snake drafts.

## Component Parts & Functionality

### 1. The Lobby System (Draft Setup)
A multi-tenant approach allowing users to:
* **Create Lobbies:** Initializes a new Draft Sandbox. 
* **Join / Leave Lobbies:** Contextually binds the user to a specific `draft_id`.
* **Claim Teams:** Associates the authenticated user with a specific fantasy team franchise.
* **Customize Draft Order:** A drag-and-drop UI to manually set the linear draft sequence before taking the lobby "Live."

### 2. The Big Board
The primary interface for team managers during the draft.
* **Player Pool:** A massive list of available players, filterable by Position and searchable by name (utilizing diacritic-agnostic search logic).
* **Watchlist Integration:** Managers can "star" players they are interested in, allowing them to filter the Big Board to just their targets.
* **Draft Execution:** Clicking "Draft" securely inserts a pick into the `draft_log` provided it is legally that user's turn on the clock.
* **Real-time Syncing:** Players vanish instantly from the board when chosen by another team, while the 'On the Clock' header ticker instantly advances.

### 3. Team Rosters
A secondary viewing pane allowing users to:
* Inspect the composition of all 10 teams in the draft lobby in real-time.
* See merged outputs of both regular drafted players and pre-assigned "Keepers."

### 4. Commissioner Dashboard (`Commish.tsx`)
The administrative powerhouse of the application that allows for overriding normal constraints:
* **Force Picks:** The commissioner can manually attribute any player to any team, bypassing turn-order.
* **Undo Last Pick:** Instantly rolls back the latest draft selection in the chronological log.
* **Upload Keepers:** A CSV parser that ingests a roster of kept players and automatically assigns them to their respective teams prior to the draft starting.
* **Trade Picks:** Allows the Commish to swap the ownership of a specific future pick between two managers.
* **Download Results:** Exports the chronological `draft_log` to a CSV for external ingestion.

## Future Functionality (Planned / Discussed)
* **Optimization of React/Realtime State:** While realtime websockets function perfectly on the database side, the React component tree occasionally experiences race conditions requiring full-state invalidations. The goal is to perfect local state patches for maximum speed.
* **Responsive Layouts:** Ensuring the complex tabular data of the Big Board and the Commish Dashboard degrade gracefully on standard mobile viewports.
* **Timer Mechanisms:** Introducing an optional strict countdown clock for picks.
