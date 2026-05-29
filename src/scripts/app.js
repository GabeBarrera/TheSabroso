(function () {
/* global React, ReactDOM, AboutView, MapView, RecipesView, RestaurantProfile,
          RestaurantForm, RecipeForm, EditPicker, ImportDialog, LoginModal,
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

  if (t.includes("surprise me")) {
    const pool = restaurants.filter((r) => !isVoiceHidden(r, hiddenFilters));
    if (!pool.length) return true;
    const r = pool[Math.floor(Math.random() * pool.length)];
    setView(VIEW_MAP);
    setTimeout(() => mapActionsRef.current?.zoomTo(r), 400);
    return true;
  }

  const cravingMatch = t.match(/(?:i(?:'m| am) craving|craving)\s+(.+)/);
  if (cravingMatch) {
    const craving = cravingMatch[1].trim();
    const pool = restaurants.filter(
      (r) => (r.cuisine || "").toLowerCase().includes(craving) && !isVoiceHidden(r, hiddenFilters)
    );
    if (!pool.length) { setVoiceResult({ type: "none", query: craving }); return true; }
    const r = pool[Math.floor(Math.random() * pool.length)];
    setView(VIEW_MAP);
    setTimeout(() => mapActionsRef.current?.zoomTo(r), 400);
    return true;
  }

  if (/hide all/.test(t)) { setHiddenFilters(["all"]); return true; }
  if (/show all/.test(t)) { setHiddenFilters([]); return true; }

  const hideShowMatch = t.match(/^(hide|show)\s+(.+)/);
  if (hideShowMatch) {
    const action = hideShowMatch[1];
    const filter = hideShowMatch[2].trim().toLowerCase();
    setHiddenFilters((prev) => {
      const base = prev.filter((f) => f !== "all");
      if (action === "hide") return base.includes(filter) ? base : [...base, filter];
      return base.filter((f) => f !== filter);
    });
    return true;
  }

  if (/find\s+nearest|nearest\s+restaurant/.test(t)) {
    const geo = navigator.geolocation;
    if (!geo) return true;
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
      () => { setVoiceResult({ type: "none", query: "your location (permission denied)" }); },
      { timeout: 6000 }
    );
    return true;
  }

  const findMatch = t.match(/^find\s+(.+)/);
  if (findMatch) {
    const query = findMatch[1].trim();
    const matches = restaurants.filter((r) => {
      const text = [r.name, r.cuisine, r.address, (r.description || "").replace(/<[^>]+>/g, "")]
        .join(" ").toLowerCase();
      return text.includes(query);
    });
    if (matches.length === 0) { setVoiceResult({ type: "none", query }); return true; }
    if (matches.length === 1) {
      setView(VIEW_MAP);
      setTimeout(() => mapActionsRef.current?.zoomTo(matches[0]), 400);
      return true;
    }
    setVoiceResult({ type: "list", items: matches, query });
    return true;
  }

  return false;
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
  const [isAdmin, setIsAdmin] = useState(() => SDStore.isAdmin());
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
      fetch("./data/restaurants.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch("./data/recipes.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
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
      { label: "Resync data", hint: "reset", onClick: () => setModal({ kind: "resync" }) },
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
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />
    </ToastProvider>
  );
}

function doBackup(target, list) {
  const filename = target === "restaurant" ? "sabroso_restaurants.json" : "sabroso_recipes.json";
  SDStore.download(filename, JSON.stringify(list, null, 2));
}

function doResync() {
  SDStore.clearData();
  window.location.reload();
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
  isAdmin, setIsAdmin,
  } = props;
  const toast = useToast();
  const [kbdActive, setKbdActive] = useState(false);
  const [kbdText, setKbdText] = useState("");
  const [cmdError, setCmdError] = useState(null);
  const [cmdErrorKey, setCmdErrorKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const errorTimerRef = useRef(null);
  const kbdRef = useRef(null);

  useEffect(() => {
    if (kbdActive && kbdRef.current) kbdRef.current.focus();
  }, [kbdActive]);

  const showCmdError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setCmdError(msg);
    setCmdErrorKey((k) => k + 1);
    errorTimerRef.current = setTimeout(() => setCmdError(null), 2000);
  };

  const submitKbd = () => {
    const t = kbdText.trim();
    if (!t) return;
    if (t.toLowerCase() === "help") {
      setHelpOpen(true);
      setKbdText("");
      return;
    }
    const ok = handleVoiceCommand(
      t, restaurants, hiddenFilters, setHiddenFilters, setView, setVoiceResult, setProfile, mapActionsRef
    );
    if (!ok) showCmdError(`Not recognized: "${t}"`);
    setKbdText("");
  };

  const handleAdminLogout = () => {
    SDStore.adminLogout();
    setIsAdmin(false);
    toast("Logged out", "ok");
  };

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

      <div className={`btn-dock${dockOpen ? " dock-open" : ""}`}>
        <button
          className="theme-toggle"
          onClick={() => { setTheme(theme === "light" ? "dark" : "light"); setDockOpen(false); }}
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

        <button
          className={`kbd-toggle${kbdActive ? " active" : ""}`}
          onClick={() => { setKbdActive((v) => !v); setDockOpen(false); }}
          title="Type a command"
          aria-label="Type a command"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
          </svg>
        </button>

        <button
          className={`chat-toggle${chatActive ? " active" : ""}`}
          onClick={() => { setChatActive((v) => !v); setDockOpen(false); }}
          title={chatActive ? "Stop listening" : "Voice commands"}
          aria-label={chatActive ? "Stop voice commands" : "Start voice commands"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
          </svg>
        </button>

        <button
          className={`admin-toggle${isAdmin ? " authed" : ""}`}
          onClick={() => { isAdmin ? handleAdminLogout() : setModal({ kind: "login" }); setDockOpen(false); }}
          title={isAdmin ? "Log out of admin" : "Admin login"}
          aria-label={isAdmin ? "Log out of admin" : "Admin login"}
        >
          {isAdmin ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 019.9-1"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          )}
        </button>

        <button className={`dock-fab${dockOpen ? " open" : ""}`} onClick={() => setDockOpen((v) => !v)} aria-label="Toggle actions">
          {dockOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>
            </svg>
          )}
        </button>
      </div>

      {kbdActive && (
        <div className="kbd-input-box">
          <input
            ref={kbdRef}
            className="kbd-input"
            value={kbdText}
            onChange={(e) => setKbdText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitKbd();
              if (e.key === "Escape") { setKbdActive(false); setKbdText(""); }
            }}
            placeholder='Type a command… or "help"'
          />
          <button className="kbd-send" onClick={submitKbd} title="Run">↵</button>
          <button className="kbd-close" onClick={() => { setKbdActive(false); setKbdText(""); }} title="Close">×</button>
        </div>
      )}

      {cmdError && (
        <div className="cmd-error" key={cmdErrorKey}>{cmdError}</div>
      )}

      {/* PROFILE OVERLAY */}
      {profile && (
        <RestaurantProfile restaurant={profile} onClose={() => setProfile(null)} isAdmin={isAdmin} />
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
        <RestaurantForm onSave={saveRestaurant} onCancel={closeModal} mode="new" isAdmin={isAdmin} />
      )}
      {modal?.kind === "new" && modal.target === "recipe" && (
        <RecipeForm onSave={saveRecipe} onCancel={closeModal} mode="new" />
      )}
      {modal?.kind === "edit" && modal.target === "restaurant" && (
        <RestaurantForm initial={modal.initial} onSave={saveRestaurant} onCancel={closeModal} onDelete={() => deleteRestaurant(modal.initial.id)} mode="edit" isAdmin={isAdmin} />
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
      {helpOpen && (
        <Modal eyebrow="Keyboard" title="Available" italicTitle="Commands" onClose={() => setHelpOpen(false)}>
          <div className="help-commands">
            {[
              { cmd: "surprise me",           desc: "Picks a random visible restaurant and zooms to it on the map" },
              { cmd: "i'm craving [cuisine]",  desc: "Finds a restaurant matching the cuisine and zooms to it" },
              { cmd: "hide all",               desc: "Hides all restaurant markers on the map" },
              { cmd: "show all",               desc: "Shows all restaurant markers" },
              { cmd: "hide [cuisine or tag]",  desc: "Hides markers for that cuisine or tag (e.g. japanese, bar)" },
              { cmd: "show [cuisine or tag]",  desc: "Shows hidden markers for that cuisine or tag" },
              { cmd: "find nearest",           desc: "Zooms to the restaurant closest to your current location" },
              { cmd: "find [name]",            desc: "Searches for a restaurant by name or keyword" },
              { cmd: "help",                   desc: "Shows this command reference" },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="help-row">
                <code className="help-cmd">{cmd}</code>
                <span className="help-desc">{desc}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal?.kind === "resync" && (
        <Modal eyebrow="Warning" title="Resync" italicTitle="Data" onClose={closeModal}
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={closeModal}>Cancel</button>
              <button className="btn danger" onClick={doResync}>Resync &amp; Reload</button>
            </div>
          }
        >
          <p style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.65, marginBottom: 14 }}>
            This will <strong>delete all locally saved data</strong> — every restaurant entry and recipe, including anything you've added or edited since the last sync.
          </p>
          <p style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.65, marginBottom: 20 }}>
            The app will reload and reseed from the original source files. This cannot be undone.
          </p>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }}>
            Back up your data first via Manage → Backup all
          </p>
        </Modal>
      )}
      {modal?.kind === "login" && (
        <LoginModal
          onLogin={() => { setIsAdmin(true); closeModal(); }}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

})();
