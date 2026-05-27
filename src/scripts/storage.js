/* ============================================================
   STORAGE — localStorage helpers for restaurants + recipes
   ============================================================ */

const RESTAURANTS_KEY = "sabroso_restaurants";
const RECIPES_KEY     = "sabroso_recipes";

window.SDStore = {
  loadRestaurants() {
    try {
      const raw = localStorage.getItem(RESTAURANTS_KEY);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  loadRecipes() {
    try {
      const raw = localStorage.getItem(RECIPES_KEY);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveRestaurants(list) { localStorage.setItem(RESTAURANTS_KEY, JSON.stringify(list)); },
  saveRecipes(list)     { localStorage.setItem(RECIPES_KEY,     JSON.stringify(list)); },

  newId(prefix = "x") {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  },

  download(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  toCSV(rows, columns) {
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const head = columns.join(",");
    const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
    return head + "\n" + body;
  },
};
