/* ============================================================
   STORAGE — localStorage helpers for restaurants + recipes
   ============================================================ */

const RESTAURANTS_KEY   = "sabroso_restaurants";
const RECIPES_KEY       = "sabroso_recipes";
const CONTACTS_KEY      = "sabroso_contacts";
const ADMIN_PW_KEY      = "sabroso_admin_pw";
const ADMIN_SESSION_KEY = "sabroso_admin_session";
const FAVORITES_KEY     = "sabroso_recipe_favs";
const NOTES_KEY         = "sabroso_notes";
const GROCERY_KEY       = "sabroso_grocery";

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

  loadContacts() {
    try {
      const raw = localStorage.getItem(CONTACTS_KEY);
      return raw !== null ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  saveContacts(map) { localStorage.setItem(CONTACTS_KEY, JSON.stringify(map)); },

  getRestaurantContacts(restaurantId) {
    return this.loadContacts()[restaurantId] || [];
  },

  setRestaurantContacts(restaurantId, contacts) {
    const map = this.loadContacts();
    if (!contacts || contacts.length === 0) {
      delete map[restaurantId];
    } else {
      map[restaurantId] = contacts;
    }
    this.saveContacts(map);
  },

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

  async hashPw(pw) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  },

  async adminLogin(pw) {
    const hash = await this.hashPw(pw);
    let stored = localStorage.getItem(ADMIN_PW_KEY);
    if (!stored) stored = await this.hashPw("anyonecancook");
    if (hash === stored) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      return true;
    }
    return false;
  },

  adminLogout() { sessionStorage.removeItem(ADMIN_SESSION_KEY); },
  isAdmin()     { return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1"; },

  clearData() {
    localStorage.removeItem(RESTAURANTS_KEY);
    localStorage.removeItem(RECIPES_KEY);
    localStorage.removeItem(CONTACTS_KEY);
  },

  loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  },

  saveFavorites(set) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
  },

  loadNotes() {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw !== null ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  saveNotes(list) { localStorage.setItem(NOTES_KEY, JSON.stringify(list)); },

  loadGroceryList() {
    try {
      const raw = localStorage.getItem(GROCERY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  saveGroceryList(list) {
    try { localStorage.setItem(GROCERY_KEY, JSON.stringify(list)); } catch {}
  },
};
