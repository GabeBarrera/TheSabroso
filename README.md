# The Sabroso

A local-first field journal for San Diego restaurants, recipes, and map notes. Three views — About, Map, Recipes — with all data stored in the browser's `localStorage`. No backend, no build step.

Live at [thesabroso.com](https://thesabroso.com)

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 (CDN, no bundler) |
| JSX | Babel Standalone (in-browser transform) |
| Map | Leaflet 1.9 + CartoDB tiles |
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
    │   ├── components.js    # Shared UI: StarRating, RichEditor, Modal, Toast, ManageMenu
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

Then open `http://localhost:8080`.

---

## Views

### About

Masthead with the journal's title, byline, intro paragraph, and version/coordinate metadata. Links to the author's site.

### Map

Leaflet map of San Diego. Each entry drops a color-coded pin:

- **Terracotta (R)** — restaurant (or restaurant + bar)
- **Blue (B)** — bar only
- **Gold square** — note
- **Pulsing blue dot** — your current location (if geolocation is granted)

Hover or tap a pin to open its popup with name, cuisine, and address. Click **Open profile →** or **Open note →** for the full detail modal.

The map chrome shows real-time **weather** (temperature + condition icon) and your **current neighborhood** via reverse geocoding. Both update automatically on load.

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

Results appear in a collapsible **Voice Result** drawer (with distance info where applicable). A keyboard help modal lists all commands — accessible via the `?` key while the mic is active.

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

Selecting a recipe in the sidebar opens the detail panel with:

- Name, cuisine, time, and serving count
- Tagline
- Structured ingredient list with qty, unit, name, and optional notes
- Rich HTML method section

**Ingredient scaling.** Buttons above the ingredient list multiply all quantities ×1, ×2, or ×3. Fractions (e.g. `1/2`) and mixed numbers (e.g. `1 1/2`) are resolved before scaling.

**Step striking.** Click any ingredient row or any method paragraph to cross it out while cooking. State resets when you navigate away.

**Add to Grocery.** The clipboard button in the detail header sends the recipe's ingredients to the Grocery List. Re-clicking refreshes that recipe's block (no duplicate append).

**Edit button.** An **Edit** button appears in the detail header — admin only. It opens the recipe's edit form directly from the detail panel.

**Legacy migration.** Older recipes that stored ingredients as `<ul><li>` elements inside the description field are automatically migrated to the structured `ingredients` array on first load. The `<h3>` "Ingredients" header and list are removed from the description and parsed into `qty`, `unit`, and `name` fields.

---

## Navigation

The three views (Map, About, Recipes) are arranged in a horizontal carousel.

| Input | Effect |
|---|---|
| Arrow Left / Arrow Right | Move one view in that direction |
| Home | Jump to the About view |
| Swipe left / right | Swipe on mobile or touchpad to advance views |

The last active view is saved to `localStorage` (`sabroso_last_view`) and restored on the next visit.

**Deep-linking.** Append a hash to jump directly to a profile on load:

| URL | Effect |
|---|---|
| `/#map/{id}` | Open the Map view with that restaurant/note profile already open |
| `/#recipes/{id}` | Open the Recipes view with that recipe selected |

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

Restaurant entries can also be exported as **CSV** directly from the restaurant form (Edit mode), producing a flat spreadsheet-friendly file.

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
- Click the clipboard button in any recipe's detail header to add that recipe's structured ingredients (qty + unit + name) to the list.
- Re-clicking replaces that recipe's existing block — not a duplicate append.
- Type a custom item into the input at the bottom of the panel and click **Add**.

**Two view modes (tabs at the top of the panel):**
- **By Recipe** — items grouped under their source recipe name. Each group has a **Remove** button to drop that recipe's entire block.
- **Total** — all items aggregated alphabetically. Quantities are parsed and summed across recipes (e.g. `1/2 cup flour` from two recipes → `1 cup flour`). Source recipes are listed beneath each line.

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

Open `editor.html` from the same static server for a full CRUD interface over both collections.

**Features:**
- Tab interface — **Restaurants** | **Recipes** with entry counts
- Restaurant list showing name, cuisine, address, tag badges (R/B), and star rating
- Recipe list showing name, cuisine, cook time, and serves
- **Edit** button per entry to open the full form in a modal
- **New Restaurant / New Recipe** buttons
- **Export JSON** button per collection
- **Export All** to download both collections at once
- **Reload JSON** to re-fetch seed data without navigating away
- All changes save directly to `localStorage` so the main app reflects them immediately
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
| `sabroso_grocery` | Array of grocery list items (each with `id`, `text`, `recipeId`, `recipeName`) |
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
  "createdAt":       "2026-01-14"
}
```

`tags` accepts any combination of `"restaurant"` and `"bar"`. Contacts are stored separately in `sabroso_contacts` keyed by restaurant `id`.

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
    { "qty": "2", "unit": "lb",   "name": "skirt steak", "notes": "ask for outside skirt" },
    { "qty": "2", "unit": "tbsp", "name": "olive oil",   "notes": "" }
  ],
  "description": "<p>HTML method content...</p>",
  "createdAt":   "2025-09-20"
}
```

`ingredients` is a structured array separate from `description`. Each entry has `qty`, `unit`, `name`, and an optional `notes` field. Notes appear in the recipe detail view but are not included in grocery list exports. Older recipes without an `ingredients` field are auto-migrated from `<li>` elements in the description on first load.

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
