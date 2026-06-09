(function () {
/* global React, L, StarsRead, ManageMenu, useToast, SDStore */
const { useState: useStateV, useEffect: useEffectV, useRef: useRefV, useMemo: useMemoV } = React;

function CopyLinkBtn({ url, className }) {
  const [copied, setCopied] = useStateV(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  return (
    <button
      className={`copy-link-btn${copied ? " copied" : ""}${className ? " " + className : ""}`}
      onClick={copy}
      title="Copy link"
    >
      {copied ? "Copied!" : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      )}
    </button>
  );
}

/* ============================================================
   ABOUT VIEW — the masthead, intro, and side arrows
   ============================================================ */

function AboutView({ goLeft, goRight, isPWA }) {
  return (
    <div className="about" data-screen-label="01 About">
      <div className="chrome">
        <div className="left">
          <span className="vol">v1.0.0</span>
          <span>Established · MMXXVI</span>
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
          Your San Diego+ Food <em>Digest</em> <span className="emo">:D</span>
        </div>
        <div className="rule-bot" />

        <div className="about-byline">
          <span>A Passion Project</span>
          <span className="dot" />
          <span>Stomach → Nom Noms</span>
          <span className="dot" />
          <span>SD Born & Raised</span>
        </div>

        <p className="about-intro">
          <span className="drop">G</span><span className="drop-lead">ood</span> food is everywhere — and yet I still can't decide where to go or what to cook&nbsp;because I have no idea where I saved my restaurant list or recipe collection are in my notes. So here we go: this is a no filler, no sponsored seafood towers, no &ldquo;hidden gems&rdquo; that have been on the cover of <em>Eater</em> for two years. The map is the classroom; the recipes are the homework. Pin a place, log a verdict, write the method down before you forget it. <br></br><br></br>Welcome to the place where<br></br>you either find delicious food or make it.<br></br><br></br><i>Buen provecho, bon appétit, and just eat gud y'all!</i><br></br><b>~ G</b>
        </p>
        {!isPWA && <a href="recipe.html" className="about-demo-btn">Download RECIPE Demo</a>}
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

function wxInfo(code) {
  if (code === 0)             return { label: "Clear",         icon: "sunny" };
  if (code <= 2)              return { label: "Partly Cloudy", icon: "partly" };
  if (code === 3)             return { label: "Overcast",      icon: "cloudy" };
  if (code <= 48)             return { label: "Foggy",         icon: "foggy"  };
  if (code <= 67)             return { label: "Rain",          icon: "rainy"  };
  if (code <= 77)             return { label: "Snow",          icon: "snowy"  };
  if (code <= 82)             return { label: "Showers",       icon: "rainy"  };
  return                             { label: "Stormy",        icon: "stormy" };
}

function WxIcon({ icon }) {
  const s = { width: 28, height: 28, display: "block", flexShrink: 0 };
  const stroke = "currentColor";
  const sw = "1.6";
  if (icon === "sunny") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
  if (icon === "partly") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <circle cx="10" cy="9" r="3"/>
      <path d="M10 2v1.5M4.22 4.22l1.06 1.06M2 10h1.5M4.22 15.78l1.06-1.06"/>
      <path d="M8 15.5a5 5 0 1 1 9.9-1 3.5 3.5 0 0 1-.4 7H8a3 3 0 0 1 0-6z"/>
    </svg>
  );
  if (icon === "cloudy") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <path d="M6 19a5 5 0 1 1 9.9-1 3.5 3.5 0 0 1-.4 7H6a4 4 0 0 1 0-8z"/>
    </svg>
  );
  if (icon === "foggy") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <path d="M5 8a5 5 0 0 1 9.9-1 3.5 3.5 0 0 1 .1 7H5"/>
      <line x1="3" y1="18" x2="21" y2="18"/><line x1="5" y1="21" x2="19" y2="21"/>
    </svg>
  );
  if (icon === "rainy") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <path d="M6 16a5 5 0 1 1 9.9-1 3.5 3.5 0 0 1-.4 7H6a4 4 0 0 1 0-8z"/>
      <line x1="8" y1="22" x2="6" y2="26"/><line x1="12" y1="22" x2="10" y2="26"/><line x1="16" y1="22" x2="14" y2="26"/>
    </svg>
  );
  if (icon === "snowy") return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <path d="M6 15a5 5 0 1 1 9.9-1 3.5 3.5 0 0 1-.4 6H6a3.5 3.5 0 0 1 0-7z"/>
      <circle cx="8" cy="22" r="1" fill={stroke}/><circle cx="12" cy="24" r="1" fill={stroke}/><circle cx="16" cy="22" r="1" fill={stroke}/>
    </svg>
  );
  // stormy
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" style={s}>
      <path d="M6 16a5 5 0 1 1 9.9-1 3.5 3.5 0 0 1-.4 7H6a4 4 0 0 1 0-8z"/>
      <polyline points="13 18 11 22 14 22 12 26"/>
    </svg>
  );
}

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

