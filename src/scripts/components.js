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
    document.execCommand("insertHTML", false, '<p style="margin-top:16px;font-size:14px;color:var(--muted)"><strong>Notes:</strong> </p>');
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

Object.assign(window, { StarRating, StarsRead, RichEditor, ManageMenu, ToastProvider, useToast, Modal });

})();
