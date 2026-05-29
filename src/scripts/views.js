(function () {
/* global React, L, StarsRead, ManageMenu, useToast, SDStore */
const { useState: useStateV, useEffect: useEffectV, useRef: useRefV, useMemo: useMemoV } = React;

/* ============================================================
   ABOUT VIEW — the masthead, intro, and side arrows
   ============================================================ */

function AboutView({ goLeft, goRight }) {
  return (
    <div className="about" data-screen-label="01 About">
      <div className="chrome">
        <div className="left">
          <span className="vol">Vol. I</span>
          <span>Established · 5.27.2026</span>
        </div>
        <div className="right">
          <span>San Diego · CA</span>
          <span>32.7157° N · 117.1611° W</span>
        </div>
      </div>

      <div className="corner-orn tl" />
      <div className="corner-orn tr" />
      <div className="corner-orn bl" />
      <div className="corner-orn br" />

      <div className="about-center">
        <div className="eyebrow">A field journal of restaurants &amp; recipes</div>
        <div className="rule-top" />
        <h1 className="masthead">
          <span className="the">The</span>
          Sabroso
        </h1>
        <div className="masthead-sub">
          Your San Diego <em>Digest</em> <span className="emo">:D</span>
        </div>
        <div className="rule-bot" />

        <div className="about-byline">
          <span>Issue No. 07</span>
          <span className="dot" />
          <span>Coast → Counter</span>
          <span className="dot" />
          <span>Read in 90 seconds</span>
        </div>

        <p className="about-intro">
          <span className="drop">G</span><span className="drop-lead">ood</span> food is everywhere — and yet I still can't decide where to go or what to cook&nbsp;because I have no idea where I saved my restaurant list or recipe collection are in my notes. So here we go: this is a no filler, no sponsored seafood towers, no &ldquo;hidden gems&rdquo; that have been on the cover of <em>Eater</em> for two years. The map is the classroom; the recipes are the homework. Pin a place, log a verdict, write the method down before you forget it. <br></br><br></br>Welcome to the place where<br></br>you either find delicious food or make it.<br></br><br></br><i>Buen provecho, bon appétit, and just eat gud y'all!</i><br></br><b>~ G</b>
        </p>
      </div>

      <div className="about-meta">
        <span>Edited by <a href="https://www.gabebarrera.dev" target="_blank" rel="noopener noreferrer">Gabe</a> · Chef &amp; Cyber Nerd</span>
      </div>
    </div>
  );
}

/* ============================================================
   MAP VIEW — leaflet + restaurant pins + manage
   ============================================================ */

function isFilterHidden(r, hiddenFilters) {
  if (!hiddenFilters || !hiddenFilters.length) return false;
  if (hiddenFilters.includes("all")) return true;
  const cuisine = (r.cuisine || "").toLowerCase();
  const tags = (Array.isArray(r.tags) ? r.tags : ["restaurant"]).map((t) => t.toLowerCase());
  for (const f of hiddenFilters) {
    if (f === "bar" || f === "restaurant") {
      if (tags.length === 1 && tags[0] === f) return true;
    } else {
      if (cuisine.includes(f)) return true;
    }
  }
  return false;
}

function MapView({ restaurants, setRestaurants, openProfile, openManage, navigate, theme, hiddenFilters, mapActionsRef,
                   cmdText, setCmdText, onCmdSubmit, chatActive, setChatActive }) {
  const mapDiv = useRefV(null);
  const mapInstance = useRefV(null);
  const tileLayerRef = useRefV(null);
  const markersRef = useRefV([]);
  const userMarkerRef = useRefV(null);
  const toast = useToast();

  // build map once
  useEffectV(() => {
    if (!mapDiv.current || mapInstance.current) return;
    const map = L.map(mapDiv.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([32.7157, -117.1611], 12);

    const tileUrl = (t) => t === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(tileUrl(theme), {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    mapInstance.current = map;

    // try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const icon = L.divIcon({
            className: "",
            html: '<div class="sd-marker user-marker"><div class="pulse"></div><div class="dot"></div></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([latitude, longitude], { icon }).addTo(map);
          m.bindPopup('<div class="pin-pop"><div class="pop-cuisine">You are here</div><div class="pop-name">Current location</div></div>');
          userMarkerRef.current = m;
        },
        () => {
          // fallback — pretend the user is downtown
          const icon = L.divIcon({
            className: "",
            html: '<div class="sd-marker user-marker"><div class="pulse"></div><div class="dot"></div></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([32.7157, -117.1611], { icon }).addTo(map);
          m.bindPopup('<div class="pin-pop"><div class="pop-cuisine">Approximate location</div><div class="pop-name">Downtown San Diego</div><div class="pop-addr" style="margin-top:6px">Location services unavailable</div></div>');
          userMarkerRef.current = m;
        },
        { timeout: 6000 }
      );
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // swap tile layer when theme changes
  useEffectV(() => {
    const map = mapInstance.current;
    if (!map || !tileLayerRef.current) return;
    const newUrl = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    tileLayerRef.current.setUrl(newUrl);
  }, [theme]);

  // re-render restaurant markers when list or filters change
  useEffectV(() => {
    const map = mapInstance.current;
    if (!map) return;

    // clear old
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const markerById = {};

    restaurants.forEach((r) => {
      if (isFilterHidden(r, hiddenFilters)) return;

      const rTags = Array.isArray(r.tags) ? r.tags : ["restaurant"];
      const isBarOnly = rTags.includes("bar") && !rTags.includes("restaurant");
      const markerCls = isBarOnly ? "sd-marker bar-pin" : "sd-marker";
      const icon = L.divIcon({
        className: "",
        html: `<div class="${markerCls}"><div class="pulse"></div><div class="dot"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker([r.lat, r.lng], { icon }).addTo(map);

      const tagBadges = [
        rTags.includes("restaurant") ? '<span class="pop-tag rt">R</span>' : "",
        rTags.includes("bar")        ? '<span class="pop-tag bt">B</span>' : "",
      ].join("");

      const popHtml = `
        <div class="pin-pop">
          <div class="pop-head-row">
            <div class="pop-cuisine">${escapeHtml(r.cuisine || "—")}</div>
            ${tagBadges ? `<div class="pop-tags">${tagBadges}</div>` : ""}
          </div>
          <div class="pop-name">${escapeHtml(r.name)}</div>
          <div class="pop-addr">${escapeHtml(r.address || "")}</div>
          <div class="pop-rating">
            <div class="num">${(r.rating || 0).toFixed(1)}</div>
            <div id="stars-${r.id}"></div>
            <div class="out">/ 5.0</div>
          </div>
          <button class="pop-select" data-id="${r.id}">Open profile →</button>
        </div>
      `;
      m.bindPopup(popHtml, { maxWidth: 300 });
      m.on("popupopen", () => {
        const slot = document.getElementById(`stars-${r.id}`);
        if (slot) slot.innerHTML = starsHtml(r.rating || 0);
        const btn = document.querySelector(`.pop-select[data-id="${r.id}"]`);
        if (btn) {
          btn.onclick = () => {
            map.closePopup();
            openProfile(r);
          };
        }
      });

      // hover to open popup
      m.on("mouseover", () => m.openPopup());

      markerById[r.id] = m;
      markersRef.current.push(m);
    });

    // expose map actions for voice commands
    if (mapActionsRef) {
      mapActionsRef.current = {
        zoomTo: (r) => {
          map.setView([r.lat, r.lng], 16, { animate: true });
          const marker = markerById[r.id];
          setTimeout(() => { if (marker) marker.openPopup(); }, 520);
        },
      };
    }
  }, [restaurants, hiddenFilters]);

  return (
    <div className="map-view" data-screen-label="02 Map">
      <div className="map-header">
        <div className="map-header-left" />
        <div className="title">The Map · <span className="it">San Diego</span></div>
        <div className="map-header-right">
          <ManageMenu items={openManage("restaurant")} />
        </div>
      </div>

      <div className="map-cmd-bar">
        <button
          className={`map-cmd-voice${chatActive ? " active" : ""}`}
          onClick={() => setChatActive((v) => !v)}
          title={chatActive ? "Stop listening" : "Voice commands"}
          aria-label={chatActive ? "Stop voice commands" : "Start voice commands"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
          </svg>
        </button>
        <input
          className="map-cmd-input"
          value={cmdText}
          onChange={(e) => setCmdText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCmdSubmit();
            if (e.key === "Escape") setCmdText("");
          }}
          placeholder='Find a restaurant, cuisine… or "help"'
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button className="map-cmd-submit" onClick={onCmdSubmit} title="Run command">↵</button>
      </div>

      <div ref={mapDiv} className="map-canvas" />

      <div className="map-stat">
        <div className="k">Logged in the savor</div>
        <div className="v">{restaurants.length}<small>restaurants</small></div>
      </div>
    </div>
  );
}

function starsHtml(value) {
  let s = '<div class="stars-read">';
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, value - i));
    s += `<div class="s" style="font-size:14px;line-height:14px;">★<div class="fg" style="width:${fill * 100}%;font-size:14px;line-height:14px;">★</div></div>`;
  }
  s += '</div>';
  return s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

/* ============================================================
   RECIPES VIEW — search + list + detail
   ============================================================ */

function getRecipeBadge(recipe) {
  const text = `${recipe.name} ${recipe.cuisine || ""}`.toLowerCase();
  if (/fish|seafood|shrimp|crab|lobster|tuna|salmon|cod|snapper|clam|oyster|prawn|anchovy/.test(text)) return "seafood";
  if (/cake|cookie|pastry|bread|muffin|biscuit|croissant|scone|tart|pie|baked|french toast|toast|waffle|pancake/.test(text)) return "baked";
  if (/dessert|sweet|chocolate|ice cream|sorbet|pudding|candy/.test(text)) return "dessert";
  if (/salad|vegetar|vegan|veggie|vegetable|tofu|mushroom|lentil/.test(text)) return "veg";
  if (/carne|steak|beef|pork|chicken|lamb|turkey|bacon|sausage|asada|chorizo|meat/.test(text)) return "meat";
  const cuisine = (recipe.cuisine || "").toLowerCase();
  if (/breakfast|brunch/.test(cuisine)) return "baked";
  if (/salad|vegetar|vegan/.test(cuisine)) return "veg";
  return null;
}

const BADGE_LABELS = { meat: "Meat", seafood: "Seafood", veg: "Veg", baked: "Baked", dessert: "Sweet" };

function RecipesView({ recipes, openManage, navigate }) {
  const [q, setQ] = useStateV("");
  const [selectedId, setSelectedId] = useStateV(recipes[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useStateV(true);
  const [sort, setSort] = useStateV(null);
  const [sortOpen, setSortOpen] = useStateV(false);
  const [favorites, setFavorites] = useStateV(() => SDStore.loadFavorites());
  const [openCuisines, setOpenCuisines] = useStateV(() => new Set());
  const sortWrapRef = useRefV(null);

  useEffectV(() => {
    if (!sortOpen) return;
    const onDoc = (e) => { if (!sortWrapRef.current?.contains(e.target)) setSortOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      SDStore.saveFavorites(next);
      return next;
    });
  };

  const toggleCuisine = (cuisine) => {
    setOpenCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(cuisine)) next.delete(cuisine); else next.add(cuisine);
      return next;
    });
  };

  const handleSelectRecipe = (id) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  const SORT_BTN_LABELS = { az: "A–Z", za: "Z–A", time: "Time", serves: "Serves", cuisine: "Cuisine" };
  const SORT_MENU_LABELS = { az: "Sort A → Z", za: "Sort Z → A", time: "By Time", serves: "By Serving Size", cuisine: "By Cuisine" };

  const filtered = useMemoV(() => {
    const s = q.trim().toLowerCase();
    let list = s
      ? recipes.filter((r) => {
          const fields = [r.name, r.cuisine, r.tagline, r.description].filter(Boolean).join(" ").toLowerCase();
          return fields.includes(s);
        })
      : [...recipes];

    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "time") list.sort((a, b) => (a.time || 0) - (b.time || 0));
    else if (sort === "serves") list.sort((a, b) => (a.serves || 0) - (b.serves || 0));
    return list;
  }, [q, recipes, sort]);

  const cuisineGroups = useMemoV(() => {
    if (sort !== "cuisine") return null;
    const groups = {};
    filtered.forEach((r) => {
      const c = r.cuisine || "Other";
      if (!groups[c]) groups[c] = [];
      groups[c].push(r);
    });
    return Object.keys(groups).sort().map((c) => ({ cuisine: c, recipes: groups[c] }));
  }, [sort, filtered]);

  useEffectV(() => {
    if (!filtered.find((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]?.id || null);
    }
  }, [filtered, selectedId]);

  const selected = recipes.find((r) => r.id === selectedId);

  const renderRecipeRow = (r) => {
    const badge = getRecipeBadge(r);
    return (
      <div
        key={r.id}
        className={`recipe-row${r.id === selectedId ? " active" : ""}${favorites.has(r.id) ? " starred" : ""}`}
        onClick={() => handleSelectRecipe(r.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectRecipe(r.id); }}
      >
        <div className="r-row-top">
          <div className="r-name">{r.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {badge && <span className={`recipe-badge ${badge}`}>{BADGE_LABELS[badge]}</span>}
            <button
              className={`star-btn${favorites.has(r.id) ? " on" : ""}`}
              onClick={(e) => toggleFavorite(r.id, e)}
              title={favorites.has(r.id) ? "Remove from favorites" : "Add to favorites"}
              tabIndex={-1}
            >★</button>
          </div>
        </div>
        <div className="r-meta">{r.cuisine || "—"} · {r.time}m · serves {r.serves}</div>
      </div>
    );
  };

  const starredItems = filtered.filter((r) => favorites.has(r.id));
  const regularItems = filtered.filter((r) => !favorites.has(r.id));
  const isEmpty = filtered.length === 0;

  return (
    <div className="recipes-view" data-screen-label="03 Recipes">
      <div className="chrome">
        <div className="right" style={{ marginLeft: "auto" }}>
          <ManageMenu items={openManage("recipe")} />
        </div>
      </div>

      <div className="recipes-head">
        <div>
          <h1 className="title">The <span className="it">Recipes</span></h1>
          <div className="sub">Methods, marginalia, and the occasional shouting match</div>
        </div>
        <div className="count">
          <strong>{recipes.length}</strong>
          recipes on file
        </div>
      </div>

      <div className={`recipes-body${!sidebarOpen ? " sidebar-closed" : ""}`}>
        <div className="recipes-sidebar">
          <div className="search-bar-row">
            <div className="search-field">
              <span className="icon" />
              <input
                placeholder="Search Keyword"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="sort-wrap" ref={sortWrapRef}>
              <button
                className={`sort-btn${sort ? " active" : ""}`}
                onClick={() => setSortOpen((v) => !v)}
                title="Sort recipes"
              >
                {sort ? SORT_BTN_LABELS[sort] : "Sort"}
                <span className="sort-chev" />
              </button>
              {sortOpen && (
                <div className="sort-menu">
                  <button className={!sort ? "active" : ""} onClick={() => { setSort(null); setSortOpen(false); }}>Default</button>
                  {["az", "za", "time", "serves", "cuisine"].map((s) => (
                    <button key={s} className={sort === s ? "active" : ""} onClick={() => { setSort(s); setSortOpen(false); }}>
                      {SORT_MENU_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="recipe-list">
            {isEmpty && (
              <div style={{ padding: "40px 8px", textAlign: "center" }} className="muted">
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, marginBottom: 4 }}>Nothing matches.</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase" }}>Try another word</div>
              </div>
            )}

            {!isEmpty && sort === "cuisine" ? (
              cuisineGroups && cuisineGroups.map(({ cuisine, recipes: cRecipes }) => (
                <div key={cuisine} className="cuisine-section">
                  <button
                    className={`cuisine-header${openCuisines.has(cuisine) ? " expanded" : ""}`}
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    <span className="cuisine-label">{cuisine}</span>
                    <span className="cuisine-count">{cRecipes.length}</span>
                    <span className="cuisine-chev" />
                  </button>
                  {openCuisines.has(cuisine) && cRecipes.map(renderRecipeRow)}
                </div>
              ))
            ) : (
              !isEmpty && (
                <>
                  {starredItems.length > 0 && (
                    <>
                      <div className="recipe-section-label">Favorites</div>
                      {starredItems.map(renderRecipeRow)}
                      {regularItems.length > 0 && <div className="recipe-list-divider" />}
                    </>
                  )}
                  {regularItems.map(renderRecipeRow)}
                </>
              )
            )}
          </div>
        </div>

        <div className="recipe-detail">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>← Recipes</button>
          {!selected ? (
            <div className="empty">
              <div className="glyph">Ⓡ</div>
              <div className="ln1">No recipe selected.</div>
              <div className="ln2">Add one via Manage → New</div>
            </div>
          ) : (
            <>
              <div className="r-eyebrow">{selected.cuisine || "Recipe"} · Filed {selected.createdAt}</div>
              <h1>{selected.name}</h1>
              <p className="r-tagline">{selected.tagline}</p>
              <div className="r-stats">
                <div className="stat">
                  <div className="k">Time</div>
                  <div className="v">{selected.time} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>min</span></div>
                </div>
                <div className="stat">
                  <div className="k">Serves</div>
                  <div className="v">{selected.serves}</div>
                </div>
                <div className="stat">
                  <div className="k">Category</div>
                  <div className="v">{selected.cuisine || "—"}</div>
                </div>
              </div>
              <div className="recipe-body" dangerouslySetInnerHTML={{ __html: selected.description || "" }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FULL RESTAURANT PROFILE PAGE
   ============================================================ */

function ProfileMiniMap({ lat, lng }) {
  const containerRef = useRefV(null);
  const mapRef = useRefV(null);

  useEffectV(() => {
    if (!containerRef.current || mapRef.current) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    }).setView([lat, lng], 15);

    L.tileLayer(tileUrl, { maxZoom: 19, subdomains: "abcd" }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: '<div class="sd-marker"><div class="pulse"></div><div class="dot"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([lat, lng], { icon }).addTo(map);

    setTimeout(() => map.invalidateSize(), 80);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  return <div ref={containerRef} className="profile-minimap" />;
}

function RestaurantProfile({ restaurant, onClose, isAdmin }) {
  const [pocOpen, setPocOpen] = useStateV(false);
  const btnRef  = useRefV(null);
  const wrapRef = useRefV(null);
  const natWRef = useRefV(null);

  useEffectV(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffectV(() => {
    if (btnRef.current) natWRef.current = btnRef.current.offsetWidth;
  }, []);

  const togglePoc = () => {
    const btn = btnRef.current;
    if (!btn) return;
    if (!pocOpen) {
      const natW = natWRef.current || btn.offsetWidth;
      const fullW = wrapRef.current ? wrapRef.current.offsetWidth : 360;
      btn.style.transition = "none";
      btn.style.width = natW + "px";
      void btn.offsetWidth; // flush layout so transition has a start value
      btn.style.transition = "";
      btn.style.width = fullW + "px";
      setPocOpen(true);
    } else {
      btn.style.width = (natWRef.current || 80) + "px";
      setPocOpen(false);
    }
  };

  const contacts = restaurant.contacts || [];

  return (
    <div className="profile" role="dialog">
      <button className="profile-close" onClick={onClose}>← Close</button>

      <div className="profile-head">
        <div className="profile-eyebrow">Restaurant · {restaurant.cuisine}</div>
        <h1>{restaurant.name}</h1>
        <div className="tagline">{restaurant.address}</div>
      </div>

      <div className="profile-meta">
        <div className="cell">
          <div className="k">Rating</div>
          <div className="v" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {restaurant.rating.toFixed(1)}
            <StarsRead value={restaurant.rating} size={16} />
          </div>
        </div>
        <div className="cell">
          <div className="k">Cuisine</div>
          <div className="v">{restaurant.cuisine}</div>
        </div>
        <div className="cell">
          <div className="k">Coordinates</div>
          <div className="v" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
            {restaurant.lat.toFixed(4)}, {restaurant.lng.toFixed(4)}
          </div>
        </div>
        <div className="cell">
          <div className="k">Filed</div>
          <div className="v" style={{ fontFamily: "var(--mono)", fontSize: 14 }}>{restaurant.createdAt}</div>
        </div>
      </div>

      <ProfileMiniMap lat={restaurant.lat} lng={restaurant.lng} />

      <div className="profile-body" dangerouslySetInnerHTML={{ __html: restaurant.description || "<p><em>No review yet.</em></p>" }} />

      {isAdmin && (
        <div className="profile-contacts" ref={wrapRef}>
          <button
            ref={btnRef}
            className={`poc-btn${pocOpen ? " poc-open" : ""}`}
            onClick={togglePoc}
          >
            POCs
          </button>
          {pocOpen && (
            <div className="contacts-list">
              {contacts.length === 0
                ? <div className="contacts-list-empty">No contacts on file</div>
                : contacts.map((c, i) => (
                    <div
                      key={i}
                      className="contact-row"
                      style={{ animationDelay: `${400 + i * 80}ms` }}
                    >
                      <span className="contact-title">{c.title}</span>
                      <span className="contact-name">{c.name}</span>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AboutView, MapView, RecipesView, RestaurantProfile });

})();
