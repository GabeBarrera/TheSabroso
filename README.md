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

No npm, no build step. Open `index.html` from any static file server and it runs.

---

## File structure

```
TheSabroso/
├── index.html               # Entry point — loads all scripts
│
├── editor.html              # Standalone data editor (open in browser)
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

**About** — masthead, journal intro, issue metadata.

**Map** — Leaflet map of San Diego. Each logged entry drops a pin:
- Terracotta pin — restaurant (or restaurant + bar)
- Blue pin — bar only
- Gold square pin — note

Hover a pin to open its popup. Click "Open profile →" or "Open note →" for the full detail view.

**Recipes** — searchable list with a detail panel. Select a recipe in the sidebar to read the full ingredients and method. Use the clipboard button in the recipe header to add its ingredients to your grocery list, then open the list via the notepad button in the bottom dock.

---

## Dropping a pin

Press and hold anywhere on the map (600ms) to drop a pin at that location. A picker appears asking whether to place a **Restaurant** or a **Note**. Both forms open pre-filled with the coordinates from the drop point.

---

## Managing data

### Manage menus

**Map view** has two manage menus in the top-right corner:

**Notes** menu:
- New note, Edit existing, Import (`notes.json`), Backup (`notes.json`)

**Manage** (restaurants) menu:
- New entry, Edit existing, Import, Backup, Resync data

**Recipes view** has its own **Manage** menu with the same options for recipes, plus a **Grocery List** button in the bottom dock (replaces the widget-toggle while on the recipes page).

### Backup

The restaurant **Backup** button opens a modal with export options:
- `restaurants.json` — always available
- `contacts.json` — admin only
- Both files — admin only

### Import

The restaurant **Import** button opens a picker:
- `restaurants.json` — always available (duplicate detection with per-entry overwrite/discard)
- `contacts.json` — admin only
- Both files — admin only

Notes and recipes import directly using the same duplicate-detection flow.

### Resync data

Wipes `sabroso_restaurants`, `sabroso_recipes`, and `sabroso_contacts` from `localStorage`, then reloads from the seed JSON files. Notes are **not** cleared — they are user-generated and have no seed equivalent.

### Data editor

Open `editor.html` in a browser (served over HTTP) for a full CRUD interface over both collections.

---

## Grocery list

The **Grocery List** is a recipe-page-only feature accessible via the notepad icon in the bottom dock (visible only when on the Recipes view).

- Each recipe's detail header has a **clipboard button** next to the copy-link button. Clicking it extracts all unordered-list (`<ul>`) items from the recipe description as ingredients and adds them to the grocery list.
- Re-clicking the button for the same recipe **replaces** that recipe's entries (acts as a refresh).
- The grocery list panel slides in from the right and groups items by recipe, so every ingredient is labeled with its source.
- Individual recipe entries can be removed via their **Remove** button; the **Clear all** button wipes the entire list.
- The list persists in `localStorage` under `sabroso_grocery`.

---

## Admin mode

Click the lock icon in the bottom dock to log in. Default password: **anyonecancook**.

Admin unlocks:
- Contacts management on restaurant profiles (stored separately in `sabroso_contacts`)
- `contacts.json` backup and import options
- Additional warning text in the Resync confirmation

Admin session is stored in `sessionStorage` and expires when the tab is closed.

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
| `sabroso_theme` | `"light"` or `"dark"` |

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
  "description": "<h3>Ingredients</h3><ul>...</ul>",
  "createdAt":   "2025-09-20"
}
```

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

`address` is optional. `tag` is freeform text (e.g. "Parking", "Hidden Gem", "Note").

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
