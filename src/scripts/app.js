(function () {
/* global React, ReactDOM, AboutView, MapView, RecipesView, RestaurantProfile,
          RestaurantForm, RecipeForm, EditPicker, ImportDialog,
          ToastProvider, useToast, SDStore */

const { useState, useEffect, useRef, useCallback } = React;

const VIEW_MAP = 0;
const VIEW_ABOUT = 1;
const VIEW_RECIPES = 2;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isVoiceHidden(r, hiddenFilters) {
  if (!hiddenFilters.length) return false;
  if (hiddenFilters.includes("all")) return true;
  const cuisine = (r.cuisine || "").toLowerCase();
  const tags = (Array.isArray(r.tags) ? r.tags : ["restaurant"]).map((t) => t.toLowerCase());
  for (const f of hiddenFilters) {
    // "bar" / "restaurant" tag filters only hide entries that carry that tag exclusively
    if (f === "bar" || f === "restaurant") {
      if (tags.length === 1 && tags[0] === f) return true;
    } else {
      if (cuisine.includes(f)) return true;
    }
  }
  return false;
}

function handleVoiceCommand(transcript, restaurants, hiddenFilters, setHiddenFilters, setView, setVoiceResult, setProfile, mapActionsRef) {
  const t = transcript.toLowerCase().trim();

  // Surprise Me
  if (t.includes("surprise me")) {
    const pool = restaurants.filter((r) => !isVoiceHidden(r, hiddenFilters));
    if (!pool.length) return;
    const r = pool[Math.floor(Math.random() * pool.length)];
    setView(VIEW_MAP);
    setTimeout(() => mapActionsRef.current?.zoomTo(r), 400);
    return;
  }

  // I'm Craving [cuisine]
  const cravingMatch = t.match(/(?:i(?:'m| am) craving|craving)\s+(.+)/);
  if (cravingMatch) {
    const craving = cravingMatch[1].trim();
    const pool = restaurants.filter(
      (r) => (r.cuisine || "").toLowerCase().includes(craving) && !isVoiceHidden(r, hiddenFilters)
    );
    if (!pool.length) {
      setVoiceResult({ type: "none", query: craving });
      return;
    }
    const r = pool[Math.floor(Math.random() * pool.length)];
    setView(VIEW_MAP);
    setTimeout(() => mapActionsRef.current?.zoomTo(r), 400);
    return;
  }

  // Hide all / Show all
  if (/hide all/.test(t)) { setHiddenFilters(["all"]); return; }
  if (/show all/.test(t)) { setHiddenFilters([]); return; }

  // Hide / Show [tag or cuisine]
  const hideShowMatch = t.match(/^(hide|show)\s+(.+)/);
  if (hideShowMatch) {
    const action = hideShowMatch[1];
    const filter = hideShowMatch[2].trim().toLowerCase();
    setHiddenFilters((prev) => {
      const base = prev.filter((f) => f !== "all"); // drop "all" when switching to specific
      if (action === "hide") return base.includes(filter) ? base : [...base, filter];
      return base.filter((f) => f !== filter);
    });
    return;
  }

  // Find nearest
  if (/find\s+nearest|nearest\s+restaurant/.test(t)) {
    const geo = navigator.geolocation;
    if (!geo) return;
    geo.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const withDist = restaurants
          .filter((r) => !isVoiceHidden(r, hiddenFilters))
          .map((r) => ({ ...r, dist: haversine(latitude, longitude, r.lat, r.lng) }))
          .sort((a, b) => a.dist - b.dist);
        const nearby = withDist.slice(0, 5);
        setView(VIEW_MAP);
        setTimeout(() => {
          mapActionsRef.current?.zoomTo(nearby[0]);
          setVoiceResult({ type: "nearest", items: nearby });
        }, 400);
      },
      () => {
        setVoiceResult({ type: "none", query: "your location (permission denied)" });
      },
      { timeout: 6000 }
    );
    return;
  }

  // Find [string]
  const findMatch = t.match(/^find\s+(.+)/);
  if (findMatch) {
    const query = findMatch[1].trim();
    const matches = restaurants.filter((r) => {
      const text = [r.name, r.cuisine, r.address, (r.description || "").replace(/<[^>]+>/g, "")]
        .join(" ").toLowerCase();
      return text.includes(query);
    });
    if (matches.length === 0) {
      setVoiceResult({ type: "none", query });
      return;
    }
    if (matches.length === 1) {
      setView(VIEW_MAP);
      setTimeout(() => mapActionsRef.current?.zoomTo(matches[0]), 400);
      return;
    }
    setVoiceResult({ type: "list", items: matches, query });
    return;
  }
}

function App() {
  const [view, setView] = useState(VIEW_ABOUT);
  const [restaurants, setRestaurants] = useState(() => SDStore.loadRestaurants() ?? []);
  const [recipes, setRecipes] = useState(() => SDStore.loadRecipes() ?? []);
  const [dataReady, setDataReady] = useState(() => localStorage.getItem("sabroso_restaurants") !== null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("sabroso_theme") || "light"; } catch (e) { return "light"; }
  });

  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState(null);
  const [animate, setAnimate] = useState(true);
  const [chatActive, setChatActive] = useState(false);
  const [hiddenFilters, setHiddenFilters] = useState([]);
  const [voiceResult, setVoiceResult] = useState(null);
  const touchRef = useRef(null);
  const mapActionsRef = useRef(null);
  const recognitionRef = useRef(null);
  const hiddenFiltersRef = useRef(hiddenFilters);
  useEffect(() => { hiddenFiltersRef.current = hiddenFilters; }, [hiddenFilters]);

  // seed from JSON files on first visit
  useEffect(() => {
    if (dataReady) return;
    Promise.all([
      fetch("./data/restaurants.json").then((r) => r.json()).catch(() => []),
      fetch("./data/recipes.json").then((r) => r.json()).catch(() => []),
    ]).then(([r, rec]) => {
      setRestaurants(r);
      setRecipes(rec);
      setDataReady(true);
    });
  }, []);

  // persist on change — guarded so we don't write before seed fetch resolves
  useEffect(() => { if (dataReady) SDStore.saveRestaurants(restaurants); }, [restaurants, dataReady]);
  useEffect(() => { if (dataReady) SDStore.saveRecipes(recipes); }, [recipes, dataReady]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("sabroso_theme", theme); } catch (e) { /* no-op */ }
  }, [theme]);

  // voice recognition — start/stop when chatActive changes
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (!chatActive) {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) { /* ignore */ } }
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      handleVoiceCommand(
        transcript,
        SDStore.loadRestaurants() ?? [],
        hiddenFiltersRef.current,
        setHiddenFilters,
        setView,
        setVoiceResult,
        setProfile,
        mapActionsRef
      );
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") setChatActive(false); };
    rec.onend = () => { if (chatActive) { try { rec.start(); } catch (e) { /* ignore */ } } };
    rec.start();
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch (e) { /* ignore */ } };
  }, [chatActive]);

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      // ignore when typing
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (modal || profile) return;
      if (e.key === "ArrowLeft") setView((v) => Math.max(0, v - 1));
      else if (e.key === "ArrowRight") setView((v) => Math.min(2, v + 1));
      else if (e.key === "Home") setView(VIEW_ABOUT);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, profile]);

  // swipe nav (pointer)
  const onPointerDown = (e) => {
    if (e.pointerType === "touch") return;
    if (modal || profile) return;
    // ignore if on map (leaflet handles its own gestures) — but allow on chrome
    const path = e.target;
    if (path.closest(".leaflet-container")) return;
    if (path.closest(".rt-editor") || path.closest("input") || path.closest("textarea") || path.closest("button")) return;
    touchRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e) => {
    if (e.pointerType === "touch") return;
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) setView((v) => Math.min(2, v + 1));
    else setView((v) => Math.max(0, v - 1));
  };

  // touch events
  useEffect(() => {
    let touchStart = null;
    const ts = (e) => {
      if (modal || profile) return;
      if (e.target.closest(".leaflet-container")) return;
      if (e.target.closest(".rt-editor") || e.target.closest("input") || e.target.closest("textarea")) return;
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    };
    const te = (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) setView((v) => Math.min(2, v + 1));
      else setView((v) => Math.max(0, v - 1));
    };
    document.addEventListener("touchstart", ts, { passive: true });
    document.addEventListener("touchend", te, { passive: true });
    return () => {
      document.removeEventListener("touchstart", ts);
      document.removeEventListener("touchend", te);
    };
  }, [modal, profile]);

  // ----- Manage menu builders -----

  const openManage = useCallback((target) => {
    const list = target === "restaurant" ? restaurants : recipes;
    return [
      { label: "New entry", hint: "create", onClick: () => setModal({ kind: "new", target }) },
      { label: "Edit existing", hint: "modify", onClick: () => setModal({ kind: "pick", target }) },
      { label: "Import .json", hint: "merge", onClick: () => setModal({ kind: "import", target }) },
      { label: "Backup all", hint: "export", onClick: () => doBackup(target, list) },
    ];
  }, [restaurants, recipes]);

  return (
    <ToastProvider>
      <AppInner
        view={view}
        setView={setView}
        animate={animate}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        restaurants={restaurants}
        setRestaurants={setRestaurants}
        recipes={recipes}
        setRecipes={setRecipes}
        profile={profile}
        setProfile={setProfile}
        modal={modal}
        setModal={setModal}
        openManage={openManage}
        theme={theme}
        setTheme={setTheme}
        chatActive={chatActive}
        setChatActive={setChatActive}
        hiddenFilters={hiddenFilters}
        setHiddenFilters={setHiddenFilters}
        voiceResult={voiceResult}
        setVoiceResult={setVoiceResult}
        mapActionsRef={mapActionsRef}
      />
    </ToastProvider>
  );
}

