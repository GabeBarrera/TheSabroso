/* ============================================================
   STORAGE — localStorage helpers for restaurants + recipes
   ============================================================ */

const RESTAURANTS_KEY = "sd_savor_restaurants";
const RECIPES_KEY = "sd_savor_recipes";

// one-time migration from the old "digest" keys, if present
(function migrate() {
  try {
    const oldR = localStorage.getItem("sd_digest_restaurants");
    if (oldR && !localStorage.getItem(RESTAURANTS_KEY)) {
      localStorage.setItem(RESTAURANTS_KEY, oldR);
    }
    const oldRec = localStorage.getItem("sd_digest_recipes");
    if (oldRec && !localStorage.getItem(RECIPES_KEY)) {
      localStorage.setItem(RECIPES_KEY, oldRec);
    }
  } catch (e) { /* no-op */ }
})();

const SEED_RESTAURANTS = [
  {
    id: "r1",
    name: "Salt & Ember",
    address: "2741 Ocean Front Walk, San Diego, CA 92109",
    cuisine: "Coastal American",
    rating: 4.6,
    lat: 32.7942,
    lng: -117.2554,
    description:
      "<p><strong>Salt &amp; Ember</strong> sits on the boardwalk, a glass-walled box of charred wood and bare bulbs. The kitchen runs hard but quiet — no music after seven, just the open flame and the surf. The whole-roast snapper is the only correct order.</p><h3>The order</h3><ul><li>Whole snapper, salt-crust, lemon ash</li><li>Charred little gems, anchovy cream</li><li>Smoked ricotta tart, stone fruit</li></ul><p><em>Reservations are a polite fiction.</em> Walk in at 5:30 or eat at the bar.</p>",
    createdAt: "2025-09-12",
  },
  {
    id: "r2",
    name: "Casa Marisol",
    address: "1455 University Ave, San Diego, CA 92103",
    cuisine: "Modern Mexican",
    rating: 4.3,
    lat: 32.7491,
    lng: -117.1490,
    description:
      "<p>A tight, hot kitchen behind a turquoise door. The masa is nixtamalized in-house — you can taste the difference in three seconds.</p><ul><li>Tetela de huitlacoche</li><li>Aguachile rojo, kanpachi</li><li>Cochinita pibil, banana leaf</li></ul><p>Get the mezcal flight. <strong>Don't</strong> skip the mezcal flight.</p>",
    createdAt: "2025-09-28",
  },
  {
    id: "r3",
    name: "Kettle & Co.",
    address: "524 5th Ave, San Diego, CA 92101",
    cuisine: "Brunch",
    rating: 4.1,
    lat: 32.7115,
    lng: -117.1601,
    description:
      "<p>Better than it has any right to be for a Gaslamp brunch. The hollandaise breaks if you look at it wrong, but on a good day, the dutch baby is the best in the city.</p><h3>The order</h3><ul><li>Dutch baby, lemon curd, brown butter</li><li>Smoked trout toast</li><li>Black coffee. Always black.</li></ul>",
    createdAt: "2025-10-04",
  },
  {
    id: "r4",
    name: "Aoyama",
    address: "3850 5th Ave, San Diego, CA 92103",
    cuisine: "Japanese · Omakase",
    rating: 4.8,
    lat: 32.7494,
    lng: -117.1605,
    description:
      "<p>Eight seats. One chef. No menu. You sit down and the world contracts to the width of a hinoki counter and the angle of a knife.</p><p>The rice is aged for thirty days. The chef will not say where the bluefin comes from. <em>Don't ask.</em></p><h3>House rules</h3><ol><li>No perfume.</li><li>No photos of other guests.</li><li>Eat the nigiri the moment it lands.</li></ol>",
    createdAt: "2025-10-19",
  },
  {
    id: "r5",
    name: "Pasta della Nonna",
    address: "2110 India St, San Diego, CA 92101",
    cuisine: "Italian",
    rating: 4.5,
    lat: 32.7250,
    lng: -117.1696,
    description:
      "<p>Little India Street trattoria. Rolling pin still on the counter when you walk in. The carbonara is correct — guanciale, pepper, egg, pecorino, nothing else.</p><ul><li>Cacio e pepe — the proof of the kitchen</li><li>Tagliatelle al ragu, six-hour braise</li><li>Tiramisu, made that morning</li></ul>",
    createdAt: "2025-11-02",
  },
  {
    id: "r6",
    name: "Quay",
    address: "1380 Harbor Island Dr, San Diego, CA 92101",
    cuisine: "Seafood",
    rating: 4.7,
    lat: 32.7273,
    lng: -117.1957,
    description:
      "<p>Twelve oyster types on the chalkboard, half of them San Diego-local. The view of the harbor would carry a worse restaurant; this one doesn't need it.</p><h3>The order</h3><ul><li>Half-dozen Carlsbad blondes</li><li>Hamachi crudo, finger lime</li><li>Whole grilled spot prawns</li></ul><p><strong>Sunset on the patio. That's the move.</strong></p>",
    createdAt: "2025-11-15",
  },
  {
    id: "r7",
    name: "Mercado Verde",
    address: "3030 Grape St, San Diego, CA 92102",
    cuisine: "Vegetarian",
    rating: 4.2,
    lat: 32.7383,
    lng: -117.1417,
    description:
      "<p>Plant-forward without the smugness. The chef worked the line at Noma for a year; you can taste the fermentation program — every plate has a sour note that pulls everything together.</p><ul><li>Charred cabbage, miso-koji butter</li><li>Beetroot tartare, smoked yolk</li><li>Pickle plate, ten kinds</li></ul>",
    createdAt: "2025-11-30",
  },
];

