# The Sabroso

A local-first field journal for San Diego restaurants and recipes. Three views — About, Map, Recipes — with all data stored in the browser's `localStorage`. No backend, no build step.

Live at [thesabroso.com](https://thesabroso.com)

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 (CDN, no bundler) |
| JSX | Babel Standalone (in-browser transform) |
| Map | Leaflet 1.9 + CartoDB tiles |
| Fonts | Playfair Display · Manrope · JetBrains Mono |
| Persistence | `localStorage` (seeded from JSON files on first visit) |

No npm, no build step. Open `index.html` from any static file server and it runs.

---

## File structure

```
TheSabroso/
├── index.html               # Entry point — loads all scripts
│
├── data/
│   ├── restaurants.json     # Seed data — loaded into localStorage on first visit
│   ├── recipes.json         # Seed data — loaded into localStorage on first visit
│   └── editor.html          # Standalone data editor (open in browser)
│
└── src/
    ├── scripts/
    │   ├── storage.js       # localStorage helpers (SDStore) — plain JS, no JSX
    │   ├── components.js    # Shared UI: StarRating, RichEditor, Modal, Toast, ManageMenu
    │   ├── forms.js         # RestaurantForm, RecipeForm, EditPicker, ImportDialog
    │   ├── views.js         # AboutView, MapView, RecipesView, RestaurantProfile
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

**Map** — Leaflet map of San Diego. Each logged restaurant drops a pin:
- Terracotta pin — tagged as Restaurant (or both Restaurant + Bar)
- Blue pin — tagged as Bar only

Clicking a pin opens a popup showing cuisine, tag badges, rating, and an "Open profile" button for the full review.

**Recipes** — searchable list with a detail panel. Select a recipe in the sidebar to read the full ingredients and method.

---

## Managing data

### In-app

Use the **Manage** menu (top-right of Map and Recipes views) to:
- Add, edit, or delete restaurants and recipes
- Import entries from a `.json` file
- Export individual entries as `.json` or `.csv`

### Data editor

Open `data/editor.html` in a browser (served over HTTP from the same origin) for a full CRUD interface over both collections. Changes write directly to `localStorage`.

Use **Export All JSON** in the editor to overwrite `data/restaurants.json` and `data/recipes.json` with the current state — this updates the seed files that new visitors receive on first load.

Use **Reset to Seed** to wipe `localStorage` and reload from the JSON files.

### localStorage keys

| Key | Contents |
|---|---|
| `sabroso_restaurants` | Array of restaurant objects |
| `sabroso_recipes` | Array of recipe objects |
| `sabroso_theme` | `"light"` or `"dark"` |

---

## Restaurant schema

```json
{
  "id":          "r1",
  "name":        "Garage Buona Forchetta",
  "address":     "3001 Beech St, San Diego, CA 92102",
  "cuisine":     "Italian",
  "rating":      4.7,
  "lat":         32.6853,
  "lng":         -117.1789,
  "tags":        ["restaurant"],
  "description": "<p>HTML review content...</p>",
  "createdAt":   "2026-01-14"
}
```

`tags` accepts any combination of `"restaurant"` and `"bar"`. The map pin color and popup badges update accordingly.

## Recipe schema

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
