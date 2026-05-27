/* ============================================================
   STORAGE — localStorage helpers for restaurants + recipes
   ============================================================ */

const RESTAURANTS_KEY = "sabroso_restaurants";
const RECIPES_KEY = "sabroso_recipes";

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
    name: "Garage Buona Forchetta",
    address: "3001 Beech St, San Diego, CA 92102",
    cuisine: "Italian",
    rating: 4.7,
    lat: 32.68531518270564,
    lng: -117.17890793621442,
    description:
      "<p>South Park's Neapolitan flagship, inside a converted garage with a Valoriani oven that runs at 900°F. The dough ferments 48 hours. The Margherita is the reference point for every other pizza in this city — San Marzano tomatoes, fior di latte, one basil leaf, no arguments.</p><h3>The order</h3><ul><li>Margherita — the benchmark</li><li>Bufalina — buffalo mozzarella, cherry tomato, barely touched</li><li>Burrata with prosciutto crudo, to start</li></ul><p>No half-baked substitutions. The dough is the whole product.</p>",
    createdAt: "2026-01-14",
  },
  {
    id: "r2",
    name: "Underbelly",
    address: "3108 Fifth Ave, San Diego, CA 92103",
    cuisine: "Japanese",
    rating: 4.4,
    lat: 32.72449282219502, 
    lng: -117.16924736256803,
    description:
      "<p>Downtown ramen counter with a tonkotsu broth that runs 18 hours. The chashu comes from a low braise that's been going since Tuesday. The soft egg is seasoned overnight. Cramped, loud, worth every inconvenience.</p><h3>The order</h3><ul><li>Tonkotsu — rich, porky, the correct depth</li><li>Extra chashu — add it, don't think about it</li><li>Gyoza, pan-fried, order them when you sit down</li></ul><p><em>No substitutions on the broth.</em> This is non-negotiable and the right call.</p>",
    createdAt: "2026-01-22",
  },
  {
    id: "r3",
    name: "Neighborhood",
    address: "777 G St, San Diego, CA 92101",
    cuisine: "American",
    rating: 4.3,
    lat: 32.7136,
    lng: -117.1597,
    description:
      "<p>East Village burger bar with 24 rotating locals on tap and a double smash that benchmarks the category. Two thin patties, American cheese, pickles, onion, house sauce on a toasted potato roll. The fries are shoestring and salted correctly, which is rarer than it sounds.</p><h3>The order</h3><ul><li>Double smash — no modifications needed</li><li>Shoestring fries</li><li>Whatever IPA the bartender just tapped</li></ul>",
    createdAt: "2026-02-01",
  },
  {
    id: "r4",
    name: "Craft & Commerce",
    address: "675 W Beech St, San Diego, CA 92101",
    cuisine: "Cocktail Bar",
    rating: 4.5,
    lat: 32.7237,
    lng: -117.1728,
    description:
      "<p>Little Italy corner bar where the cocktail program earns its reputation and the food is better than a bar this focused on drinks has any obligation to produce. The bartenders know the classics and build on them without showing off.</p><h3>The order</h3><ul><li>Whatever the bartender recommends — trust it</li><li>Fried chicken sandwich — responsible for missed last calls</li><li>Pimento cheese dip, warm pretzel</li></ul><p><strong>Get there before 9 PM or stand.</strong></p>",
    createdAt: "2026-02-08",
  },
  {
    id: "r5",
    name: "Yoshinos",
    address: "1790 W Washington St, San Diego, CA 92103",
    cuisine: "Japanese",
    rating: 4.6,
    lat: 32.7388,
    lng: -117.1718,
    description:
      "<p>Mission Hills Japanese counter — looks modest from outside, delivers something close to perfect inside. The gyoza are made to order with the skin crimped by hand. The katsu curry is the benchmark: tonkatsu pounded thin, crumbed fine, fried hard, set over rice that's been seasoned with care.</p><h3>The order</h3><ul><li>Gyoza — pan-fried, order two rounds</li><li>Katsu curry — the whole reason you're here</li><li>Cold Sapporo. Obvious but correct.</li></ul>",
    createdAt: "2026-02-15",
  },
  {
    id: "r6",
    name: "Lucha Libre",
    address: "1810 W Washington St, San Diego, CA 92103",
    cuisine: "Mexican",
    rating: 4.2,
    lat: 32.7389,
    lng: -117.1725,
    description:
      "<p>The wrestler murals are part of the deal. So is the wax-paper basket, the counter seating, and the salsa bar you'll visit three times. The adobada taco is why people drive in from other counties. The green salsa is the one you want.</p><h3>The order</h3><ul><li>Adobada taco — the reason you came</li><li>California burrito if you arrived hungry</li><li>Green salsa, applied liberally</li></ul><p><em>Cash moves faster.</em></p>",
    createdAt: "2026-02-22",
  },
  {
    id: "r7",
    name: "Rubicon",
    address: "3823 30th St, San Diego, CA 92104",
    cuisine: "American",
    rating: 4.0,
    lat: 32.7472,
    lng: -117.1299,
    description:
      "<p>North Park neighborhood pub that actually cooks. The kind of place you walk into expecting a decent burger and leave having eaten one of the better meals of the month. Draft list rotates weekly — usually twelve locals, always something worth ordering.</p><h3>The order</h3><ul><li>Smash burger — straightforward, well-executed</li><li>Fries, duck fat on good days</li><li>Whatever stout is on draft</li></ul><p>Loud on weekends. Manageable on a Tuesday. Go on a Tuesday.</p>",
    createdAt: "2026-03-01",
  },
  {
    id: "r8",
    name: "Tacos El Gordo",
    address: "631 Broadway, San Diego, CA 92101",
    cuisine: "Mexican",
    rating: 4.8,
    lat: 32.7141,
    lng: -117.1578,
    description:
      "<p>Tijuana-style taqueria on Broadway. The adobada spit runs from open to close. The mulita is the move — two tortillas, meat, cheese, griddled until the whole thing fuses into one perfect object. Everything arrives in foil and is eaten standing at the counter. That is the method.</p><h3>The order</h3><ul><li>Mulita, adobada — non-negotiable</li><li>Cabeza if you're committed</li><li>Horchata, not the bottled kind</li></ul><p><strong>The spit is the whole restaurant.</strong></p>",
    createdAt: "2026-03-10",
  },
  {
    id: "r9",
    name: "Pomegranate",
    address: "4210 30th St, San Diego, CA 92104",
    cuisine: "Mediterranean",
    rating: 4.3,
    lat: 32.7457,
    lng: -117.1299,
    description:
      "<p>North Park Persian kitchen that earns every return visit. The ghormeh sabzi — the test dish — passes with years of memory in a single bowl. The rice has a properly crusted tah-dig every time, which is rarer than it should be in a city this size.</p><h3>The order</h3><ul><li>Ghormeh sabzi — the proof of the kitchen</li><li>Koobideh kebab, charred on the grill</li><li>Tah-dig — request the crust, always</li></ul><p>BYOB. Reserve ahead on weekends.</p>",
    createdAt: "2026-03-15",
  },
  {
    id: "r10",
    name: "Herb & Wood",
    address: "2210 Kettner Blvd, San Diego, CA 92101",
    cuisine: "American",
    rating: 4.6,
    lat: 32.7268,
    lng: -117.1759,
    description:
      "<p>Little Italy flagship with a wood-fired program that informs the food rather than just appearing in the menu copy. The charred broccolini is a side dish that outclasses the mains on half the menus in this city. The space is loud and handsome.</p><h3>The order</h3><ul><li>Wood-roasted half chicken — crisp, juicy, no notes</li><li>Charred broccolini, lemon, chili, garlic</li><li>Burrata, stone fruit, aged balsamic</li></ul><p>Start with whatever the bartender recommends. The cocktail list rewards the conversation.</p>",
    createdAt: "2026-03-22",
  },
  {
    id: "r11",
    name: "Sahara Taste of the Middle East",
    address: "11955 Bernardo Plaza Dr, San Diego, CA 92128",
    cuisine: "Mediterranean",
    rating: 4.5,
    lat: 32.9937,
    lng: -117.0759,
    description:
      "<p>Rancho Bernardo strip-mall exterior, Beirut grandmother's kitchen interior. The hummus is made daily from dried chickpeas — you will notice the difference immediately. The mixed grill is the order. The pita arrives from the oven still inflated and lands on the table immediately.</p><h3>The order</h3><ul><li>Hummus with pine nuts and warm pita — start here</li><li>Mixed grill platter — shawarma, kafta, shish tawook</li><li>Fattoush — dressed right before it leaves the kitchen</li></ul><p><em>Worth the drive north. Arrive early.</em></p>",
    createdAt: "2026-03-29",
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
