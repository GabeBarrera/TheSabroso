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

      <button className="edge-arrow left" onClick={goLeft} aria-label="Open the map">
        <div className="inner">
          <span className="glyph-label">← Swipe</span>
          <span className="glyph">←</span>
          <span className="glyph-name">Map</span>
        </div>
      </button>

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
          <span className="drop">G</span><span className="drop-lead">ood</span> food is everywhere — and yet I still can't decide where to go or what to cook&nbsp;because I have no idea where I saved my restaurant list or recipe collection are in my notes. So here we go: this is a no filler, no sponsored seafood towers, no &ldquo;hidden gems&rdquo; that have been on the cover of <em>Eater</em> for two years. The map is the city; the recipes are the homework. Pin a place, log a verdict, write the method down before you forget it. Bon appétit, and welcome to the Sabroso.
        </p>

        <div className="about-mobile-nav">
          <button className="nav-btn" onClick={goLeft}>← Map</button>
          <button className="nav-btn" onClick={goRight}>Recipes →</button>
        </div>
      </div>

      <button className="edge-arrow right" onClick={goRight} aria-label="Open the recipes">
        <div className="inner">
          <span className="glyph-label">Swipe →</span>
          <span className="glyph">→</span>
          <span className="glyph-name">Recipes</span>
        </div>
      </button>

      <div className="about-meta">
        <span>Edited by <a href="https://www.gabebarrera.dev" target="_blank" rel="noopener noreferrer">Gabe</a> · Chef &amp; Cyber Nerd</span>
        <span className="coords">⌂ Local-first · saved to your device</span>
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

function MapView({ restaurants, setRestaurants, openProfile, openManage, navigate, theme, hiddenFilters, mapActionsRef }) {
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
        <div className="title">The Map · <span className="it">San Diego</span></div>
      </div>

      <div className="map-mobile-bar">
        <button className="nav-btn" onClick={() => navigate(1)}>About</button>
        <button className="nav-btn" onClick={() => navigate(2)}>Recipes</button>
        <div style={{ marginLeft: "auto" }}>
          <ManageMenu items={openManage("restaurant")} />
        </div>
      </div>

      <div className="chrome">
        <div className="left" />
        <div className="right">
          <button className="nav-btn" onClick={() => navigate(1)}>About</button>
          <button className="nav-btn" onClick={() => navigate(2)}>Recipes</button>
          <div style={{ marginLeft: 6 }}>
            <ManageMenu items={openManage("restaurant")} />
          </div>
        </div>
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

function RecipesView({ recipes, openManage, navigate }) {
  const [q, setQ] = useStateV("");
  const [selectedId, setSelectedId] = useStateV(recipes[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useStateV(true);

  const handleSelectRecipe = (id) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  const filtered = useMemoV(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recipes;
    return recipes.filter((r) => {
      const fields = [r.name, r.cuisine, r.tagline, r.description].filter(Boolean).join(" ").toLowerCase();
      return fields.includes(s);
    });
  }, [q, recipes]);

  useEffectV(() => {
    if (!filtered.find((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]?.id || null);
    }
  }, [filtered, selectedId]);

  const selected = recipes.find((r) => r.id === selectedId);

  return (
    <div className="recipes-view" data-screen-label="03 Recipes">
      <div className="chrome">
        <div className="left">
          <button className="nav-btn" onClick={() => navigate(0)}>The Map</button>
          <button className="nav-btn" onClick={() => navigate(1)}>About</button>
        </div>
        <div className="right">
          <div style={{ marginLeft: 6 }}>
            <ManageMenu items={openManage("recipe")} />
          </div>
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
          <div className="search-field">
            <span className="icon" />
            <input
              placeholder="Search recipes, keywords…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="recipe-list">
            {filtered.length === 0 && (
              <div style={{ padding: "40px 8px", textAlign: "center" }} className="muted">
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, marginBottom: 4 }}>Nothing matches.</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase" }}>Try another word</div>
              </div>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                className={`recipe-row ${r.id === selectedId ? "active" : ""}`}
                onClick={() => handleSelectRecipe(r.id)}
              >
                <div className="r-name">{r.name}</div>
                <div className="r-meta">{r.cuisine || "—"} · {r.time}m · serves {r.serves}</div>
              </button>
            ))}
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

function RestaurantProfile({ restaurant, onClose }) {
  useEffectV(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

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

      <div className="profile-body" dangerouslySetInnerHTML={{ __html: restaurant.description || "<p><em>No review yet.</em></p>" }} />
    </div>
  );
}

Object.assign(window, { AboutView, MapView, RecipesView, RestaurantProfile });

})();
