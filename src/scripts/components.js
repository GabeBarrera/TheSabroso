(function () {
/* global React */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ============================================================
   STAR RATING (input + read-only)
   ============================================================ */

function StarRating({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const handle = (e, idx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = x / rect.width; // 0-1 within this star
    // snap to nearest 0.1
    const f = Math.max(0, Math.min(1, frac));
    const stars = idx + f;
    const snapped = Math.round(stars * 10) / 10;
    return Math.max(0, Math.min(5, snapped));
  };

  const display = hover !== null ? hover : value;

  return (
    <div className="stars-input" ref={wrapRef}>
      {[0,1,2,3,4].map((i) => {
        const fill = Math.max(0, Math.min(1, display - i));
        return (
          <div
            key={i}
            className="star-slot"
            style={{ width: size, height: size }}
            onMouseMove={(e) => setHover(handle(e, i))}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => onChange(handle(e, i))}
          >
            <div className="star-bg" style={{ fontSize: size, lineHeight: `${size}px` }}>★</div>
            <div className="star-fg" style={{ fontSize: size, lineHeight: `${size}px`, width: `${fill * 100}%` }}>★</div>
          </div>
        );
      })}
      <div className="num">{value.toFixed(1)} / 5.0</div>
    </div>
  );
}

function StarsRead({ value, size = 14 }) {
  return (
    <div className="stars-read">
      {[0,1,2,3,4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <div key={i} className="s" style={{ width: size, height: size, fontSize: size, lineHeight: `${size}px` }}>
            ★
            <div className="fg" style={{ width: `${fill * 100}%`, fontSize: size, lineHeight: `${size}px` }}>★</div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   RICH TEXT EDITOR
   ============================================================ */

function RichEditor({ value, onChange, placeholder = "Write…" }) {
  const editorRef = useRef(null);
  const [activeMarks, setActiveMarks] = useState({});
  const [imgOpen, setImgOpen] = useState(false);
  const [imgFilename, setImgFilename] = useState("");
  const [manifest, setManifest] = useState([]);
  const uploadRef = useRef(null);
  const savedRangeRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, []); // only mount

  // load manifest of images in src/img/
  useEffect(() => {
    fetch("src/img/manifest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setManifest(Array.isArray(data) ? data : (data.images || [])))
      .catch(() => setManifest([]));
  }, []);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreRange = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const exec = (cmd, arg) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    updateActive();
    onChange(editorRef.current.innerHTML);
  };

  const clearFormat = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && editorRef.current) {
      const blockTags = new Set(["P", "H1", "H2", "H3", "H4", "LI", "DIV", "BLOCKQUOTE"]);
      let block = sel.anchorNode;
      while (block && block !== editorRef.current && !blockTags.has(block.nodeName)) {
        block = block.parentNode;
      }
      if (block && block !== editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(block);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    document.execCommand("removeFormat", false);
    if (document.queryCommandState("insertUnorderedList")) document.execCommand("insertUnorderedList", false);
    if (document.queryCommandState("insertOrderedList")) document.execCommand("insertOrderedList", false);
    document.execCommand("formatBlock", false, "p");
    updateActive();
    onChange(editorRef.current.innerHTML);
  };

  const insertNote = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, '<p style="margin-top:16px;font-size:14px;color:var(--muted)"><strong>Note:</strong> </p>');
    onChange(editorRef.current.innerHTML);
  };

  const insertImage = (src, alt = "") => {
    restoreRange();
    // Build an img tag with figure for cleaner output
    const html = `<figure class="rt-fig"><img src="${src}" alt="${alt.replace(/"/g, "&quot;")}" />${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure><p><br/></p>`;
    document.execCommand("insertHTML", false, html);
    onChange(editorRef.current.innerHTML);
    setImgOpen(false);
    setImgFilename("");
  };

  const insertFromFilename = () => {
    const name = imgFilename.trim();
    if (!name) return;
    const url = name.startsWith("http") || name.startsWith("src/img/") || name.startsWith("/")
      ? name
      : `src/img/${name}`;
    insertImage(url, name.split("/").pop().replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertImage(reader.result, f.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(f);
  };

  const updateActive = () => {
    try {
      setActiveMarks({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
      });
    } catch (e) { /* no-op */ }
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="rt-toolbar">
        <button type="button" className={`rt-tool bold ${activeMarks.bold ? "active" : ""}`} onClick={() => exec("bold")} title="Bold (Cmd+B)">B</button>
        <button type="button" className={`rt-tool italic ${activeMarks.italic ? "active" : ""}`} onClick={() => exec("italic")} title="Italic (Cmd+I)">I</button>
        <button type="button" className={`rt-tool under ${activeMarks.underline ? "active" : ""}`} onClick={() => exec("underline")} title="Underline">U</button>
        <div className="rt-divider" />
        <button type="button" className="rt-tool" onClick={() => exec("formatBlock", "p")} title="Body"><span className="sz-sm">P</span></button>
        <button type="button" className="rt-tool" onClick={() => exec("formatBlock", "h3")} title="Heading"><span className="sz-md">H₃</span></button>
        <button type="button" className="rt-tool" onClick={() => exec("formatBlock", "h2")} title="Big Heading"><span className="sz-lg">H₂</span></button>
        <div className="rt-divider" />
        <button type="button" className={`rt-tool ${activeMarks.ul ? "active" : ""}`} onClick={() => exec("insertUnorderedList")} title="Bullets">• —</button>
        <button type="button" className={`rt-tool ${activeMarks.ol ? "active" : ""}`} onClick={() => exec("insertOrderedList")} title="Numbered">1.</button>
        <div className="rt-divider" />
        <button
          type="button"
          className={`rt-tool ${imgOpen ? "active" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
          onClick={() => setImgOpen(!imgOpen)}
          title="Insert photo"
        >
          ▢ Photo
        </button>
        <div className="rt-divider" />
        <button type="button" className="rt-tool" onClick={clearFormat} title="Clear formatting — strips bold/italic/heading/list from current block">⌫</button>
        <button type="button" className="rt-tool" onClick={insertNote} title="Insert a muted note paragraph">Note</button>
      </div>

      {imgOpen && (
        <div className="img-picker">
          <div className="img-picker-head">
            <div className="img-picker-title">Insert photo</div>
            <button className="img-picker-close" onClick={() => setImgOpen(false)} aria-label="Close">×</button>
          </div>

          {manifest.length > 0 && (
            <div className="img-picker-section">
              <div className="img-picker-label">From <span className="mono">src/img/</span></div>
              <div className="img-grid">
                {manifest.map((m) => {
                  const file = typeof m === "string" ? m : m.file;
                  const label = typeof m === "string" ? m : (m.label || m.file);
                  return (
                    <button
                      key={file}
                      type="button"
                      className="img-thumb"
                      onClick={() => insertImage(`src/img/${file}`, label)}
                      title={file}
                    >
                      <img src={`src/img/${file}`} alt={label} />
                      <span className="img-thumb-name">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="img-picker-section">
            <div className="img-picker-label">Filename in <span className="mono">src/img/</span></div>
            <div className="img-picker-row">
              <input
                className="img-picker-input"
                placeholder="sunset.jpg"
                value={imgFilename}
                onChange={(e) => setImgFilename(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertFromFilename(); } }}
              />
              <button type="button" className="btn primary" onClick={insertFromFilename}>Insert</button>
            </div>
          </div>

          <div className="img-picker-section">
            <div className="img-picker-label">Or upload from device <span className="hint">(inlined; commit to <span className="mono">src/img/</span> to host)</span></div>
            <button type="button" className="btn ghost" onClick={() => uploadRef.current?.click()}>Choose file…</button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden-file"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="rt-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyUp={() => { updateActive(); saveRange(); }}
        onMouseUp={() => { updateActive(); saveRange(); }}
        onFocus={updateActive}
        onBlur={saveRange}
      />
    </div>
  );
}

/* ============================================================
   MANAGE DROPDOWN
   ============================================================ */

function ManageMenu({ items, label = "Manage" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="manage-wrap" ref={wrapRef}>
      <button className={`manage-btn ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        {label}
        <span className="chev" />
      </button>
      {open && (
        <div className="manage-menu" role="menu">
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }}>
              <span>{it.label}</span>
              {it.hint && <span className="kbd">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TOASTS
   ============================================================ */

const ToastCtx = React.createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = "ok", ms = 3000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function useToast() {
  return React.useContext(ToastCtx);
}

/* ============================================================
   MODAL SHELL
   ============================================================ */

function Modal({ eyebrow, title, italicTitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { maxWidth: 900 } : {}}>
        <div className="modal-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <div className="h">
              {title}
              {italicTitle && <span className="it"> {italicTitle}</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}


/* ============================================================
   GLOBAL SEARCH — "/" or Cmd-K, hits every collection
   ============================================================ */

function strip(s) {
  if (!s) return "";
  const div = document.createElement("div");
  div.innerHTML = s;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function highlight(text, query) {
  if (!query || !text) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function GlobalSearch({ open, onClose, restaurants = [], recipes = [], notes = [], onPick }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!open) return [];
    const term = q.trim().toLowerCase();
    if (!term) return [];

    const rRes = (restaurants || [])
      .map((r) => {
        const hay = [r.name, r.cuisine, r.address, strip(r.description), (Array.isArray(r.tags) ? r.tags.join(" ") : "")]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return null;
        let snippet = null;
        const desc = strip(r.description);
        const di = desc.toLowerCase().indexOf(term);
        if (di >= 0) snippet = "…" + desc.slice(Math.max(0, di - 30), Math.min(desc.length, di + term.length + 50)) + "…";
        return { kind: "restaurant", id: r.id, title: r.name, sub: [r.cuisine, r.address].filter(Boolean).join(" · "), snippet, data: r };
      })
      .filter(Boolean);

    const recRes = (recipes || [])
      .map((r) => {
        const ings = (r.ingredients || []).map((i) => [i.qty, i.unit, i.name].filter(Boolean).join(" ")).join(" ");
        const hay = [r.name, r.cuisine, r.tagline, strip(r.description), ings].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return null;
        let snippet = null;
        const desc = strip(r.description);
        const di = desc.toLowerCase().indexOf(term);
        if (di >= 0) snippet = "…" + desc.slice(Math.max(0, di - 30), Math.min(desc.length, di + term.length + 50)) + "…";
        else if (r.tagline && r.tagline.toLowerCase().includes(term)) snippet = r.tagline;
        else if (ings.toLowerCase().includes(term)) snippet = "ingredient: " + ings.slice(0, 80);
        const cost = (r.ingredients || []).reduce((acc, ing) => {
          const c = parseFloat(String(ing.cost || ""));
          return isNaN(c) ? acc : acc + c;
        }, 0);
        const sub = [r.cuisine, r.time ? r.time + " min" : null, r.serves && cost ? "$" + (cost / r.serves).toFixed(2) + "/serv" : null].filter(Boolean).join(" · ");
        return { kind: "recipe", id: r.id, title: r.name, sub, snippet, data: r };
      })
      .filter(Boolean);

    const nRes = (notes || [])
      .map((n) => {
        const hay = [n.name, n.tag, n.address, strip(n.description)].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return null;
        const desc = strip(n.description);
        const di = desc.toLowerCase().indexOf(term);
        const snippet = di >= 0 ? "…" + desc.slice(Math.max(0, di - 30), Math.min(desc.length, di + term.length + 50)) + "…" : null;
        return { kind: "note", id: n.id, title: n.name, sub: [n.tag, n.address].filter(Boolean).join(" · "), snippet, data: n };
      })
      .filter(Boolean);

    return [...recRes, ...rRes, ...nRes];
  }, [open, q, restaurants, recipes, notes]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[active];
        if (r && onPick) { onPick(r); onClose(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose, onPick]);

  // scroll active into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(".gs-row.gs-active");
    if (el && el.scrollIntoView) {
      const parent = listRef.current;
      const eR = el.getBoundingClientRect();
      const pR = parent.getBoundingClientRect();
      if (eR.top < pR.top) parent.scrollTop += eR.top - pR.top - 4;
      else if (eR.bottom > pR.bottom) parent.scrollTop += eR.bottom - pR.bottom + 4;
    }
  }, [active]);

  const grouped = useMemo(() => {
    const g = { recipe: [], restaurant: [], note: [] };
    results.forEach((r) => g[r.kind].push(r));
    return g;
  }, [results]);

  if (!open) return null;

  const sectionLabel = { recipe: "Recipes", restaurant: "Restaurants", note: "Notes & Map Pins" };
  const sectionBadge = { recipe: <span className="gs-badge gs-badge-rec">★</span>, restaurant: <span className="gs-badge gs-badge-r">R</span>, note: <span className="gs-badge gs-badge-n">N</span> };

  let runningIdx = -1;

  return (
    <div className="gs-backdrop" onClick={onClose}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Global search">
        <div className="gs-input-row">
          <svg className="gs-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            ref={inputRef}
            className="gs-input"
            type="text"
            placeholder="Search recipes, restaurants, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="gs-esc" onClick={onClose} title="Close">ESC</button>
        </div>

        <div className="gs-results" ref={listRef}>
          {q.trim() === "" ? (
            <div className="gs-empty">
              <div className="gs-empty-title">Search everything.</div>
              <div className="gs-empty-sub">Names, cuisines, ingredients, addresses, the words inside reviews.</div>
              <div className="gs-empty-keys">
                <span><kbd>↑↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Open</span>
                <span><kbd>ESC</kbd> Close</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="gs-noresults">
              <div className="gs-noresults-title">Nothing matches "<em>{q}</em>"</div>
              <div className="gs-noresults-sub">Try a cuisine, an ingredient, or a neighborhood.</div>
            </div>
          ) : (
            (["recipe", "restaurant", "note"]).map((kind) => {
              const list = grouped[kind];
              if (!list.length) return null;
              return (
                <div key={kind} className="gs-section">
                  <div className="gs-section-head">
                    <span>{sectionLabel[kind]}</span>
                    <span>{list.length} match{list.length === 1 ? "" : "es"}</span>
                  </div>
                  {list.map((r) => {
                    runningIdx += 1;
                    const isActive = runningIdx === active;
                    const myIdx = runningIdx;
                    return (
                      <div
                        key={`${r.kind}-${r.id}`}
                        className={`gs-row${isActive ? " gs-active" : ""}`}
                        onMouseEnter={() => setActive(myIdx)}
                        onClick={() => { onPick && onPick(r); onClose(); }}
                      >
                        {sectionBadge[kind]}
                        <div className="gs-row-body">
                          <div className="gs-row-title">{highlight(r.title, q)}</div>
                          <div className="gs-row-sub">
                            {r.sub}
                            {r.snippet && <span className="gs-snippet"> · {highlight(r.snippet, q)}</span>}
                          </div>
                        </div>
                        {isActive && <span className="gs-row-key">↵</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="gs-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>/</kbd> or <kbd>⌘K</kbd> Toggle</span>
          {q && <span className="gs-count">{results.length} result{results.length === 1 ? "" : "s"}</span>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StarRating, StarsRead, RichEditor, ManageMenu, ToastProvider, useToast, Modal, GlobalSearch });

})();