// Session-scoped location decision — persists across component remounts, resets on page reload.
// null = undecided, 'granted' = user said yes, 'denied' = user said no this session
let _locDecision = null;

function MapView({ restaurants, setRestaurants, openProfile, openManage, navigate, theme, hiddenFilters, mapActionsRef,
                   cmdText, setCmdText, onCmdSubmit, chatActive, setChatActive, widgetsVisible,
                   notes, openNoteProfile, onPinDrop }) {
  const mapDiv = useRefV(null);
  const mapInstance = useRefV(null);
  const tileLayerRef = useRefV(null);
  const markersRef = useRefV([]);
  const noteMarkersRef = useRefV([]);
  const userMarkerRef = useRefV(null);
  const cityTimerRef = useRefV(null);
  const [cityName, setCityName] = useStateV("San Diego");
  const [weather, setWeather] = useStateV(null);
  const [showLocPrompt, setShowLocPrompt] = useStateV(false);
  const geoCallbackRef = useRefV(null);
  const toast = useToast();
  // Always-current refs so delegated handlers don't go stale
  const restaurantsRef = useRefV(restaurants);
  const openProfileRef = useRefV(openProfile);
  const notesRef = useRefV(notes || []);
  const openNoteProfileRef = useRefV(openNoteProfile);
  const onPinDropRef = useRefV(onPinDrop);
  useEffectV(() => { restaurantsRef.current = restaurants; }, [restaurants]);
  useEffectV(() => { openProfileRef.current = openProfile; }, [openProfile]);
  useEffectV(() => { notesRef.current = notes || []; }, [notes]);
  useEffectV(() => { openNoteProfileRef.current = openNoteProfile; }, [openNoteProfile]);
  useEffectV(() => { onPinDropRef.current = onPinDrop; }, [onPinDrop]);

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

    // Delegated handler for popup action buttons (runs in capture to beat Leaflet's close-on-click).
    map.getPanes().popupPane.addEventListener('click', (e) => {
      const btn = e.target.closest('.pop-select');
      if (!btn) return;
      e.stopPropagation();
      if (btn.dataset.noteId) {
        const note = notesRef.current.find((n) => n.id === btn.dataset.noteId);
        if (note) { map.closePopup(); openNoteProfileRef.current?.(note); }
        return;
      }
      const id = btn.dataset.id;
      const r = restaurantsRef.current.find((x) => x.id === id);
      if (r) { map.closePopup(); openProfileRef.current(r); }
    }, true);

    // Long-press to drop a pin (desktop mouse + touch)
    const container = mapDiv.current;
    let lpTimer = null;
    let lpLatLng = null;
    let lpMoved = false;

    map.on("mousedown", (e) => {
      if (e.originalEvent.button !== 0) return;
      lpMoved = false;
      lpLatLng = e.latlng;
      lpTimer = setTimeout(() => {
        if (!lpMoved && lpLatLng) onPinDropRef.current?.({ lat: lpLatLng.lat, lng: lpLatLng.lng });
      }, 600);
    });
    map.on("mousemove", () => { lpMoved = true; clearTimeout(lpTimer); lpTimer = null; });
    map.on("mouseup",   () => { clearTimeout(lpTimer); lpTimer = null; });
    map.on("dragstart", () => { clearTimeout(lpTimer); lpTimer = null; });

    const onTouchStart = (e) => {
      lpMoved = false;
      const t = e.touches[0];
      const rect = container.getBoundingClientRect();
      lpLatLng = map.containerPointToLatLng(L.point(t.clientX - rect.left, t.clientY - rect.top));
      lpTimer = setTimeout(() => {
        if (!lpMoved && lpLatLng) onPinDropRef.current?.({ lat: lpLatLng.lat, lng: lpLatLng.lng });
      }, 600);
    };
    const onTouchMove = () => { lpMoved = true; clearTimeout(lpTimer); lpTimer = null; };
    const onTouchEnd  = () => { clearTimeout(lpTimer); lpTimer = null; };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove",  onTouchMove,  { passive: true });
    container.addEventListener("touchend",   onTouchEnd,   { passive: true });

    // reverse-geocode center + fetch weather on move
    const fetchCity = () => {
      clearTimeout(cityTimerRef.current);
      cityTimerRef.current = setTimeout(async () => {
        const { lat, lng } = map.getCenter();
        try {
          const [geoRes, wxRes] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } }),
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&forecast_days=1`),
          ]);
          const [geoData, wxData] = await Promise.all([geoRes.json(), wxRes.json()]);
          const a = geoData.address || {};
          setCityName(a.city || a.town || a.suburb || a.village || a.county || "San Diego");
          if (wxData.current) setWeather({ temp: Math.round(wxData.current.temperature_2m), code: wxData.current.weather_code });
        } catch {}
      }, 600);
    };
    map.on("moveend", fetchCity);
    fetchCity();

    // location helpers — stored in ref so prompt handlers can call them after effect exits
    const placeUserMarker = (pos) => {
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
    };

    const placeDefaultMarker = () => {
      const icon = L.divIcon({
        className: "",
        html: '<div class="sd-marker user-marker"><div class="pulse"></div><div class="dot"></div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker([32.7157, -117.1611], { icon }).addTo(map);
      m.bindPopup('<div class="pin-pop"><div class="pop-cuisine">Approximate location</div><div class="pop-name">Downtown San Diego</div><div class="pop-addr" style="margin-top:6px">Location services unavailable</div></div>');
      userMarkerRef.current = m;
    };

    const tryGeoloc = () => {
      if (!navigator.geolocation) { placeDefaultMarker(); return; }
      navigator.geolocation.getCurrentPosition(placeUserMarker, placeDefaultMarker, { timeout: 6000 });
    };

    geoCallbackRef.current = { allow: tryGeoloc, deny: placeDefaultMarker };

    if (_locDecision === 'granted') {
      tryGeoloc();
    } else if (_locDecision === 'denied') {
      placeDefaultMarker();
    } else {
      // check if browser has already made a permission decision
      (async () => {
        try {
          if (navigator.permissions) {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            if (result.state === 'granted') { _locDecision = 'granted'; tryGeoloc(); return; }
            if (result.state === 'denied')  { _locDecision = 'denied'; placeDefaultMarker(); return; }
          }
        } catch {}
        // state is 'prompt' (or permissions API unavailable) — show our in-theme dialog
        setShowLocPrompt(true);
      })();
    }

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove",  onTouchMove);
      container.removeEventListener("touchend",   onTouchEnd);
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

    // Jitter co-located markers so overlapping pins are visually separate.
    // Groups by coordinate rounded to 4 decimal places (~11m), then spreads
    // each group in a small circle. Original r.lat/r.lng are preserved for
    // popup content (directions link, profile minimap).
    const JITTER_R = 0.00022;
    const coordGroups = {};
    restaurants.forEach((r) => {
      if (isFilterHidden(r, hiddenFilters)) return;
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (!coordGroups[key]) coordGroups[key] = [];
      coordGroups[key].push(r.id);
    });
    const jitterPos = {};
    Object.values(coordGroups).forEach((ids) => {
      if (ids.length === 1) {
        const r = restaurants.find((x) => x.id === ids[0]);
        jitterPos[ids[0]] = { lat: r.lat, lng: r.lng };
      } else {
        ids.forEach((id, i) => {
          const r = restaurants.find((x) => x.id === id);
          const angle = (2 * Math.PI * i) / ids.length;
          jitterPos[id] = {
            lat: r.lat + JITTER_R * Math.sin(angle),
            lng: r.lng + JITTER_R * Math.cos(angle),
          };
        });
      }
    });

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
      const pos = jitterPos[r.id] || { lat: r.lat, lng: r.lng };
      const m = L.marker([pos.lat, pos.lng], { icon }).addTo(map);

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
          <div class="pop-actions">
            <a class="pop-dir" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener noreferrer">Directions ↗</a>
            <button class="pop-select" data-id="${r.id}">Open profile →</button>
          </div>
        </div>
      `;
      m.bindPopup(popHtml, { maxWidth: 300 });
      m.on("popupopen", () => {
        const slot = document.getElementById(`stars-${r.id}`);
        if (slot) slot.innerHTML = starsHtml(r.rating || 0);
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

  // render note markers
  useEffectV(() => {
    const map = mapInstance.current;
    if (!map) return;
    noteMarkersRef.current.forEach((m) => map.removeLayer(m));
    noteMarkersRef.current = [];
    (notes || []).forEach((note) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="sd-marker note-pin"><div class="pulse"></div><div class="dot"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
      const popHtml = `
        <div class="pin-pop">
          <div class="pop-head-row">
            <div class="pop-cuisine">${escapeHtml(note.tag || "NOTE")}</div>
          </div>
          <div class="pop-name">${escapeHtml(note.name)}</div>
          ${note.address ? `<div class="pop-addr">${escapeHtml(note.address)}</div>` : ""}
          <div class="pop-actions">
            <button class="pop-select" data-note-id="${note.id}">Open note →</button>
          </div>
        </div>`;
      const m = L.marker([note.lat, note.lng], { icon }).addTo(map);
      m.bindPopup(popHtml, { maxWidth: 300 });
      m.on("mouseover", () => m.openPopup());
      noteMarkersRef.current.push(m);
    });
  }, [notes]);

  const handleLocAllow = () => {
    _locDecision = 'granted';
    setShowLocPrompt(false);
    geoCallbackRef.current?.allow();
  };

  const handleLocDeny = () => {
    _locDecision = 'denied';
    setShowLocPrompt(false);
    geoCallbackRef.current?.deny();
  };

  return (
    <div className="map-view" data-screen-label="02 Map">
      <div className="map-header">
        <div className="map-header-left" />
        <div className="title">The Map<span className="title-city"> · <span className="it">{cityName}</span></span></div>
        <div className="map-header-right">
          <ManageMenu items={openManage("note")} label="Notes" />
          <ManageMenu items={openManage("restaurant")} label="Restaurants" />
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
      <div className="map-city-tag">{cityName}</div>

      {widgetsVisible && (
        <div className="map-stat">
          <div className="k">Logged in the savor</div>
          <div className="v">{restaurants.length}<small>restaurants</small></div>
        </div>
      )}

      {widgetsVisible && weather && (() => { const { label, icon } = wxInfo(weather.code); return (
        <div className="weather-widget">
          <WxIcon icon={icon} />
          <div className="wx-temp">{weather.temp}°<span className="wx-unit">F</span></div>
          <div className="wx-label">{label}</div>
        </div>
      ); })()}

      {showLocPrompt && (
        <div className="loc-prompt" role="dialog" aria-modal="false" aria-label="Location access">
          <div className="loc-prompt-head">
            <div className="loc-prompt-eyebrow">Map · Location</div>
            <div className="loc-prompt-title">Use your location?</div>
          </div>
          <p className="loc-prompt-body">
            Show your current position on the map for easier navigation. Your location is never stored or shared.
          </p>
          <div className="loc-prompt-actions">
            <button className="btn ghost" style={{ fontSize: 10 }} onClick={handleLocDeny}>No thanks</button>
            <button className="btn primary" style={{ fontSize: 10 }} onClick={handleLocAllow}>Allow</button>
          </div>
        </div>
      )}
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
   GROCERY LIST — ingredient panel + add button
   ============================================================ */

function AddToGroceryBtn({ recipe, onAdd }) {
  const [added, setAdded] = useStateV(false);
  const handle = (e) => {
    e.stopPropagation();
    const ings = recipe.ingredients || [];
    if (!ings.length) return;
    const ingData = ings.map(ing => ({
      text: [ing.qty, ing.unit, ing.name].filter(Boolean).join(' '),
      cost: (ing.cost != null && ing.cost !== '') ? parseFloat(String(ing.cost)) : null,
    }));
    onAdd(recipe, ingData);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  return (
    <button
      className={`add-grocery-btn${added ? ' added' : ''}`}
      onClick={handle}
      title="Add ingredients to grocery list"
    >
      {added ? 'Added!' : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      )}
    </button>
  );
}

function parseIngredient(text) {
  const s = text.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.*)/);
  if (mixed) return { qty: parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]), key: mixed[4].toLowerCase() };
  const frac = s.match(/^(\d+)\/(\d+)\s+(.*)/);
  if (frac) return { qty: parseInt(frac[1]) / parseInt(frac[2]), key: frac[3].toLowerCase() };
  const num = s.match(/^(\d+(?:\.\d+)?)\s+(.*)/);
  if (num) return { qty: parseFloat(num[1]), key: num[2].toLowerCase() };
  return { qty: null, key: s.toLowerCase() };
}