const SEED_RECIPES = [
  {
    id: "rec1",
    name: "Carne Asada — The Only Way",
    cuisine: "Mexican",
    time: 45,
    serves: 4,
    tagline: "Skirt steak, charred lime, no shortcuts. The marinade is the recipe.",
    description:
      "<h3>Ingredients</h3><ul><li>2 lb skirt steak, trimmed</li><li>4 garlic cloves, smashed</li><li>1 bunch cilantro, stems &amp; all</li><li>3 limes, juiced</li><li>1 orange, juiced</li><li>2 tbsp soy sauce</li><li>1 tbsp ground cumin</li><li>1 jalapeño, sliced</li></ul><h3>Method</h3><ol><li><strong>Marinade.</strong> Blitz everything except the steak. Pour over the meat. Bag it. <em>Six hours minimum, twelve is better.</em></li><li><strong>Heat.</strong> The grill must scream. Smoke point or you've already failed.</li><li><strong>Sear.</strong> Two minutes per side. No moving the meat around like an amateur.</li><li><strong>Rest.</strong> Ten minutes. Under foil. Walk away.</li><li><strong>Slice.</strong> Against the grain. Thin. Salt on the cutting board.</li></ol>",
    createdAt: "2025-09-20",
  },
  {
    id: "rec2",
    name: "Fish Tacos, San Diego",
    cuisine: "Mexican",
    time: 30,
    serves: 4,
    tagline: "Beer battered, cabbage, crema, that's the whole law. Don't get clever.",
    description:
      "<h3>Ingredients</h3><ul><li>1 lb cod or rockfish, cut into fingers</li><li>1 cup flour</li><li>1 cup cold lager</li><li>1 tsp baking powder</li><li>Cabbage, shredded fine</li><li>Crema, lime, hot sauce</li><li>Corn tortillas, warmed on flame</li></ul><h3>Method</h3><ol><li>Whisk the batter cold. <strong>Cold</strong>. Lumps are fine.</li><li>Oil at 375°F. Test with a wooden spoon — should hiss.</li><li>Dip fish, fry 3 minutes, drain on rack — never paper towels, you'll steam them soggy.</li><li>Build: tortilla, fish, cabbage, crema, lime. Done.</li></ol>",
    createdAt: "2025-10-08",
  },
  {
    id: "rec3",
    name: "Charred Little Gems",
    cuisine: "Salad",
    time: 12,
    serves: 2,
    tagline: "Five-minute side that costs nothing and tastes like the coast.",
    description:
      "<h3>Ingredients</h3><ul><li>4 heads little gem lettuce, halved</li><li>3 anchovy fillets</li><li>1 egg yolk</li><li>1 lemon</li><li>Olive oil, parmesan, black pepper</li></ul><h3>Method</h3><ol><li>Cast iron, smoking hot, no oil. Lettuce cut-side down. <em>Sixty seconds.</em></li><li>Mash anchovies with yolk, lemon, oil. That's the dressing.</li><li>Spoon over the charred lettuce. Shower of parmesan. Crack of pepper.</li></ol>",
    createdAt: "2025-10-22",
  },
  {
    id: "rec4",
    name: "Cacio e Pepe — Properly",
    cuisine: "Italian",
    time: 20,
    serves: 2,
    tagline: "Three ingredients. Four if you count the water. There is nowhere to hide.",
    description:
      "<h3>Ingredients</h3><ul><li>200g tonnarelli or spaghetti</li><li>100g pecorino romano, finely grated</li><li>Black peppercorns, freshly cracked</li><li>Pasta water — heavily starchy</li></ul><h3>Method</h3><ol><li><strong>Toast the pepper.</strong> Dry pan, low heat, smell it bloom.</li><li>Pasta in salted water — less salt than you think. The cheese is salty.</li><li>Reserve a cup of water. Drain pasta one minute under.</li><li>Off the heat: pecorino, splash of water, whisk to a paste. Add pasta. <em>Toss like you mean it.</em></li><li>If it breaks, you added cheese too hot. Start again.</li></ol>",
    createdAt: "2025-11-05",
  },
];

function readList(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(seed));
      return JSON.parse(JSON.stringify(seed));
    }
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(seed));
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

window.SDStore = {
  loadRestaurants() { return readList(RESTAURANTS_KEY, SEED_RESTAURANTS); },
  saveRestaurants(list) { writeList(RESTAURANTS_KEY, list); },
  loadRecipes() { return readList(RECIPES_KEY, SEED_RECIPES); },
  saveRecipes(list) { writeList(RECIPES_KEY, list); },

  newId(prefix = "x") {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  },

  download(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