function doBackup(target, list) {
  const filename = target === "restaurant" ? "sabroso_restaurants.json" : "sabroso_recipes.json";
  SDStore.download(filename, JSON.stringify(list, null, 2));
}

function VoiceResultModal({ result, onClose, setView, mapActionsRef }) {
  const [collapsed, setCollapsed] = useState(false);

  // expand whenever a fresh result arrives
  useEffect(() => { if (result) setCollapsed(false); }, [result]);

  if (!result) return null;

  const isNone = result.type === "none";
  const tabLabel = result.type === "nearest" ? "Near" : isNone ? "None" : "Found";
  const panelTitle = result.type === "nearest" ? "Nearest Restaurants"
    : isNone ? "No Results"
    : `Found · "${result.query}"`;
  const panelSub = result.type === "nearest"
    ? `${result.items.length} closest to your location`
    : isNone
    ? `Nothing matched "${result.query}"`
    : `${result.items.length} restaurant${result.items.length !== 1 ? "s" : ""} matched`;

  return (
    <div className={`voice-drawer${collapsed ? " collapsed" : ""}`}>
      <button
        className="voice-drawer-tab"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expand results" : "Collapse results"}
        aria-label={collapsed ? "Expand results" : "Collapse results"}
      >
        <span className="voice-drawer-tab-label">{tabLabel}</span>
        <span className="voice-drawer-tab-arrow">{collapsed ? "‹" : "›"}</span>
      </button>
      <div className="voice-drawer-panel">
        <div className="voice-panel-head">
          <div>
            <div className="voice-panel-title">{panelTitle}</div>
            <div className="voice-panel-sub">{panelSub}</div>
          </div>
          <button className="voice-panel-close" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="voice-panel-body">
          {isNone ? (
            <div className="voice-no-results">Nothing found.</div>
          ) : result.items.map((r) => (
            <button key={r.id} className="voice-result-row" onClick={() => {
              onClose();
              setView(VIEW_MAP);
              setTimeout(() => mapActionsRef.current?.zoomTo(r), 400);
            }}>
              <div className="vr-name">{r.name}</div>
              <div className="vr-meta">{r.cuisine || "—"} · {r.address}</div>
              {r.dist != null && <div className="vr-dist">{r.dist.toFixed(1)} mi away</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppInner(props) {
  const {
    view, setView, animate, onPointerDown, onPointerUp,
    restaurants, setRestaurants, recipes, setRecipes,
    profile, setProfile, modal, setModal, openManage,
    theme, setTheme,
    chatActive, setChatActive, hiddenFilters, setHiddenFilters,
    voiceResult, setVoiceResult, mapActionsRef,
  } = props;
  const toast = useToast();

  const goLeft = () => setView((v) => Math.max(0, v - 1));
  const goRight = () => setView((v) => Math.min(2, v + 1));

  const closeModal = () => setModal(null);

  // SAVE handlers
  const saveRestaurant = (entry) => {
    const isEdit = !!modal?.initial;
    setRestaurants((list) => {
      if (isEdit) return list.map((r) => (r.id === entry.id ? entry : r));
      return [...list, entry];
    });
    toast(isEdit ? `Updated · ${entry.name}` : `Logged · ${entry.name}`, "ok");
    closeModal();
  };

  const saveRecipe = (entry) => {
    const isEdit = !!modal?.initial;
    setRecipes((list) => {
      if (isEdit) return list.map((r) => (r.id === entry.id ? entry : r));
      return [...list, entry];
    });
    toast(isEdit ? `Updated · ${entry.name}` : `Filed · ${entry.name}`, "ok");
    closeModal();
  };

  const deleteRestaurant = (id) => {
    const entry = restaurants.find((r) => r.id === id);
    setRestaurants((list) => list.filter((r) => r.id !== id));
    toast(`Deleted · ${entry?.name || "entry"}`, "ok");
    closeModal();
  };

  const deleteRecipe = (id) => {
    const entry = recipes.find((r) => r.id === id);
    setRecipes((list) => list.filter((r) => r.id !== id));
    toast(`Deleted · ${entry?.name || "recipe"}`, "ok");
    closeModal();
  };

  // EDIT pick → swap modal to edit form
  const pickToEdit = (entry) => {
    setModal({ kind: "edit", target: modal.target, initial: entry });
  };

  // IMPORT commit
  const commitImport = (newList) => {
    if (modal.target === "restaurant") setRestaurants(newList);
    else setRecipes(newList);
    closeModal();
  };

  return (
    <div className="app" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div
        className={`stage ${animate ? "" : "no-anim"}`}
        style={{ transform: `translateX(-${view * 33.3333}%)` }}
      >
        <div className="panel" data-screen-label="02 Map">
          <MapView
            restaurants={restaurants}
            setRestaurants={setRestaurants}
            openProfile={setProfile}
            openManage={openManage}
            navigate={setView}
            theme={theme}
            hiddenFilters={hiddenFilters}
            mapActionsRef={mapActionsRef}
          />
        </div>
        <div className="panel" data-screen-label="01 About">
          <AboutView goLeft={goLeft} goRight={goRight} />
        </div>
        <div className="panel" data-screen-label="03 Recipes">
          <RecipesView
            recipes={recipes}
            openManage={openManage}
            navigate={setView}
          />
        </div>
      </div>

      {/* bottom nav dots */}
      <div className="nav-dots">
        <span className="lbl">View</span>
        <button className={view === 0 ? "active" : ""} onClick={() => setView(0)} aria-label="Map" />
        <button className={view === 1 ? "active" : ""} onClick={() => setView(1)} aria-label="About" />
        <button className={view === 2 ? "active" : ""} onClick={() => setView(2)} aria-label="Recipes" />
      </div>

      {/* theme toggle (sun ↔ moon) */}
      <button
        className="theme-toggle"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
          </svg>
        )}
      </button>

      {/* chat toggle */}
      <button
        className={`chat-toggle${chatActive ? " active" : ""}`}
        onClick={() => setChatActive((v) => !v)}
        title={chatActive ? "Stop listening" : "Voice commands"}
        aria-label={chatActive ? "Stop voice commands" : "Start voice commands"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
        </svg>
      </button>

      {/* PROFILE OVERLAY */}
      {profile && (
        <RestaurantProfile restaurant={profile} onClose={() => setProfile(null)} />
      )}

      {/* VOICE RESULT */}
      {voiceResult && (
        <VoiceResultModal
          result={voiceResult}
          restaurants={restaurants}
          onClose={() => setVoiceResult(null)}
          setView={setView}
          mapActionsRef={mapActionsRef}
        />
      )}

      {/* MODALS */}
      {modal?.kind === "new" && modal.target === "restaurant" && (
        <RestaurantForm onSave={saveRestaurant} onCancel={closeModal} mode="new" />
      )}
      {modal?.kind === "new" && modal.target === "recipe" && (
        <RecipeForm onSave={saveRecipe} onCancel={closeModal} mode="new" />
      )}
      {modal?.kind === "edit" && modal.target === "restaurant" && (
        <RestaurantForm initial={modal.initial} onSave={saveRestaurant} onCancel={closeModal} onDelete={() => deleteRestaurant(modal.initial.id)} mode="edit" />
      )}
      {modal?.kind === "edit" && modal.target === "recipe" && (
        <RecipeForm initial={modal.initial} onSave={saveRecipe} onCancel={closeModal} onDelete={() => deleteRecipe(modal.initial.id)} mode="edit" />
      )}
      {modal?.kind === "pick" && (
        <EditPicker
          entries={modal.target === "restaurant" ? restaurants : recipes}
          kind={modal.target}
          onPick={pickToEdit}
          onCancel={closeModal}
        />
      )}
      {modal?.kind === "import" && (
        <ImportDialog
          existing={modal.target === "restaurant" ? restaurants : recipes}
          kind={modal.target}
          onClose={closeModal}
          onCommit={commitImport}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

})();
