(function () {
/* global React, ReactDOM, AboutView, MapView, RecipesView, RestaurantProfile,
          RestaurantForm, RecipeForm, EditPicker, ImportDialog,
          ToastProvider, useToast, SDStore */

const { useState, useEffect, useRef, useCallback } = React;

const VIEW_MAP = 0;
const VIEW_ABOUT = 1;
const VIEW_RECIPES = 2;

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
  const touchRef = useRef(null);

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
    if (modal || profile) return;
    // ignore if on map (leaflet handles its own gestures) — but allow on chrome
    const path = e.target;
    if (path.closest(".leaflet-container")) return;
    if (path.closest(".rt-editor") || path.closest("input") || path.closest("textarea") || path.closest("button")) return;
    touchRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e) => {
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
      />
    </ToastProvider>
  );
}

function doBackup(target, list) {
  const filename = target === "restaurant" ? "sabroso_restaurants.json" : "sabroso_recipes.json";
  SDStore.download(filename, JSON.stringify(list, null, 2));
}

function AppInner(props) {
  const {
    view, setView, animate, onPointerDown, onPointerUp,
    restaurants, setRestaurants, recipes, setRecipes,
    profile, setProfile, modal, setModal, openManage,
    theme, setTheme,
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

      {/* PROFILE OVERLAY */}
      {profile && (
        <RestaurantProfile restaurant={profile} onClose={() => setProfile(null)} />
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