function formatQty(n) {
  if (Number.isInteger(n)) return String(n);
  const whole = Math.floor(n);
  const rem = n - whole;
  for (const [val, str] of [[1/4,'1/4'],[1/3,'1/3'],[1/2,'1/2'],[2/3,'2/3'],[3/4,'3/4']]) {
    if (Math.abs(rem - val) < 0.02) return whole > 0 ? `${whole} ${str}` : str;
  }
  return parseFloat(n.toFixed(2)).toString();
}

function scaleQty(qtyStr, factor) {
  if (!qtyStr || factor === 1) return qtyStr;
  const s = String(qtyStr).trim();
  // Range: "4–5" or "4-5"
  const rangeM = s.match(/^(.+?)\s*[–-]\s*(.+)$/);
  if (rangeM) return `${scaleQty(rangeM[1].trim(), factor)}–${scaleQty(rangeM[2].trim(), factor)}`;
  // Mixed fraction: "1 1/2"
  const mixedM = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedM) return formatQty((parseInt(mixedM[1]) + parseInt(mixedM[2]) / parseInt(mixedM[3])) * factor);
  // Simple fraction: "1/2"
  const fracM = s.match(/^(\d+)\/(\d+)$/);
  if (fracM) return formatQty(parseInt(fracM[1]) / parseInt(fracM[2]) * factor);
  // Integer or decimal
  const numM = s.match(/^\d+(?:\.\d+)?$/);
  if (numM) return formatQty(parseFloat(s) * factor);
  return qtyStr;
}

