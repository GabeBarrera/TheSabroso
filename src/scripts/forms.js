(function () {
/* global React, RichEditor, StarRating, Modal, useToast, SDStore */
const { useState: useStateF, useEffect: useEffectF, useMemo: useMemoF, useRef: useRefF } = React;

const stripTags = (s) => (s ? String(s).replace(/<[^>]+>/g, " ") : "");

/* ============================================================
   RESTAURANT FORM (new + edit)
   ============================================================ */

const CUISINE_OPTIONS = [
  "American", "Mexican", "Italian", "Japanese", "Coastal American",
  "Modern Mexican", "Brunch", "Seafood", "Vegetarian", "Steakhouse",
  "Thai", "Korean", "Vietnamese", "Indian", "Mediterranean", "French",
  "Spanish", "Pizza", "BBQ", "Bakery", "Café", "Cocktail Bar"
];

const HOURS_DAYS = [["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]];

function normalizeHours(h) {
  const out = {};
  HOURS_DAYS.forEach(([k]) => {
    const d = h[k];
    if (!d) return;
    if (d.closed) out[k] = { closed: true };
    else if (d.open && d.close) out[k] = { open: d.open, close: d.close };
  });
  return Object.keys(out).length ? out : undefined;
}

function HoursEditor({ hours, onChange }) {
  const get = (k) => hours[k] || { closed: false, open: "", close: "" };
  const set = (k, patch) => onChange({ ...hours, [k]: { ...get(k), ...patch } });
  const copyToAll = () => {
    const m = get("mon");
    const next = {};
    HOURS_DAYS.forEach(([k]) => { next[k] = { ...m }; });
    onChange(next);
  };
  return (
    <div className="hours-editor">
      {HOURS_DAYS.map(([k, label]) => {
        const d = get(k);
        return (
          <div key={k} className={`hours-row${d.closed ? " is-closed" : ""}`}>
            <span className="hours-day">{label}</span>
            <button type="button" className={`hours-state-toggle${d.closed ? " closed" : ""}`} onClick={() => set(k, { closed: !d.closed })}>
              {d.closed ? "Closed" : "Open"}
            </button>
            {d.closed ? (
              <span className="hours-closed-note">— closed all day</span>
            ) : (
              <div className="hours-times">
                <input type="time" className="field-input hours-time" value={d.open} onChange={(e) => set(k, { open: e.target.value })} />
                <span className="hours-dash">–</span>
                <input type="time" className="field-input hours-time" value={d.close} onChange={(e) => set(k, { close: e.target.value })} />
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="btn ghost hours-copy" onClick={copyToAll}>Copy Monday to every day</button>
    </div>
  );
}

function RestaurantForm({ initial, defaultLat, defaultLng, defaultAddress, onSave, onCancel, onDelete, mode = "new", isAdmin = false }) {
  const toast = useToast();
  const [name, setName] = useStateF(initial?.name || "");
  const [address, setAddress] = useStateF(initial?.address || defaultAddress || "");
  const [cuisine, setCuisine] = useStateF(initial?.cuisine || "");
  const [customCuisine, setCustomCuisine] = useStateF("");
  const [rating, setRating] = useStateF(initial?.rating ?? 4.0);
  const [description, setDescription] = useStateF(initial?.description || "");
  const [lat, setLat] = useStateF(initial?.lat ?? defaultLat ?? 32.7157);
  const [lng, setLng] = useStateF(initial?.lng ?? defaultLng ?? -117.1611);
  const [tags, setTags] = useStateF(initial?.tags || ["restaurant"]);
  const [contacts, setContacts] = useStateF(() => initial?.id ? SDStore.getRestaurantContacts(initial.id) : []);
  const [website, setWebsite] = useStateF(initial?.website || "");
  const [reservationLink, setReservationLink] = useStateF(initial?.reservationLink || "");
  const [hours, setHours] = useStateF(initial?.hours || {});

  const addContact = () => setContacts(prev => [...prev, { title: "", name: "" }]);
  const removeContact = (i) => setContacts(prev => prev.filter((_, idx) => idx !== i));
  const updateContact = (i, key, val) => setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));

  const toggleTag = (tag) => setTags((prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  );

  const cuisineIsCustom = cuisine === "__custom";
  const finalCuisine = cuisineIsCustom ? customCuisine.trim() : cuisine;

  const handleSave = () => {
    if (!name.trim()) { toast("Name is required", "warn"); return; }
    if (!address.trim()) { toast("Address is required", "warn"); return; }
    if (!finalCuisine) { toast("Choose a cuisine", "warn"); return; }
    const id = initial?.id || SDStore.newId("r");
    SDStore.setRestaurantContacts(id, contacts.filter(c => c.title.trim() || c.name.trim()));
    const entry = {
      id,
      name: name.trim(),
      address: address.trim(),
      cuisine: finalCuisine,
      rating: Math.round(rating * 10) / 10,
      tags: tags.length > 0 ? tags : ["restaurant"],
      lat: Number(lat),
      lng: Number(lng),
      description,
      website: website.trim() || undefined,
      reservationLink: reservationLink.trim() || undefined,
      hours: normalizeHours(hours),
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
    };
    onSave(entry);
  };

  const exportOne = (fmt) => {
    if (fmt === "json") {
      const entry = {
        id: initial?.id || "draft",
        name, address, cuisine: finalCuisine, rating, lat, lng, description,
      };
      SDStore.download(`${(name || "restaurant").replace(/\s+/g, "_").toLowerCase()}.json`, JSON.stringify(entry, null, 2));
      toast("Exported JSON", "ok");
    } else {
      const row = { name, address, cuisine: finalCuisine, rating, lat, lng, description };
      const csv = SDStore.toCSV([row], ["name","address","cuisine","rating","lat","lng","description"]);
      SDStore.download(`${(name || "restaurant").replace(/\s+/g, "_").toLowerCase()}.csv`, csv, "text/csv");
      toast("Exported CSV", "ok");
    }
  };

  return (
    <Modal
      eyebrow={mode === "new" ? "New entry" : "Edit entry"}
      title={mode === "new" ? "Log a" : "Refine"}
      italicTitle={mode === "new" ? "restaurant" : "the entry"}
      onClose={onCancel}
      wide
      footer={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "edit" && onDelete && (
              <button className="btn danger" onClick={onDelete}>Delete</button>
            )}
            <div className="export-group">
              <span className="lbl">Export</span>
              <button onClick={() => exportOne("json")}>.json</button>
              <button onClick={() => exportOne("csv")}>.csv</button>
            </div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn accent" onClick={handleSave}>{mode === "new" ? "Publish entry" : "Save changes"}</button>
          </div>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label className="field-label">Name</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Crab Shack" />
        </div>
        <div className="field">
          <label className="field-label">Cuisine</label>
          <select className="field-select" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            <option value="">—</option>
            {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom">Custom…</option>
          </select>
          {cuisineIsCustom && (
            <input className="field-input" style={{ marginTop: 8 }} value={customCuisine} onChange={(e) => setCustomCuisine(e.target.value)} placeholder="e.g. Peruvian–Japanese" />
          )}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Tags</label>
        <div className="tag-toggles">
          <button type="button" className={`tag-toggle rest${tags.includes("restaurant") ? " on" : ""}`} onClick={() => toggleTag("restaurant")}>
            <span className="tb-badge r">R</span> Restaurant
          </button>
          <button type="button" className={`tag-toggle bar${tags.includes("bar") ? " on" : ""}`} onClick={() => toggleTag("bar")}>
            <span className="tb-badge b">B</span> Bar
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Address</label>
        <input className="field-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Coast Hwy, San Diego, CA" />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Website <span className="field-optional">optional</span></label>
          <input className="field-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://restaurant.com" />
        </div>
        <div className="field">
          <label className="field-label">Reservation Link <span className="field-optional">optional</span></label>
          <input className="field-input" value={reservationLink} onChange={(e) => setReservationLink(e.target.value)} placeholder="OpenTable, Tock, Resy URL…" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Business Hours <span className="field-optional">powers “Open now”</span></label>
        <HoursEditor hours={hours} onChange={setHours} />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Latitude</label>
          <input className="field-input" type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Longitude</label>
          <input className="field-input" type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Rating (drag for fractional)</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="field">
        <label className="field-label">The review</label>
        <RichEditor value={description} onChange={setDescription} placeholder="Walk in. First impressions. The kitchen. The order. Skip the niceties." />
      </div>

      {isAdmin && (
        <div className="field">
          <label className="field-label">Contacts</label>
          {contacts.map((c, i) => (
            <div key={i} className="contact-editor-row">
              <input className="field-input" placeholder="Title" value={c.title} onChange={e => updateContact(i, "title", e.target.value)} />
              <input className="field-input" placeholder="Name" value={c.name} onChange={e => updateContact(i, "name", e.target.value)} />
              <button type="button" className="btn ghost contact-del" onClick={() => removeContact(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn ghost" style={{ marginTop: contacts.length > 0 ? 4 : 0 }} onClick={addContact}>+ Add contact</button>
        </div>
      )}
    </Modal>
  );
}

/* ============================================================
   RECIPE FORM (new + edit)
   ============================================================ */

const RECIPE_UNITS = ['tsp', 'tbsp', 'cup', 'oz', 'fl oz', 'lb', 'g', 'kg', 'ml', 'L', 'bunch', 'pinch', 'dash', 'to taste', 'slices', 'cloves', 'pieces'];
const RECIPE_UNITS_SET = new Set(RECIPE_UNITS);

function IngredientRow({ ing, idx, onChange, onRemove, showRemove }) {
  const isCustom = ing.unit !== '' && !RECIPE_UNITS_SET.has(ing.unit);
  const [customMode, setCustomMode] = useStateF(isCustom);
  const selectVal = customMode ? '__custom' : ing.unit;

  const handleSelect = (val) => {
    if (val === '__custom') {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      onChange(idx, { ...ing, unit: val });
    }
  };

  return (
    <div className="ingredient-row">
      <input
        className="field-input ing-qty-input"
        type="text"
        value={ing.qty}
        onChange={(e) => onChange(idx, { ...ing, qty: e.target.value })}
        placeholder="qty"
      />
      <select
        className="field-select ing-unit-select"
        value={selectVal}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">—</option>
        {RECIPE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        <option value="__custom">Custom…</option>
      </select>
      {customMode && (
        <input
          className="field-input ing-unit-custom"
          type="text"
          value={ing.unit}
          onChange={(e) => onChange(idx, { ...ing, unit: e.target.value })}
          placeholder="unit"
        />
      )}
      <input
        className="field-input ing-name-input"
        type="text"
        value={ing.name}
        onChange={(e) => onChange(idx, { ...ing, name: e.target.value })}
        placeholder="ingredient"
      />
      <input
        className="field-input ing-notes-input"
        type="text"
        value={ing.notes || ''}
        onChange={(e) => onChange(idx, { ...ing, notes: e.target.value })}
        placeholder="notes (optional)"
      />
      <input
        className="field-input ing-cost-input"
        type="number"
        min="0"
        step="0.01"
        value={ing.cost || ''}
        onChange={(e) => onChange(idx, { ...ing, cost: e.target.value })}
        placeholder="$"
      />
      {showRemove && (
        <button type="button" className="btn ghost ing-del-btn" onClick={() => onRemove(idx)}>✕</button>
      )}
    </div>
  );
}

function RecipeForm({ initial, onSave, onCancel, onDelete, mode = "new" }) {
  const toast = useToast();
  const [name, setName] = useStateF(initial?.name || "");
  const [cuisine, setCuisine] = useStateF(initial?.cuisine || "");
  const [time, setTime] = useStateF(initial?.time || 30);
  const [serves, setServes] = useStateF(initial?.serves || 2);
  const [tagline, setTagline] = useStateF(initial?.tagline || "");
  const [description, setDescription] = useStateF(initial?.description || "");
  const [ingredients, setIngredients] = useStateF(() => {
    if (initial?.ingredients?.length) return initial.ingredients.map(i => ({ ...i }));
    return [{ qty: '', unit: '', name: '' }];
  });

  const addIngredient = () => setIngredients(prev => [...prev, { qty: '', unit: '', name: '', cost: '' }]);
  const removeIngredient = (idx) => setIngredients(prev => prev.filter((_, i) => i !== idx));
  const updateIngredient = (idx, updated) => setIngredients(prev => prev.map((ing, i) => i === idx ? updated : ing));

  const handleSave = () => {
    if (!name.trim()) { toast("Name is required", "warn"); return; }
    const validIngredients = ingredients.filter(ing => ing.name.trim());
    if (!validIngredients.length) { toast("At least one ingredient is required", "warn"); return; }
    onSave({
      id: initial?.id || SDStore.newId("rec"),
      name: name.trim(),
      cuisine: cuisine.trim(),
      time: Number(time) || 0,
      serves: Number(serves) || 0,
      tagline: tagline.trim(),
      ingredients: validIngredients,
      description,
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
    });
  };

  const exportOne = (fmt) => {
    if (fmt === "json") {
      const e = { id: initial?.id || "draft", name, cuisine, time, serves, tagline, ingredients, description };
      SDStore.download(`${(name || "recipe").replace(/\s+/g, "_").toLowerCase()}.json`, JSON.stringify(e, null, 2));
      toast("Exported JSON", "ok");
    } else {
      const row = { name, cuisine, time, serves, tagline, ingredients: JSON.stringify(ingredients), description };
      const csv = SDStore.toCSV([row], ["name","cuisine","time","serves","tagline","ingredients","description"]);
      SDStore.download(`${(name || "recipe").replace(/\s+/g, "_").toLowerCase()}.csv`, csv, "text/csv");
      toast("Exported CSV", "ok");
    }
  };

  return (
    <Modal
      eyebrow={mode === "new" ? "New recipe" : "Edit recipe"}
      title={mode === "new" ? "Add a" : "Refine"}
      italicTitle={mode === "new" ? "recipe" : "the recipe"}
      onClose={onCancel}
      wide
      footer={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "edit" && onDelete && (
              <button className="btn danger" onClick={onDelete}>Delete</button>
            )}
            <div className="export-group">
              <span className="lbl">Export</span>
              <button onClick={() => exportOne("json")}>.json</button>
              <button onClick={() => exportOne("csv")}>.csv</button>
            </div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn accent" onClick={handleSave}>{mode === "new" ? "Publish recipe" : "Save changes"}</button>
          </div>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label className="field-label">Name</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fish Tacos, San Diego" />
        </div>
        <div className="field">
          <label className="field-label">Cuisine / Category</label>
          <input className="field-input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Mexican" />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Time (minutes)</label>
          <input className="field-input" type="number" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Serves</label>
          <input className="field-input" type="number" value={serves} onChange={(e) => setServes(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Tagline</label>
        <input className="field-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One sentence. Make it sting." />
      </div>

      <div className="field">
        <label className="field-label">Ingredients</label>
        <div className="ingredient-editor">
          {ingredients.map((ing, idx) => (
            <IngredientRow
              key={idx}
              ing={ing}
              idx={idx}
              onChange={updateIngredient}
              onRemove={removeIngredient}
              showRemove={ingredients.length > 1}
            />
          ))}
          <button type="button" className="btn ghost add-ingredient-btn" onClick={addIngredient}>+ Add ingredient</button>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Method</label>
        <RichEditor value={description} onChange={setDescription} placeholder="Method. No filler. The reader is hungry." />
      </div>
    </Modal>
  );
}

/* ============================================================
   EDIT PICKER — dropdown / search to choose what to edit
   ============================================================ */

function RestaurantListModal({ restaurants, onClose, onOpenProfile, onEdit }) {
  const sorted = useMemoF(() =>
    [...restaurants].sort((a, b) => a.name.localeCompare(b.name)),
    [restaurants]
  );

  return (
    <Modal eyebrow="Restaurants" title="All" italicTitle="entries" onClose={onClose}>
      <div className="edit-list">
        {sorted.length === 0 && (
          <div style={{ padding: "32px 18px", textAlign: "center" }} className="muted">
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>No restaurants yet.</div>
          </div>
        )}
        {sorted.map((r) => (
          <div key={r.id} className="restaurant-list-row">
            <button className="restaurant-list-row-main" onClick={() => onOpenProfile(r)}>
              <div>
                <div className="er-name">{r.name}</div>
                <div className="er-meta">
                  {r.cuisine}{r.address ? ` · ${r.address.split(",")[0]}` : ""}
                </div>
              </div>
            </button>
            <button className="restaurant-list-edit-btn" onClick={() => onEdit(r)}>Edit</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function NoteListModal({ notes, onClose, onOpenProfile, onEdit }) {
  const sorted = useMemoF(() =>
    [...notes].sort((a, b) => a.name.localeCompare(b.name)),
    [notes]
  );

  return (
    <Modal eyebrow="Notes" title="All" italicTitle="notes" onClose={onClose}>
      <div className="edit-list">
        {sorted.length === 0 && (
          <div style={{ padding: "32px 18px", textAlign: "center" }} className="muted">
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>No notes yet.</div>
          </div>
        )}
        {sorted.map((n) => (
          <div key={n.id} className="restaurant-list-row">
            <button className="restaurant-list-row-main" onClick={() => onOpenProfile(n)}>
              <div>
                <div className="er-name">{n.name}</div>
                <div className="er-meta">
                  {n.tag || "Note"}{n.address ? ` · ${n.address.split(",")[0]}` : ""}
                </div>
              </div>
            </button>
            <button className="restaurant-list-edit-btn" onClick={() => onEdit(n)}>Edit</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function EditPicker({ entries, kind, onPick, onCancel }) {
  const [q, setQ] = useStateF("");
  const filtered = useMemoF(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) => {
      const fields = [e.name, e.cuisine, e.address, e.tagline, e.description].filter(Boolean).join(" ").toLowerCase();
      return fields.includes(s);
    });
  }, [q, entries]);

  return (
    <Modal
      eyebrow={`Edit ${kind}`}
      title="Choose an"
      italicTitle="entry"
      onClose={onCancel}
    >
      <div className="edit-search">
        <div className="search-field">
          <span className="icon" />
          <input
            autoFocus
            placeholder={`Search by name, ${kind === "restaurant" ? "cuisine, neighborhood…" : "category, ingredient…"}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="edit-list">
        {filtered.length === 0 && (
          <div style={{ padding: "32px 18px", textAlign: "center" }} className="muted">
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>Nothing matches.</div>
          </div>
        )}
        {filtered.map((e) => (
          <button key={e.id} className="edit-row" onClick={() => onPick(e)}>
            <div>
              <div className="er-name">{e.name}</div>
              <div className="er-meta">
                {e.cuisine}{e.address ? ` · ${e.address.split(",")[0]}` : ""}{e.time ? ` · ${e.time} min` : ""}
              </div>
            </div>
            <div className="er-go">→</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ============================================================
   IMPORT DIALOG — with duplicate handling
   ============================================================ */

function ImportDialog({ existing, kind, onClose, onCommit }) {
  const toast = useToast();
  const [stage, setStage] = useStateF("pick"); // pick | review
  const [incoming, setIncoming] = useStateF([]);
  const [decisions, setDecisions] = useStateF({}); // id -> "overwrite" | "discard"
  const fileRef = useRefF(null);

  const existingMap = useMemoF(() => {
    const m = new Map();
    existing.forEach((e) => m.set(e.id, e));
    // also map by name (for natural-duplicate detection)
    existing.forEach((e) => m.set("name:" + e.name.trim().toLowerCase(), e));
    return m;
  }, [existing]);

  const handleFile = async (f) => {
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : [data];
      if (arr.length === 0) { toast("File contained no entries", "warn"); return; }
      const invalid = arr.filter((e) => {
        if (!e || typeof e !== "object" || Array.isArray(e)) return true;
        if (!e.name || typeof e.name !== "string" || !e.name.trim()) return true;
        if (kind === "restaurant" && (typeof e.lat !== "number" || typeof e.lng !== "number")) return true;
        return false;
      });
      if (invalid.length > 0) {
        toast(`Wrong format — ${invalid.length} entr${invalid.length === 1 ? "y" : "ies"} missing required fields (name${kind === "restaurant" ? ", lat, lng" : ""})`, "warn");
        return;
      }
      setIncoming(arr);
      // initialize decisions: default to "overwrite" for dupes
      const init = {};
      arr.forEach((e) => {
        const dupById = existing.find((x) => x.id === e.id);
        const dupByName = existing.find((x) => x.name?.trim().toLowerCase() === (e.name || "").trim().toLowerCase());
        if (dupById || dupByName) init[e.id || ("name:" + (e.name || ""))] = "overwrite";
      });
      setDecisions(init);
      setStage("review");
    } catch (err) {
      toast("Invalid JSON file", "warn");
    }
  };

  const dupes = useMemoF(() => {
    return incoming.map((e) => {
      const dupById = existing.find((x) => x.id === e.id);
      const dupByName = existing.find((x) => x.name?.trim().toLowerCase() === (e.name || "").trim().toLowerCase());
      return { entry: e, dup: dupById || dupByName || null, key: e.id || ("name:" + (e.name || "")) };
    });
  }, [incoming, existing]);

  const duplicates = dupes.filter((d) => d.dup);
  const fresh = dupes.filter((d) => !d.dup);

  const commit = () => {
    const out = [...existing];
    const byId = new Map(out.map((x) => [x.id, x]));

    fresh.forEach(({ entry }) => {
      const e = { ...entry, id: entry.id || SDStore.newId(kind === "restaurant" ? "r" : "rec") };
      if (byId.has(e.id)) e.id = SDStore.newId(kind === "restaurant" ? "r" : "rec");
      byId.set(e.id, e);
      out.push(e);
    });

    duplicates.forEach(({ entry, dup, key }) => {
      const decision = decisions[key] || "overwrite";
      if (decision === "overwrite") {
        const idx = out.findIndex((x) => x.id === dup.id);
        out[idx] = { ...dup, ...entry, id: dup.id };
      }
      // else: discard incoming — out stays
    });

    onCommit(out);
    toast(`Imported · ${fresh.length} new · ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} reviewed`, "ok");
  };

  return (
    <Modal
      eyebrow={`Import ${kind}s`}
      title={stage === "pick" ? "Choose a" : "Review the"}
      italicTitle={stage === "pick" ? ".json file" : "incoming entries"}
      onClose={onClose}
      footer={
        stage === "pick" ? (
          <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>
            Accepts .json — array of entries or a single entry
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>
              {fresh.length} new · {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"}
            </div>
            <div className="row">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn accent" onClick={commit}>Commit import</button>
            </div>
          </>
        )
      }
    >
      {stage === "pick" && (
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--muted)", maxWidth: 540, marginBottom: 18 }}>
            Drop in a backup file — or any .json containing an array of <em>{kind}</em> entries.
            Duplicates will be flagged and you'll decide overwrite or discard, one by one.
          </div>
          <button className="btn primary" onClick={() => fileRef.current?.click()}>Choose .json file</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {stage === "review" && (
        <div>
          {fresh.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="field-label" style={{ color: "var(--marine)" }}>{fresh.length} new entr{fresh.length === 1 ? "y" : "ies"} — will be added</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fresh.map(({ entry }, i) => (
                  <div key={i} className="dup-row" style={{ borderColor: "var(--hairline)" }}>
                    <div>
                      <div className="dup-name">{entry.name}</div>
                      <div className="er-meta">{entry.cuisine || "—"}{entry.address ? ` · ${entry.address.split(",")[0]}` : ""}</div>
                    </div>
                    <div className="dup-actions">
                      <span className="mini" style={{ background: "var(--marine)", borderColor: "var(--marine)", color: "var(--paper)" }}>New</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {duplicates.length > 0 && (
            <div>
              <div className="field-label" style={{ color: "var(--terracotta)" }}>
                {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"} — choose overwrite or discard
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {duplicates.map(({ entry, dup, key }) => {
                  const choice = decisions[key] || "overwrite";
                  return (
                    <div key={key} className="dup-row">
                      <div>
                        <div className="dup-name">{entry.name}</div>
                        <div className="er-meta">
                          Existing: {dup.cuisine || "—"} · {dup.address ? dup.address.split(",")[0] : ""}
                        </div>
                      </div>
                      <div className="dup-actions">
                        <button
                          className="mini"
                          style={choice === "overwrite" ? { background: "var(--ink)", color: "var(--paper)" } : {}}
                          onClick={() => setDecisions({ ...decisions, [key]: "overwrite" })}
                        >
                          Overwrite
                        </button>
                        <button
                          className="mini danger"
                          style={choice === "discard" ? { background: "var(--terracotta)", borderColor: "var(--terracotta)", color: "var(--paper)" } : {}}
                          onClick={() => setDecisions({ ...decisions, [key]: "discard" })}
                        >
                          Discard new
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ============================================================
   NOTE FORM (new + edit)
   ============================================================ */

function NoteForm({ initial, defaultLat, defaultLng, defaultAddress, onSave, onCancel, onDelete, mode = "new" }) {
  const toast = useToast();
  const [name, setName] = useStateF(initial?.name || "");
  const [address, setAddress] = useStateF(initial?.address || defaultAddress || "");
  const [tag, setTag] = useStateF(initial?.tag || "");
  const [lat, setLat] = useStateF(initial?.lat ?? defaultLat ?? 32.7157);
  const [lng, setLng] = useStateF(initial?.lng ?? defaultLng ?? -117.1611);
  const [description, setDescription] = useStateF(initial?.description || "");

  const handleSave = () => {
    if (!name.trim()) { toast("Name is required", "warn"); return; }
    const entry = {
      id: initial?.id || SDStore.newId("n"),
      name: name.trim(),
      address: address.trim() || undefined,
      tag: tag.trim() || "Note",
      lat: Number(lat),
      lng: Number(lng),
      description,
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
    };
    onSave(entry);
  };

  return (
    <Modal
      eyebrow={mode === "new" ? "New note" : "Edit note"}
      title={mode === "new" ? "Pin a" : "Edit the"}
      italicTitle="note"
      onClose={onCancel}
      wide
      footer={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "edit" && onDelete && (
              <button className="btn danger" onClick={onDelete}>Delete</button>
            )}
          </div>
          <div className="row">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn accent" onClick={handleSave}>{mode === "new" ? "Save note" : "Save changes"}</button>
          </div>
        </>
      }
    >
      <div className="field">
        <label className="field-label">Name</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunset viewpoint" />
      </div>

      <div className="field">
        <label className="field-label">Tag</label>
        <input className="field-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Viewpoint, Parking, Hidden Gem…" />
      </div>

      <div className="field">
        <label className="field-label">Address <span className="field-optional">optional</span></label>
        <input className="field-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Coast Hwy, San Diego, CA" />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Latitude</label>
          <input className="field-input" type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Longitude</label>
          <input className="field-input" type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Notes</label>
        <RichEditor value={description} onChange={setDescription} placeholder="What makes this spot worth noting…" />
      </div>
    </Modal>
  );
}

/* ============================================================
   CONTACTS IMPORT DIALOG
   ============================================================ */

function ContactsImportDialog({ onClose, onCommit }) {
  const toast = useToast();
  const fileRef = useRefF(null);

  const handleFile = async (f) => {
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (typeof data !== "object" || Array.isArray(data)) {
        toast("Invalid contacts file — expected a JSON object keyed by restaurant ID", "warn");
        return;
      }
      toast("Contacts imported", "ok");
      onCommit(data);
    } catch {
      toast("Invalid JSON file", "warn");
    }
  };

  return (
    <Modal
      eyebrow="Import contacts"
      title="Choose a"
      italicTitle="contacts file"
      onClose={onClose}
      footer={
        <>
          <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>
            Accepts contacts.json — keyed by restaurant ID
          </div>
          <button className="btn primary" onClick={() => fileRef.current?.click()}>Choose file</button>
        </>
      }
    >
      <div style={{ padding: "12px 0" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--muted)", maxWidth: 540, marginBottom: 18 }}>
          Select a contacts.json backup file. Each restaurant's contacts will be overwritten with the imported data.
        </div>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>Choose .json file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden-file"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </Modal>
  );
}

/* ============================================================
   BOTH IMPORT DIALOG
   ============================================================ */

function BothImportDialog({ existing, onClose, onCommit }) {
  const toast = useToast();
  const restFileRef = useRefF(null);
  const contFileRef = useRefF(null);
  const [restData, setRestData] = useStateF(null);
  const [contData, setContData] = useStateF(null);
  const [restName, setRestName] = useStateF("");
  const [contName, setContName] = useStateF("");

  const handleRestFile = async (f) => {
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : [data];
      setRestData(arr);
      setRestName(f.name);
    } catch { toast("Invalid JSON file for restaurants", "warn"); }
  };

  const handleContFile = async (f) => {
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (typeof data !== "object" || Array.isArray(data)) {
        toast("Invalid contacts JSON — expected an object keyed by restaurant ID", "warn");
        return;
      }
      setContData(data);
      setContName(f.name);
    } catch { toast("Invalid JSON file for contacts", "warn"); }
  };

  const commit = () => {
    if (!restData && !contData) { toast("No files selected", "warn"); return; }
    let newRestaurants = null;
    if (restData) {
      const out = [...existing];
      const byId = new Map(out.map((x) => [x.id, x]));
      restData.forEach((entry) => {
        if (byId.has(entry.id)) {
          const idx = out.findIndex((x) => x.id === entry.id);
          out[idx] = { ...out[idx], ...entry };
        } else {
          const e = { ...entry, id: entry.id || SDStore.newId("r") };
          out.push(e);
        }
      });
      newRestaurants = out;
    }
    const parts = [];
    if (restData) parts.push(`${restData.length} restaurant${restData.length !== 1 ? "s" : ""}`);
    if (contData) parts.push("contacts");
    toast(`Imported ${parts.join(" & ")}`, "ok");
    onCommit({ restaurants: newRestaurants, contacts: contData });
  };

  return (
    <Modal
      eyebrow="Import both"
      title="Choose"
      italicTitle="your files"
      onClose={onClose}
      footer={
        <>
          <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>
            Each file is optional — import one or both
          </div>
          <div className="row">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn accent" onClick={commit} disabled={!restData && !contData}>Commit import</button>
          </div>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "12px 0" }}>
        <div>
          <div className="field-label">Restaurants file</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--muted)", margin: "6px 0 10px" }}>
            {restName ? `${restName} · ${restData?.length} entries` : "No file selected"}
          </div>
          <button className="btn ghost" onClick={() => restFileRef.current?.click()}>
            {restName ? "Change file" : "Choose restaurants.json"}
          </button>
          <input ref={restFileRef} type="file" accept="application/json,.json" className="hidden-file"
            onChange={(e) => handleRestFile(e.target.files?.[0])} />
        </div>
        <div>
          <div className="field-label">Contacts file</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--muted)", margin: "6px 0 10px" }}>
            {contName ? contName : "No file selected"}
          </div>
          <button className="btn ghost" onClick={() => contFileRef.current?.click()}>
            {contName ? "Change file" : "Choose contacts.json"}
          </button>
          <input ref={contFileRef} type="file" accept="application/json,.json" className="hidden-file"
            onChange={(e) => handleContFile(e.target.files?.[0])} />
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   LOGIN MODAL
   ============================================================ */

/* ============================================================
   ALL ENTRIES LIST — unified restaurants + notes, searchable
   ============================================================ */

function AllEntriesListModal({ restaurants, notes, onClose, onOpenRestaurant, onEditRestaurant, onOpenNote, onEditNote }) {
  const [q, setQ] = useStateF("");
  const term = q.trim().toLowerCase();

  const matchInfo = (entry) => {
    if (!term) return { match: true, titleHit: false };
    const titleHit = (entry.name || "").toLowerCase().includes(term);
    const other = [
      entry.cuisine, entry.tag, entry.address, stripTags(entry.description),
      Array.isArray(entry.tags) ? entry.tags.join(" ") : "",
    ].filter(Boolean).join(" ").toLowerCase();
    return { match: titleHit || other.includes(term), titleHit };
  };

  // Title matches float to the top of each section, then alphabetical.
  const sortFilter = (list) => list
    .map((e) => ({ e, ...matchInfo(e) }))
    .filter((x) => x.match)
    .sort((a, b) => (a.titleHit !== b.titleHit ? (a.titleHit ? -1 : 1) : (a.e.name || "").localeCompare(b.e.name || "")))
    .map((x) => x.e);

  const rList = useMemoF(() => sortFilter(restaurants || []), [restaurants, term]);
  const nList = useMemoF(() => sortFilter(notes || []), [notes, term]);
  const empty = rList.length === 0 && nList.length === 0;

  const sectionStyle = {
    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
    color: "var(--muted)", padding: "16px 4px 8px", display: "flex", justifyContent: "space-between",
    alignItems: "center", borderBottom: "1px solid var(--hairline)", marginBottom: 4,
  };
  const badge = (letter, bg) => (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16,
      borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", marginRight: 7,
      verticalAlign: "middle", background: bg, color: "var(--paper)",
    }}>{letter}</span>
  );

  return (
    <Modal eyebrow="Manage" title="All" italicTitle="entries" onClose={onClose}>
      <div className="edit-search">
        <div className="search-field">
          <span className="icon" />
          <input
            autoFocus
            placeholder="Search restaurants & notes — matches titles first…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="edit-list">
        {empty && (
          <div style={{ padding: "32px 18px", textAlign: "center" }} className="muted">
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>
              {term ? "Nothing matches." : "No entries yet."}
            </div>
          </div>
        )}

        {rList.length > 0 && (
          <>
            <div style={sectionStyle}><span>Restaurants</span><span>{rList.length}</span></div>
            {rList.map((r) => (
              <div key={r.id} className="restaurant-list-row">
                <button className="restaurant-list-row-main" onClick={() => onOpenRestaurant(r)}>
                  <div>
                    <div className="er-name">{badge("R", "var(--marine)")}{r.name}</div>
                    <div className="er-meta">{r.cuisine || "Restaurant"}{r.address ? ` · ${r.address.split(",")[0]}` : ""}</div>
                  </div>
                </button>
                <button className="restaurant-list-edit-btn" onClick={() => onEditRestaurant(r)}>Edit</button>
              </div>
            ))}
          </>
        )}

        {nList.length > 0 && (
          <>
            <div style={sectionStyle}><span>Notes</span><span>{nList.length}</span></div>
            {nList.map((n) => (
              <div key={n.id} className="restaurant-list-row">
                <button className="restaurant-list-row-main" onClick={() => onOpenNote(n)}>
                  <div>
                    <div className="er-name">{badge("N", "var(--terracotta)")}{n.name}</div>
                    <div className="er-meta">{n.tag || "Note"}{n.address ? ` · ${n.address.split(",")[0]}` : ""}</div>
                  </div>
                </button>
                <button className="restaurant-list-edit-btn" onClick={() => onEditNote(n)}>Edit</button>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   GENERAL IMPORT — one of restaurants.json / contacts.json / notes.json
   ============================================================ */

const IMPORT_TYPES = [
  { key: "restaurant", file: "restaurants.json", title: "Restaurants", desc: "An array of restaurant entries — each needs a name plus numeric lat & lng." },
  { key: "note",       file: "notes.json",       title: "Notes",       desc: "An array of map notes — each needs a name plus numeric lat & lng." },
  { key: "contacts",   file: "contacts.json",    title: "Contacts",    desc: "A JSON object keyed by restaurant ID, each holding an array of contacts." },
];

function GeneralImportDialog({ restaurants, notes, onClose, onCommitRestaurants, onCommitNotes, onCommitContacts }) {
  const toast = useToast();
  const [type, setType] = useStateF(null);       // "restaurant" | "note" | "contacts"
  const [stage, setStage] = useStateF("type");   // type | pick | review
  const [incoming, setIncoming] = useStateF([]);
  const [decisions, setDecisions] = useStateF({});
  const fileRef = useRefF(null);

  const existing = type === "restaurant" ? (restaurants || []) : type === "note" ? (notes || []) : [];
  const meta = IMPORT_TYPES.find((t) => t.key === type);

  const startType = (t) => { setType(t); setStage("pick"); };

  const handleFile = async (f) => {
    if (!f) return;

    // Soft filename guard — reject a file that clearly belongs to another type.
    const fname = (f.name || "").toLowerCase();
    const others = IMPORT_TYPES.filter((t) => t.key !== type).map((t) => t.file.replace(".json", ""));
    const mineRoot = meta.file.replace(".json", "");
    if (!fname.includes(mineRoot) && others.some((o) => fname.includes(o))) {
      toast(`That looks like a different file — choose a ${meta.file}`, "warn");
      return;
    }

    let data;
    try {
      data = JSON.parse(await f.text());
    } catch {
      toast("Invalid JSON file", "warn");
      return;
    }

    if (type === "contacts") {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        toast("Wrong format — contacts.json must be an object keyed by restaurant ID", "warn");
        return;
      }
      const bad = Object.keys(data).some((k) => !Array.isArray(data[k]));
      if (bad) {
        toast("Wrong format — each restaurant's contacts must be an array", "warn");
        return;
      }
      onCommitContacts(data);
      toast("Imported · contacts", "ok");
      return;
    }

    // restaurant / note — both are arrays of geo entries
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) { toast("File contained no entries", "warn"); return; }
    const invalid = arr.filter((e) => {
      if (!e || typeof e !== "object" || Array.isArray(e)) return true;
      if (!e.name || typeof e.name !== "string" || !e.name.trim()) return true;
      if (typeof e.lat !== "number" || typeof e.lng !== "number") return true;
      return false;
    });
    if (invalid.length > 0) {
      toast(`Wrong format — ${invalid.length} entr${invalid.length === 1 ? "y" : "ies"} missing required fields (name, lat, lng)`, "warn");
      return;
    }
    setIncoming(arr);
    const init = {};
    arr.forEach((e) => {
      const dup = existing.find((x) => x.id === e.id || x.name?.trim().toLowerCase() === (e.name || "").trim().toLowerCase());
      if (dup) init[e.id || ("name:" + (e.name || ""))] = "overwrite";
    });
    setDecisions(init);
    setStage("review");
  };

  const dupes = useMemoF(() => {
    if (type === "contacts") return [];
    return incoming.map((e) => {
      const dup = existing.find((x) => x.id === e.id || x.name?.trim().toLowerCase() === (e.name || "").trim().toLowerCase());
      return { entry: e, dup: dup || null, key: e.id || ("name:" + (e.name || "")) };
    });
  }, [incoming, existing, type]);

  const duplicates = dupes.filter((d) => d.dup);
  const fresh = dupes.filter((d) => !d.dup);

  const commit = () => {
    const prefix = type === "restaurant" ? "r" : "n";
    const out = [...existing];
    const byId = new Map(out.map((x) => [x.id, x]));

    fresh.forEach(({ entry }) => {
      const e = { ...entry, id: entry.id || SDStore.newId(prefix) };
      if (byId.has(e.id)) e.id = SDStore.newId(prefix);
      byId.set(e.id, e);
      out.push(e);
    });

    duplicates.forEach(({ entry, dup, key }) => {
      const decision = decisions[key] || "overwrite";
      if (decision === "overwrite") {
        const idx = out.findIndex((x) => x.id === dup.id);
        out[idx] = { ...dup, ...entry, id: dup.id };
      }
    });

    if (type === "restaurant") onCommitRestaurants(out);
    else onCommitNotes(out);
    toast(`Imported · ${fresh.length} new · ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} reviewed`, "ok");
  };

  const monoNote = { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" };

  let titleA = "Choose a", titleB = "data type";
  if (stage === "pick") { titleA = "Choose a"; titleB = meta.file; }
  if (stage === "review") { titleA = "Review the"; titleB = "incoming entries"; }

  return (
    <Modal
      eyebrow="Import"
      title={titleA}
      italicTitle={titleB}
      onClose={onClose}
      footer={
        stage === "type" ? (
          <div className="muted" style={monoNote}>One file at a time — verified before it lands</div>
        ) : stage === "pick" ? (
          <div className="row" style={{ width: "100%", justifyContent: "space-between" }}>
            <button className="btn ghost" onClick={() => { setStage("type"); setType(null); }}>← Back</button>
            <div className="muted" style={monoNote}>Accepts {meta.file}</div>
          </div>
        ) : (
          <>
            <div className="muted" style={monoNote}>{fresh.length} new · {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"}</div>
            <div className="row">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn accent" onClick={commit}>Commit import</button>
            </div>
          </>
        )
      }
    >
      {stage === "type" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
          <p style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.65, marginBottom: 6 }}>
            Which kind of backup are you importing? You can bring in one file at a time.
          </p>
          {IMPORT_TYPES.map((t) => (
            <button key={t.key} className="btn primary" onClick={() => startType(t.key)}>
              {t.file}
            </button>
          ))}
        </div>
      )}

      {stage === "pick" && (
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--muted)", maxWidth: 540, marginBottom: 18 }}>
            {meta.desc} {type !== "contacts" && <>Duplicates are flagged so you can overwrite or discard, one by one.</>}
          </div>
          <button className="btn primary" onClick={() => fileRef.current?.click()}>Choose {meta.file}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {stage === "review" && (
        <div>
          {fresh.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="field-label" style={{ color: "var(--marine)" }}>{fresh.length} new entr{fresh.length === 1 ? "y" : "ies"} — will be added</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fresh.map(({ entry }, i) => (
                  <div key={i} className="dup-row" style={{ borderColor: "var(--hairline)" }}>
                    <div>
                      <div className="dup-name">{entry.name}</div>
                      <div className="er-meta">{entry.cuisine || entry.tag || "—"}{entry.address ? ` · ${entry.address.split(",")[0]}` : ""}</div>
                    </div>
                    <div className="dup-actions">
                      <span className="mini" style={{ background: "var(--marine)", borderColor: "var(--marine)", color: "var(--paper)" }}>New</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {duplicates.length > 0 && (
            <div>
              <div className="field-label" style={{ color: "var(--terracotta)" }}>
                {duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"} — choose overwrite or discard
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {duplicates.map(({ entry, dup, key }) => {
                  const choice = decisions[key] || "overwrite";
                  return (
                    <div key={key} className="dup-row">
                      <div>
                        <div className="dup-name">{entry.name}</div>
                        <div className="er-meta">
                          Existing: {dup.cuisine || dup.tag || "—"}{dup.address ? ` · ${dup.address.split(",")[0]}` : ""}
                        </div>
                      </div>
                      <div className="dup-actions">
                        <button
                          className="mini"
                          style={choice === "overwrite" ? { background: "var(--ink)", color: "var(--paper)" } : {}}
                          onClick={() => setDecisions({ ...decisions, [key]: "overwrite" })}
                        >
                          Overwrite
                        </button>
                        <button
                          className="mini danger"
                          style={choice === "discard" ? { background: "var(--terracotta)", borderColor: "var(--terracotta)", color: "var(--paper)" } : {}}
                          onClick={() => setDecisions({ ...decisions, [key]: "discard" })}
                        >
                          Discard new
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}


function LoginModal({ onLogin, onCancel }) {
  const [pw, setPw] = useStateF("");
  const [err, setErr] = useStateF(false);
  const [loading, setLoading] = useStateF(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    const ok = await SDStore.adminLogin(pw);
    setLoading(false);
    if (ok) {
      toast("Logged in as admin", "ok");
      onLogin();
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 1400);
    }
  };

  return (
    <Modal
      eyebrow="Access"
      title="Admin"
      italicTitle="login"
      onClose={onCancel}
      footer={
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn accent" onClick={handleSubmit} disabled={loading}>
            {loading ? "Checking…" : "Log in"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label className="field-label">Password</label>
        <input
          className={`field-input${err ? " field-input-err" : ""}`}
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoFocus
          placeholder="••••••••"
        />
        {err && <div className="field-err-msg">Incorrect password</div>}
      </div>
    </Modal>
  );
}

Object.assign(window, { RestaurantForm, RecipeForm, NoteForm, EditPicker, RestaurantListModal, NoteListModal, ImportDialog, LoginModal, ContactsImportDialog, BothImportDialog, AllEntriesListModal, GeneralImportDialog });

})();
