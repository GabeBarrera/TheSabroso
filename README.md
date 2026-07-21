# The Sabroso

A local-first field journal for San Diego restaurants, recipes, and map notes. Three views — About, Map, Recipes — with all data stored in the browser's `localStorage`. No backend, no build step.

Live at [thesabroso.com](https://thesabroso.com)

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 (CDN, no bundler) |
| JSX | Babel Standalone (in-browser transform) |
| Map | Leaflet 1.9 + MarkerCluster + CartoDB tiles |
| Fonts | Playfair Display · Manrope · JetBrains Mono |
| Persistence | `localStorage` (restaurants and recipes seeded from JSON on first visit) |
| Geocoding | Nominatim reverse geocoding API |
| Weather | Open-Meteo API |

No npm, no build step. Open `index.html` from any static file server and it runs.

---

## File structure

```
TheSabroso/
├── index.html               # Entry point — loads all scripts
├── recipe.html              # Standalone recipes-only PWA variant
├── editor.html              # Standalone data editor (open in browser)
├── 404.html                 # Error page
├── manifest.json            # PWA manifest for main app
├── recipe-manifest.json     # PWA manifest for recipe.html
│
├── data/
│   ├── restaurants.json     # Seed data — loaded into localStorage on first visit
│   └── recipes.json         # Seed data — loaded into localStorage on first visit
│
└── src/
    ├── scripts/
    │   ├── storage.js       # localStorage helpers (SDStore) — plain JS, no JSX
    │   ├── components.js    # Shared UI: StarRating, RichEditor, Modal, Toast, ManageMenu, GlobalSearch
    │   ├── forms.js         # RestaurantForm, RecipeForm, NoteForm, ImportDialog, and more
    │   ├── views.js         # AboutView, MapView, RecipesView, RestaurantProfile, NoteProfile
    │   └── app.js           # Root App component, routing, state, CRUD handlers
    │
    └── styles/
        └── styles.css       # All styles — newspaper aesthetic, dark/light themes
```

---

## Running locally

Serve the project root with any static file server. The `fetch()` calls for seed data require HTTP, so opening `index.html` directly via `file://` will skip seeding (the app will start empty on first visit).

```bash
# Python
python -m http.server 8080

# Node
npx serve .

# VS Code
# Install the "Live Server" extension, then right-click index.html → Open with Live Server
```

Then open \`http://localhost:8080\`.

### Local dev server with write-back (\`server.py\`)

\`server.py\` is an optional stdlib-only server (no pip installs) that serves the static files **and** exposes a tiny REST API which writes admin edits straight back to \`data/*.json\` on disk:

\`\`\`bash
python server.py          # port 8000
python server.py 9000     # custom port
\`\`\`

| Route | Method | Effect |
|---|---|---|
| \`/api/ping\` | GET | Health check — \`{"ok": true}\` |
| \`/api/restaurants\` · \`/api/recipes\` · \`/api/notes\` | GET | Returns the seed array |
| \`/api/restaurants\` · \`/api/recipes\` · \`/api/notes\` | POST | Overwrites the matching \`data/*.json\` with the posted array (atomic temp-file write) |

How the app uses it: \`SDStore.serverSync()\` runs only when **an admin is logged in** and a ping to \`/api/ping\` succeeds. On any static host (GitHub Pages, \`file://\`, \`python -m http.server\`) the ping fails and the app silently falls back to localStorage-only behaviour. When a write lands, the app dispatches a \`sabroso:synced\` DOM event. This is the second of two write-back paths — the other is the editor's Chromium-only **Connect data folder** (File System Access API); \`server.py\` works in any browser but requires the Python process.

### Watch / tiny-screen mode

The app detects viewports **≤ 220px wide** (\`isWatch\`) and renders a stripped-down layout for smart-watch-class screens. \`index.html\` also sets \`<meta name="disabled-adaptations" content="watch">\`.

---

## Views

### About

Masthead with the journal's title, byline, intro paragraph, and version/coordinate metadata, plus a link to the author's site.

Below the masthead, a **This Week's Logs** strip shows the three most recently added entries — restaurants, recipes, or notes — as newspaper-style cards. Each card is clickable and jumps straight to that entry's profile, recipe, or note.

### Map

Leaflet map of San Diego. Each entry drops a color-coded pin:

- **Terracotta (R)** — restaurant (or restaurant + bar)
- **Blue (B)** — bar only
- **Gold square** — note
- **Pulsing blue dot** — your current location (if geolocation is granted)

Hover or tap a pin to open its popup with name, cuisine, and address — plus a **Directions ↗** link (opens Google Maps) and, when location is enabled, **walking time and distance** from where you are. Click **Open profile →** or **Open note →** for the full detail modal.

Pins are **clustered** when zoomed out (count shown in a circle; click to expand) and **jittered** apart when several entries share the same coordinates, so overlapping pins stay individually clickable.

**Open now.** Restaurants that have business hours show a live **Open now / Closed** status — with the next closing or opening time — in their popup and full profile. An **Open now** toggle in the map command bar filters the map down to just the places open at the current moment.

The map chrome shows real-time **weather** (temperature + condition icon) and your **current neighborhood** via reverse geocoding. Both update automatically on load.

On first visit the app asks — via an in-theme dialog — whether to use your location. Allow it and a pulsing blue dot marks your position and powers walk-time estimates; decline and it falls back to an approximate downtown marker. The choice is remembered for the session.

**Filtering.** The top-left corner has a filter row. Toggle any cuisine or the Restaurant / Bar tags to hide or show those pins on the map. Active filters persist while you navigate.

**Voice commands.** Click the mic icon to speak a command:

| Phrase | Effect |
|---|---|
| `surprise me` | Opens a random restaurant profile |
| `craving [cuisine]` | Suggests a matching restaurant |
| `hide all` / `show all` | Hides or shows all pins at once |
| `hide [cuisine / bar / restaurant]` | Hides matching pins |
| `show [cuisine / bar / restaurant]` | Shows hidden pins |
| `find nearest restaurant` | Uses your location + haversine distance to open the closest entry |
| `find [keyword]` | Keyword search across name, cuisine, address, and description |

Next to the mic is a **command bar** — type any of the same commands (or `help`) and press Enter to run them without speaking. Results appear in a collapsible **Voice Result** drawer (with distance info where applicable), and `help` opens a modal listing every command.

### Recipes

Split-pane layout: a searchable/sortable sidebar on the left, a detail panel on the right.

**Search.** The search bar filters by name, cuisine, tagline, and description text simultaneously.

**Sort.** The sort dropdown offers:

| Option | Behavior |
|---|---|
| A–Z / Z–A | Alphabetical by name |
| Time | Ascending by cook time |
| Serves | Ascending by serving count |
| Cuisine | Grouped sections by cuisine (expand/collapse) |
| Type | Grouped sections by badge type (Meat, Seafood, Veg, Baked, Sweet) |
| Cost | Ascending by total ingredient cost (recipes without costs sort last) |

**Badge filter.** Below the sort control, pill badges let you filter the list to only show recipes of a given type. Active badge is highlighted; click again to clear.

**Favorites.** Click the ★ next to any recipe to favorite it. Favorited recipes sort to the top of the list regardless of the active sort order. Favorites persist in `localStorage`.

**Recipe badges** are auto-detected from the recipe name and cuisine:

| Badge | Triggered by |
|---|---|
| Meat | beef, pork, chicken, lamb, steak, asada, carnitas, etc. |
| Seafood | fish, shrimp, salmon, crab, lobster, tuna, etc. |
| Veg | vegetarian, vegan, salad, vegetable, etc. |
| Baked | bread, cake, cookie, pastry, pizza, etc. |
| Sweet | dessert, chocolate, ice cream, pie, tart, etc. |

---

## Recipe detail

Selecting a recipe opens a two-column detail layout.

**Left — the ingredients aside:**
- A **Serves** count and an ×1 / ×2 / ×3 **scaler**
- A **cost roll-up** (when ingredients carry costs): total "at the till" and per-serving, both scaling with the multiplier
- The structured ingredient list — number, qty + unit + name, optional notes, and per-item cost
- An **Add to grocery** button

**Right — the method:**
- Header with cuisine + filed/updated date, a **favorite** star, a **copy-link** button, and (admin only) an **Edit** button
- Recipe name, an inline meta row (time · serves · per-serving cost), and the tagline
- The rich-HTML method, rendered as numbered steps
- An auto-extracted **pull-quote** — the longest emphasized (`<em>` / `<strong>`) phrase in the method, surfaced as a callout

**Ingredient scaling.** The ×1 / ×2 / ×3 buttons multiply every ingredient quantity, the serving count, and all costs at once. Fractions (`1/2`), mixed numbers (`1 1/2`), and ranges (`4–5`) are parsed before scaling.

**Striking.** Click any ingredient in the aside, or any method step, to cross it out while cooking. Both reset when you switch recipes.

**Add to Grocery.** The button at the foot of the ingredients aside sends the recipe's ingredients (with costs) to the Grocery List. Re-clicking refreshes that recipe's block rather than appending a duplicate.

**Copy link.** The link button copies a deep link (`/#recipes/{id}`) to the clipboard so a recipe can be shared or bookmarked.

**Edit button.** Admin only — opens the recipe's edit form directly from the detail panel.

**Mobile.** The sidebar and detail collapse to one column; selecting a recipe hides the list, and a **← Recipes** button brings it back.

**Legacy migration.** Older recipes that stored ingredients as `<ul><li>` elements inside the description field are automatically migrated to the structured `ingredients` array on first load. The `<h3>` "Ingredients" header and list are removed from the description and parsed into `qty`, `unit`, and `name` fields.

---

## Navigation

The three views (Map, About, Recipes) are arranged in a horizontal carousel.

| Input | Effect |
|---|---|
| Arrow Left / Arrow Right | Move one view in that direction |
| ⌘K / Ctrl+K | Toggle global search |
| / | Open global search |
| Home | Jump to the About view |
| Swipe left / right | Swipe on mobile or touchpad to advance views |

The last active view is saved to `localStorage` (`sabroso_last_view`) and restored on the next visit.

**Deep-linking.** Append a hash to jump directly to a profile on load:

| URL | Effect |
|---|---|
| `/#map/{id}` | Open the Map view with that restaurant/note profile already open |
| `/#recipes/{id}` | Open the Recipes view with that recipe selected |

---

## Global search

A command-palette-style overlay searches **recipes, restaurants, and notes** at once. Open it with **⌘K / Ctrl+K**, the **`/`** key, or the search icon in the bottom dock.

- Matches across name, cuisine, address, tagline, description, ingredients, and tags
- Results are grouped by type (Recipes · Restaurants · Notes & Map Pins) with a matching-text snippet, and a per-serving cost for recipes
- Navigate with **↑ / ↓**, open with **Enter**, dismiss with **Esc**
- Picking a result jumps to the right view and opens that restaurant profile, recipe, or note

---

## PWA

The app ships with a Web App Manifest and can be installed as a standalone PWA on desktop and mobile. On first visit, a dismissible install prompt appears if the browser supports it.

- **Main app** (`manifest.json`): name "The Sabroso", short name "Sabroso", start URL `/`
- **Recipes variant** (`recipe-manifest.json`): name "The Recipes", short name "Recipes", start URL `/recipe.html`

`recipe.html` is a standalone page that loads only the Recipes view and its own manifest — useful as a lightweight cooking companion app installed separately from the full journal.

### Browser vs. PWA behavior

The app detects its display context via `matchMedia('(display-mode: standalone)')` and adjusts behavior accordingly:

| Context | Data on load | Recipes manage area |
|---|---|---|
| Browser tab (not installed) | Always fetches fresh seed data silently — no prompt, no reload | Hidden (admin) or nothing (non-admin) |
| Installed PWA + not admin | Seeds on first visit only; data persists across opens | **Resync** button — triggers the confirmation modal |
| Installed PWA + admin | Seeds on first visit only | Full **Manage** menu |

The browser auto-refresh keeps read-only visitors in sync with the latest seed files without any user action. The PWA preserves local edits between sessions, so resync is always an explicit choice.

---

## Bottom dock

A floating action bar persists across all views. The three-dot FAB collapses and expands it.

| Icon | Available on | Effect |
|---|---|---|
| Search | All views | Open global search across recipes, restaurants, and notes |
| Notepad | Recipes view | Toggle the Grocery List panel |
| Eye | Map view | Show / hide the weather and location chrome on the map |
| Edit | About view | Open `editor.html` in a new tab |
| Sun / Moon | All views | Toggle light / dark theme |
| Lock | All views | Open the admin login modal |

---

## Dropping a map pin

Press and hold anywhere on the map (600 ms) to drop a pin at that location. A picker appears asking whether to place a **Restaurant** or a **Note**. Both forms open pre-filled with the coordinates from the drop point.

---

## Managing data

### Manage menus

**Map view** — two manage menus in the top-right corner:

**Notes** menu:
- New note, Edit existing, Import (`notes.json`), Backup (`notes.json`)

**Manage** (restaurants) menu:
- New entry, Edit existing, Import, Backup, Resync data

**Recipes view** — the header control in this area varies by context:

- **Admin (any context):** Full **Manage** menu with New, Edit, Import, Backup, and Resync for recipes.
- **PWA, not admin:** A single **Resync** button that opens the resync confirmation modal.
- **Browser tab, not admin:** No control shown — data is refreshed automatically on every load.

### Backup

The restaurant **Backup** button opens a modal with export options:
- `restaurants.json` — always available
- `contacts.json` — admin only
- Both files — admin only

Both restaurant and recipe entries can also be exported as **CSV** directly from their forms (Edit mode), producing a flat spreadsheet-friendly file.

### Import

The restaurant **Import** button opens a picker:
- `restaurants.json` — always available (duplicate detection with per-entry overwrite/discard)
- `contacts.json` — admin only
- Both files — admin only

Notes and recipes import directly using the same duplicate-detection flow.

### Resync data

Wipes `sabroso_restaurants`, `sabroso_recipes`, and `sabroso_contacts` from `localStorage`, then reloads from the seed JSON files. Notes are **not** cleared — they are user-generated and have no seed equivalent.

---

## Grocery list

Accessible via the notepad icon in the bottom dock (visible only while on the Recipes view).

**Adding ingredients:**
- Click the **Add to grocery** button in any recipe's ingredients aside to add that recipe's structured ingredients (qty + unit + name + cost) to the list.
- Re-clicking replaces that recipe's existing block — not a duplicate append.
- Type a custom item into the input at the bottom of the panel and click **Add**.

**Two view modes (tabs at the top of the panel):**
- **Per Recipe** — items grouped under their source recipe name. Each group has a **Remove** button to drop that recipe's entire block.
- **Totals** — all items aggregated alphabetically. Quantities are parsed and summed across recipes (e.g. `1/2 cup flour` from two recipes → `1 cup flour`). Source recipes are listed beneath each line.

Items that carry a cost show it on the right, and a **Total Cost** row at the foot of the panel sums every priced item.

**Checking off and clearing:**
- Tap any item to check it off (strikethrough). Checked state persists in `localStorage` under `sabroso_grocery_checked`.
- Individual items can be removed with the **×** button (By Recipe view only).
- **Clear all** wipes the entire list and resets all checked state.

---

## Admin mode

Click the lock icon in the bottom dock to log in. Default password: **anyonecancook**.

Admin unlocks:
- **Manage menu** in the Recipes view header (New, Edit, Import, Backup, Resync)
- **Edit button** in the recipe detail panel
- Contacts management on restaurant profiles (stored separately in `sabroso_contacts`)
- `contacts.json` backup and import options
- Additional warning text in the Resync confirmation

Admin session is stored in `sessionStorage` and expires when the tab is closed.

---

## Dark / light theme

The sun/moon icon in the bottom dock toggles between light and dark themes. The preference is saved to `localStorage` under `sabroso_theme` and applied on every load.

---

## Data editor (`editor.html`)

Open `editor.html` from the same static server for a full CRUD interface over restaurants, recipes, and notes.

**Features:**
- Tab interface — **Restaurants** | **Recipes** with entry counts
- Restaurant list showing name, cuisine, address, tag badges (R/B), and star rating
- Recipe list showing name, cuisine, cook time, and serves
- **Edit** button per entry to open the full form in a modal
- **New Restaurant / New Recipe** buttons
- **Export JSON** button per collection
- **Notes** tab for map pins (`data/notes.json`)
- **Export All** to download all three collections at once
- **Reload** to re-read from disk / JSON files without navigating away
- **Connect data folder** (top-right) — grants the editor write access to the `data/` folder so every edit is written straight to `data/*.json` on disk, no server required. The folder is remembered across reloads. Chromium-only (Chrome/Edge/Brave); other browsers fall back to localStorage + Export. Works under any static host, e.g. `python -m http.server 8000`.
- All changes also save to `localStorage` so the main app reflects them immediately in the same browser
- Toast notifications for success/error feedback

Forms in the editor are the same components used in the main app, including the full rich-text editor.

---

## Rich-text editor

The description fields in restaurant and recipe forms use a `contentEditable` rich-text editor with a formatting toolbar:

| Button | Action |
|---|---|
| **B** | Bold |
| *I* | Italic |
| U | Underline |
| P | Paragraph (body text) |
| H₃ | Heading |
| H₂ | Big heading |
| • — | Unordered list |
| 1. | Ordered list |
| ▢ Photo | Insert image (browse `src/img/`, enter filename, or upload from device) |
| ⌫ | Clear formatting — strips bold/italic/heading/list from the current block; auto-selects the block if nothing is highlighted |
| Note | Insert a muted, smaller-text note paragraph (e.g. "Notes: store in an airtight container…") |

---

## localStorage keys

| Key | Contents |
|---|---|
| `sabroso_restaurants` | Array of restaurant objects (seeded from `data/restaurants.json`) |
| `sabroso_recipes` | Array of recipe objects (seeded from `data/recipes.json`) |
| `sabroso_contacts` | Object mapping restaurant ID → array of `{title, name}` contacts |
| `sabroso_notes` | Array of note objects |
| `sabroso_admin_pw` | SHA-256 hash of the admin password (absent = use default) |
| `sabroso_admin_session` | Set to `"1"` while an admin session is active |
| `sabroso_recipe_favs` | Array of favorited recipe IDs |
| `sabroso_grocery` | Array of grocery list items (each with `id`, `text`, `cost`, `recipeId`, `recipeName`) |
| `sabroso_grocery_checked` | Array of checked ingredient keys (ingredient text lowercased) |
| `sabroso_theme` | `"light"` or `"dark"` |
| `sabroso_last_view` | Index of the last active view (0 = Map, 1 = About, 2 = Recipes) |

---

## Schemas

### Restaurant

```json
{
  "id":              "r1",
  "name":            "Garage Buona Forchetta",
  "address":         "3001 Beech St, San Diego, CA 92102",
  "cuisine":         "Italian",
  "rating":          4.7,
  "lat":             32.6853,
  "lng":             -117.1789,
  "tags":            ["restaurant"],
  "description":     "<p>HTML review content...</p>",
  "website":         "https://buonaforchettasd.com",
  "reservationLink": "https://www.opentable.com/...",
  "hours":           {
    "mon": { "closed": true },
    "tue": { "open": "11:30", "close": "21:00" },
    "sat": { "open": "10:00", "close": "22:00" }
  },
  "createdAt":       "2026-01-14"
}
```

`tags` accepts any combination of `"restaurant"` and `"bar"`. Contacts are stored separately in `sabroso_contacts` keyed by restaurant `id`.

`hours` is optional and keyed by short day name (`mon`–`sun`); each day is either `{ "closed": true }` or `{ "open": "HH:MM", "close": "HH:MM" }` in 24-hour time (a `close` earlier than `open` means it runs past midnight). It is edited per-day in the restaurant form and drives the **Open now** status and map filter. Days with no entry are treated as closed.

### Recipe

```json
{
  "id":          "rec1",
  "name":        "Carne Asada — The Only Way",
  "cuisine":     "Mexican",
  "time":        45,
  "serves":      4,
  "tagline":     "Skirt steak, charred lime, no shortcuts.",
  "ingredients": [
    { "qty": "2", "unit": "lb",   "name": "skirt steak", "notes": "ask for outside skirt", "cost": "14.00" },
    { "qty": "2", "unit": "tbsp", "name": "olive oil",   "notes": "", "cost": "" }
  ],
  "description": "<p>HTML method content...</p>",
  "createdAt":   "2025-09-20",
  "modifiedAt":  "2026-01-12"
}
```

`ingredients` is a structured array separate from `description`. Each entry has `qty`, `unit`, `name`, and optional `notes` and `cost` fields. When ingredients carry costs, the recipe shows total and per-serving roll-ups and can be sorted by cost. `modifiedAt` is stamped automatically whenever a recipe is edited — the detail header then reads "Updated …" instead of "Filed …". Older recipes without an `ingredients` field are auto-migrated from `<li>` elements in the description on first load.

### Note

```json
{
  "id":          "n_abc123",
  "name":        "Sunset viewpoint",
  "tag":         "Viewpoint",
  "address":     "Cabrillo National Monument",
  "lat":         32.6735,
  "lng":         -117.2425,
  "description": "<p>HTML notes content...</p>",
  "createdAt":   "2026-06-01"
}
```

`address` is optional. `tag` is freeform text (e.g. `"Parking"`, `"Hidden Gem"`, `"Note"`).

### Contacts (stored separately)

```json
{
  "r1": [
    { "title": "General Manager", "name": "Jane Smith" },
    { "title": "Chef",            "name": "John Doe"   }
  ]
}
```

Contacts are an object keyed by restaurant `id`, stored in `sabroso_contacts`. They are never written into `restaurants.json`.

---

## Potential improvements

The app is deliberately build-free, which keeps it approachable but leaves several things on the table. In rough priority order:

**Architecture & performance**
- **Ship production React and precompile JSX.** `index.html` loads `react.development.js` / `react-dom.development.js` and transforms four `.js` files with Babel Standalone *in the browser* on every load. This is the single biggest win: swap to the minified `production.min.js` builds and move JSX transpilation to a one-shot build step (esbuild / Vite) to cut both bytes and first-paint time dramatically. The no-build ethos can be preserved with a committed `dist/` bundle.
- **Split the monolith files.** `views.js` is ~1,800 lines and mixes map, recipes, profiles, grocery, weather, and open-hours logic. Break it into modules (once a bundler exists) so each concern is independently readable and testable.
- **De-duplicate shared logic.** There are two haversine implementations (`haversine` in miles in `app.js`, `haversineKm` in `views.js`) and two ingredient parsers (`parseIngredientText` for legacy migration vs. `parseIngredient` for scaling). Consolidate into one utilities module.
- **Manual cache-busting is fragile.** The `?v=1780976600` query strings on CSS/JS are hand-edited; a build step should stamp these automatically (content hash) so stale assets can't be served.

**Offline / PWA**
- **No service worker.** Both `manifest.json` files declare a PWA, but nothing caches the shell or the CDN dependencies (React, Leaflet, fonts), so the "installed" app is broken offline — exactly when a field journal is most useful. Add a service worker that precaches the app shell and seed JSON.

**Data & correctness**
- **Grocery totals parsing is lossy.** `buildTotals` sums quantities per ingredient name but can't reconcile mixed units (e.g. `1 cup` + `200 g` of the same item), and unit normalization is limited. Consider a small unit-conversion table or grouping by `name + unit`.
- **Legacy migration runs on every load.** `migrateRecipeLegacy` re-parses `<li>` ingredients each time recipes load; once migrated it could be written back so the parse only happens once.
- **No schema validation on import.** Import dialogs trust the JSON shape; a malformed file can inject bad records. A lightweight validator would harden the import/backup round-trip.

**Security**
- **Admin mode is client-side only and not real security.** The password check compares a SHA-256 hash held in `localStorage`, defaulting to `anyonecancook`, all in the browser — trivially bypassable via devtools. This is fine for a personal journal but should be documented as UI-gating, not access control. Any genuinely sensitive data (contacts) should not rely on it.

**Accessibility & UX**
- **Add focus management and ARIA to modals.** Overlays should trap focus, restore it on close, and expose `role="dialog"` / `aria-modal`. Escape-to-close exists in places but isn't universal.
- **No error boundaries.** A throw in any view crashes the whole app to a blank `#root`. A top-level React error boundary with a themed fallback would keep the journal usable.
- **Reduced-motion support.** The carousel and scribble filters animate unconditionally; honour `prefers-reduced-motion`.

**Tooling**
- **No tests and no linting.** Even a handful of unit tests around the parsers (`parseIngredient`, `scaleQty`, `getOpenStatus`, `buildTotals`) plus an ESLint pass would catch regressions in the trickiest pure functions.

---

## Dev Log

Running notes on fixes that need doing or would be nice to have. Newest at the top; move items to a "Done" note as they land.

### 🔴 Major (correctness / breaks a promised feature)
- [ ] **Service worker for offline PWA** — installed app currently can't load without network (CDN deps uncached). Highest-impact PWA fix.
- [ ] **Production React + precompiled JSX** — stop shipping dev builds and in-browser Babel; add a build step or committed bundle.
- [ ] **Grocery "Totals" mixed-unit handling** — quantities across different units silently mis-sum; group by `name + unit` or convert.
- [ ] **Top-level error boundary** — one thrown error blanks the entire app; add a themed fallback.
- [ ] **Document admin mode as non-secure** — make explicit in UI/README that admin gating is cosmetic, not access control.

### 🟡 Minor (bugs / rough edges)
- [ ] **Consolidate duplicate helpers** — two haversine fns, two ingredient parsers; unify into a utils module.
- [ ] **Persist legacy migration** — write migrated recipes back so `migrateRecipeLegacy` doesn't re-parse every load.
- [ ] **Automate cache-busting** — replace hand-edited `?v=` strings with build-stamped hashes.
- [ ] **Import schema validation** — reject malformed records instead of trusting shape.
- [ ] **Modal focus trap + ARIA** — focus management and `role="dialog"` across all overlays.
- [ ] **Honour `prefers-reduced-motion`** on the carousel and scribble filters.

### 🟢 Nice to have
- [ ] **Split `views.js`** into per-concern modules once a bundler exists.
- [ ] **Unit tests** for `parseIngredient`, `scaleQty`, `getOpenStatus`, `buildTotals`; add ESLint.
- [ ] **Undo for destructive actions** (delete entry / clear grocery list / resync) via a toast with an Undo action.
- [ ] **Bulk edit in the editor** — multi-select delete/export.
- [ ] **Photo handling** — the rich-text editor accepts uploads but there's no image-size guard or optimization; large base64 images bloat `localStorage`.
- [ ] **Export a print-friendly recipe card / PDF** from the recipe detail view.
- [ ] **Keyboard nav inside the recipe list** (↑/↓ to move selection, like global search).