function buildTotals(items) {
  const map = new Map();
  items.forEach(item => {
    const { qty, key } = parseIngredient(item.text);
    if (!map.has(key)) map.set(key, { key, firstText: item.text, totalQty: 0, hasNumeric: false, sources: new Set(), totalCost: 0, hasCost: false });
    const e = map.get(key);
    e.sources.add(item.recipeName || 'Custom');
    if (qty !== null) { e.totalQty += qty; e.hasNumeric = true; }
    if (item.cost != null && !isNaN(item.cost)) { e.totalCost += item.cost; e.hasCost = true; }
  });
  return [...map.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(e => ({
      key: e.key,
      displayText: e.hasNumeric ? `${formatQty(e.totalQty)} ${e.key}` : e.firstText,
      sources: [...e.sources],
      cost: e.hasCost ? e.totalCost : null,
    }));
}

function GroceryListPanel({ items, onClose, onRemoveRecipe, onRemoveItem, onAddCustom, onClearAll }) {
  const [checked, setChecked] = useStateV(() => SDStore.loadGroceryChecked());
  const [customInput, setCustomInput] = useStateV('');
  const [viewMode, setViewMode] = useStateV('by-recipe');

  const groups = [];
  const seen = {};
  items.forEach(item => {
    if (!seen[item.recipeId]) {
      seen[item.recipeId] = { recipeId: item.recipeId, recipeName: item.recipeName, items: [] };
      groups.push(seen[item.recipeId]);
    }
    seen[item.recipeId].items.push({ id: item.id, text: item.text, cost: item.cost });
  });

  const totals = useMemoV(() => buildTotals(items), [items]);

  const totalCost = useMemoV(() => {
    const costItems = items.filter(item => item.cost != null && !isNaN(item.cost));
    if (!costItems.length) return null;
    return costItems.reduce((acc, item) => acc + item.cost, 0);
  }, [items]);

  const toggleItem = (key) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      SDStore.saveGroceryChecked(next);
      return next;
    });
  };

  const submitCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    onAddCustom(t);
    setCustomInput('');
  };

  return (
    <div className="grocery-panel">
      <div className="grocery-panel-head">
        <div>
          <div className="grocery-panel-eyebrow">Shopping</div>
          <div className="grocery-panel-title">Grocery List</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {items.length > 0 && (
            <button className="grocery-clear-btn" onClick={onClearAll}>Clear all</button>
          )}
          <button className="grocery-panel-close" onClick={onClose}>×</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grocery-view-bar">
          <button
            className={`grocery-view-tab${viewMode === 'by-recipe' ? ' active' : ''}`}
            onClick={() => setViewMode('by-recipe')}
          >Per Recipe</button>
          <button
            className={`grocery-view-tab${viewMode === 'total' ? ' active' : ''}`}
            onClick={() => setViewMode('total')}
          >Totals</button>
        </div>
      )}

      <div className="grocery-panel-body">
        {items.length === 0 ? (
          <div className="grocery-empty">
            <div className="grocery-empty-line1">No ingredients yet.</div>
            <div className="grocery-empty-line2">Add from a recipe or type below</div>
          </div>
        ) : viewMode === 'total' ? (
          totals.map(({ key, displayText, sources, cost }) => {
            const checkKey = `total-${key}`;
            const isChecked = checked.has(checkKey);
            return (
              <div
                key={key}
                className={`grocery-item${isChecked ? ' grocery-item--checked' : ''}`}
                onClick={() => toggleItem(checkKey)}
              >
                <span className="grocery-item-bullet">—</span>
                <div className="grocery-item-body">
                  <span className="grocery-item-text">{displayText}</span>
                  {sources.length > 1 && (
                    <span className="grocery-item-sources">{sources.join(', ')}</span>
                  )}
                </div>
                {cost != null && (
                  <span className="grocery-item-cost">${cost.toFixed(2)}</span>
                )}
              </div>
            );
          })
        ) : (
          groups.map(group => (
            <div key={group.recipeId} className="grocery-group">
              <div className="grocery-group-head">
                <span className="grocery-group-name">{group.recipeName}</span>
                {group.recipeId !== '__custom__' && (
                  <button className="grocery-group-remove" onClick={() => onRemoveRecipe(group.recipeId)}>Remove</button>
                )}
              </div>
              {group.items.map(({ id, text, cost }, i) => {
                const key = `${group.recipeId}-${i}`;
                const isChecked = checked.has(key);
                return (
                  <div key={i} className={`grocery-item${isChecked ? ' grocery-item--checked' : ''}`} onClick={() => toggleItem(key)}>
                    <span className="grocery-item-bullet">—</span>
                    <span className="grocery-item-text">{text}</span>
                    {cost != null && !isNaN(cost) && (
                      <span className="grocery-item-cost">${cost.toFixed(2)}</span>
                    )}
                    {group.recipeId === '__custom__' && (
                      <button className="grocery-item-remove" onClick={(e) => { e.stopPropagation(); onRemoveItem(id); }}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      {totalCost !== null && (
        <div className="grocery-total-cost-row">
          <span className="grocery-total-cost-label">Total Cost</span>
          <span className="grocery-total-cost-value">${totalCost.toFixed(2)}</span>
        </div>
      )}
      <div className="grocery-add-row">
        <input
          className="grocery-add-input"
          type="text"
          placeholder="Add an ingredient…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
        />
        <button className="grocery-add-btn" onClick={submitCustom}>Add</button>
      </div>
    </div>
  );
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

function scaleHtml(html, factor) {
  if (factor === 1) return html;
  // Order matters: try mixed fraction ("1 1/2"), then simple fraction ("1/2"), then decimal/integer
  return html.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, text) => {
    if (tag) return tag;
    return text.replace(/\b(\d+)\s+(\d+)\/(\d+)\b|\b(\d+)\/(\d+)\b|\b(\d+(?:\.\d+)?)\b/g,
      (match, wn, wfn, wfd, fn, fd, plain) => {
        let val;
        if (wn  !== undefined) val = parseInt(wn)  + parseInt(wfn) / parseInt(wfd);
        else if (fn !== undefined) val = parseInt(fn) / parseInt(fd);
        else val = parseFloat(plain);
        const scaled = val * factor;
        return Number.isInteger(scaled) ? scaled.toString() : parseFloat(scaled.toFixed(2)).toString();
      }
    );
  });
}

function RecipesView({ recipes, openManage, navigate, focusRecipeId, onAddToGrocery, onEditRecipe, isAdmin, isPWA, onResync }) {
  const [q, setQ] = useStateV("");
  const [selectedId, setSelectedId] = useStateV(recipes[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useStateV(true);
  const [sort, setSort] = useStateV("az");
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

  useEffectV(() => {
    if (!focusRecipeId) return;
    const exists = recipes.some((r) => r.id === focusRecipeId);
    if (exists) { setSelectedId(focusRecipeId); setSidebarOpen(false); }
  }, [focusRecipeId]);

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

  const [struckSteps, setStruckSteps] = useStateV(new Set());
  const [struckIngredients, setStruckIngredients] = useStateV(new Set());
  const [scale, setScale] = useStateV(1);
  const bodyRef = useRefV(null);

  const toggleStruckIngredient = (i) => setStruckIngredients(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  useEffectV(() => { setStruckSteps(new Set()); setStruckIngredients(new Set()); setScale(1); }, [selectedId]);

  useEffectV(() => {
    if (!bodyRef.current) return;
    bodyRef.current.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("step-struck", struckSteps.has(i));
    });
  }, [struckSteps, selectedId]);

  const handleBodyClick = (e) => {
    const li = e.target.closest("li");
    if (!li || !bodyRef.current) return;
    const idx = [...bodyRef.current.querySelectorAll("li")].indexOf(li);
    if (idx === -1) return;
    setStruckSteps((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSelectRecipe = (id) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  const SORT_BTN_LABELS = { az: "A–Z", za: "Z–A", time: "Time", serves: "Serves", cuisine: "Cuisine", badge: "Type" };
  const SORT_MENU_LABELS = { az: "Sort A → Z", za: "Sort Z → A", time: "By Time", serves: "By Serving Size", cuisine: "By Cuisine", badge: "By Type" };

  const filtered = useMemoV(() => {
    const s = q.trim().toLowerCase();
    let list = s
      ? recipes
          .filter((r) => {
            const fields = [r.name, r.cuisine, r.tagline, r.description].filter(Boolean).join(" ").toLowerCase();
            return fields.includes(s);
          })
          .sort((a, b) => {
            const aName = (a.name || "").toLowerCase().includes(s);
            const bName = (b.name || "").toLowerCase().includes(s);
            return (bName ? 1 : 0) - (aName ? 1 : 0);
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

  const BADGE_ORDER = ["meat", "seafood", "veg", "baked", "dessert"];
  const badgeGroups = useMemoV(() => {
    if (sort !== "badge") return null;
    const groups = {};
    filtered.forEach((r) => {
      const b = getRecipeBadge(r) || "other";
      if (!groups[b]) groups[b] = [];
      groups[b].push(r);
    });
    const order = [...BADGE_ORDER.filter((b) => groups[b]), ...(groups.other ? ["other"] : [])];
    return order.map((b) => ({ badge: b, label: b === "other" ? "Other" : BADGE_LABELS[b], recipes: groups[b] }));
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
      <div className="recipes-head">
        <div>
          <h1 className="title">The <span className="it">Recipes</span></h1>
          <div className="sub">Methods, marginalia, and the occasional shouting match</div>
        </div>
        <div className="count">
          <strong>{recipes.length}</strong>
          recipes on file
        </div>
        {isAdmin ? (
          <ManageMenu items={openManage("recipe")} />
        ) : isPWA ? (
          <button className="manage-btn" onClick={onResync}>Resync</button>
        ) : null}
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
                  {["az", "za", "time", "serves", "cuisine", "badge"].map((s) => (
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
            ) : !isEmpty && sort === "badge" ? (
              badgeGroups && badgeGroups.map(({ badge, label, recipes: bRecipes }) => (
                <div key={badge} className="cuisine-section">
                  <button
                    className={`cuisine-header${openCuisines.has(badge) ? " expanded" : ""}`}
                    onClick={() => toggleCuisine(badge)}
                  >
                    <span className="cuisine-label">{label}</span>
                    <span className="cuisine-count">{bRecipes.length}</span>
                    <span className="cuisine-chev" />
                  </button>
                  {openCuisines.has(badge) && bRecipes.map(renderRecipeRow)}
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
              <div className="r-eyebrow-row">
                <div className="r-eyebrow">{selected.cuisine || "Recipe"} · {selected.modifiedAt ? `Updated ${selected.modifiedAt}` : `Filed ${selected.createdAt}`}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onAddToGrocery && (
                    <AddToGroceryBtn recipe={selected} onAdd={onAddToGrocery} />
                  )}
                  <CopyLinkBtn url={`${location.origin}${location.pathname}#recipes/${selected.id}`} />
                  {onEditRecipe && (
                    <button className="recipe-edit-btn" onClick={() => onEditRecipe(selected)} title="Edit recipe">Edit</button>
                  )}
                </div>
              </div>
              <h1>{selected.name}</h1>
              <p className="r-tagline">{selected.tagline}</p>
              <div className="r-stats">
                <div className="stat">
                  <div className="k">Time</div>
                  <div className="v">{selected.time} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>min</span></div>
                </div>
                <div className="stat">
                  <div className="k">Serves</div>
                  <div className="v">{selected.serves ? selected.serves * scale : "—"}</div>
                </div>
                <div className="stat">
                  <div className="k">Category</div>
                  <div className="v">{selected.cuisine || "—"}</div>
                </div>
              </div>
              <div className="r-scaler">
                <span className="r-scaler-label">Scale</span>
                {[1, 2, 3].map((n) => (
                  <button key={n} className={`scaler-btn${scale === n ? " active" : ""}`} onClick={() => setScale(n)}>×{n}</button>
                ))}
              </div>
              {selected.ingredients && selected.ingredients.length > 0 && (
                <div className="recipe-ingredients">
                  <div className="r-ing-label">Ingredients</div>
                  <div className="ingredient-list">
                    {selected.ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className={`ingredient-item${struckIngredients.has(i) ? " struck" : ""}${ing.notes ? " has-notes" : ""}${ing.cost ? " has-cost" : ""}`}
                        onClick={() => toggleStruckIngredient(i)}
                        title="Click to cross out"
                      >
                        <span className="ing-meta">
                          <span className="ing-qty">{scaleQty(ing.qty, scale)}</span>
                          <span className="ing-unit">{ing.unit}</span>
                        </span>
                        <span className="ing-name">{ing.name}</span>
                        <span className="ing-bottom">
                          <span className="ing-notes">{ing.notes || ''}</span>
                          <span className="ing-cost">{ing.cost !== '' && ing.cost != null ? `$${parseFloat(String(ing.cost)).toFixed(2)}` : ''}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="recipe-body" ref={bodyRef} onClick={handleBodyClick} dangerouslySetInnerHTML={{ __html: scaleHtml(selected.description || "", scale) }} />
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
  useEffectV(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const contacts = SDStore.getRestaurantContacts(restaurant.id);

  return (
    <div className="profile" role="dialog">
      <button className="profile-close" onClick={onClose}>← Close</button>
      <CopyLinkBtn url={`${location.origin}${location.pathname}#map/${restaurant.id}`} className="profile-share" />

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

      {(restaurant.website || restaurant.reservationLink) && (
        <div className="profile-links">
          {restaurant.website && (
            <a className="profile-link" href={restaurant.website} target="_blank" rel="noopener noreferrer">Website ↗</a>
          )}
          {restaurant.reservationLink && (
            <a className="profile-link profile-link-reserve" href={restaurant.reservationLink} target="_blank" rel="noopener noreferrer">Reserve a Table ↗</a>
          )}
        </div>
      )}

      <div className="profile-body" dangerouslySetInnerHTML={{ __html: restaurant.description || "<p><em>No review yet.</em></p>" }} />

      {isAdmin && (
        <div className="profile-contacts">
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
        </div>
      )}
    </div>
  );
}

function NoteProfile({ note, onClose, onEdit, onDelete }) {
  useEffectV(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="profile" role="dialog">
      <button className="profile-close" onClick={onClose}>← Close</button>

      <div className="profile-head">
        <div className="profile-eyebrow">Note · {note.tag || "Note"}</div>
        <h1>{note.name}</h1>
        {note.address && <div className="tagline">{note.address}</div>}
      </div>

      <div className="profile-meta" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cell">
          <div className="k">Tag</div>
          <div className="v">{note.tag || "—"}</div>
        </div>
        <div className="cell">
          <div className="k">Coordinates</div>
          <div className="v" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
            {note.lat.toFixed(4)}, {note.lng.toFixed(4)}
          </div>
        </div>
        <div className="cell">
          <div className="k">Filed</div>
          <div className="v" style={{ fontFamily: "var(--mono)", fontSize: 14 }}>{note.createdAt}</div>
        </div>
      </div>

      <ProfileMiniMap lat={note.lat} lng={note.lng} />

      <div className="profile-body" dangerouslySetInnerHTML={{ __html: note.description || "<p><em>No notes yet.</em></p>" }} />

      <div className="profile-note-actions">
        <button className="btn ghost" onClick={() => onEdit(note)}>Edit note</button>
        <button className="btn danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

Object.assign(window, { AboutView, MapView, RecipesView, RestaurantProfile, NoteProfile, GroceryListPanel });

})();
