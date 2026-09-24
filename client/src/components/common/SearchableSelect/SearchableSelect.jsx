import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaTimes, FaSearch, FaPlus } from "react-icons/fa";

import "../../../styles/common/SearchableSelect.css";

const MAX_RENDER = 300;

const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Highlight({ text, query }) {
  if (!query) return text;
  const i = fold(text).indexOf(fold(query));
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Type-to-search dropdown (combobox).
 *
 * options: [{ value, label, flag?, hint?, badge? }]
 * onChange(value, option|null) — option is null for a custom typed value
 */
function SearchableSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  loading = false,
  allowCustom = true,
  icon = null,
  invalid = false,
  emptyText = "No matches found",
  disabledText = "",
  countLabel = "options",
}) {
  const autoId = useId();
  const inputId = id || `ss-${autoId}`;
  const listId = `${inputId}-list`;

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const popRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  // ---------- filter + rank ----------
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!typing || !q) return options;
    const starts = [];
    const words = [];
    const contains = [];
    for (const o of options) {
      const l = fold(o.label);
      if (l.startsWith(q)) starts.push(o);
      else if (l.includes(" " + q) || l.includes("-" + q)) words.push(o);
      else if (l.includes(q) || (o.hint && fold(o.hint) === q)) contains.push(o);
    }
    return [...starts, ...words, ...contains];
  }, [options, query, typing]);

  const visible = filtered.slice(0, MAX_RENDER);
  const trimmedQuery = query.trim();
  const showCustom =
    allowCustom &&
    typing &&
    trimmedQuery &&
    !options.some((o) => fold(o.label) === fold(trimmedQuery));

  const rows = showCustom ? [...visible, { __custom: true, value: trimmedQuery }] : visible;

  // ---------- positioning (portal, fixed) ----------
  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const want = 320;
    const up = spaceBelow < Math.min(want, 220) && r.top > spaceBelow;
    setPos({
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.max(160, Math.min(want, (up ? r.top : spaceBelow) - 16)),
      up,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    const idx = selected ? options.indexOf(selected) : 0;
    setActive(idx > -1 && idx < MAX_RENDER ? idx : 0);
  };

  const choose = (row) => {
    if (!row) return;
    if (row.__custom) onChange(row.value, null);
    else onChange(row.value, row);
    close();
    inputRef.current?.blur();
  };

  // If the user typed something that exactly matches an option, keep it on blur
  const commitTyped = () => {
    if (!typing) return;
    const q = query.trim();
    if (!q) return;
    const exact = options.find((o) => fold(o.label) === fold(q));
    if (exact) onChange(exact.value, exact);
    else if (allowCustom) onChange(q, null);
  };

  // ---------- outside click ----------
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      commitTyped();
      close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, typing]);

  // keep active row in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => Math.min(a + 1, rows.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open) {
          e.preventDefault();
          choose(rows[active]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        break;
      case "Tab":
        if (open) {
          commitTyped();
          close();
        }
        break;
      default:
    }
  };

  const displayValue = typing ? query : value || "";
  const showClear = !disabled && (value || (typing && query));

  const popup =
    open && pos
      ? createPortal(
          <div
            ref={popRef}
            className={`ss-popover ${pos.up ? "ss-up" : ""}`}
            style={{
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="ss-popover-head">
              <FaSearch />
              <span>
                {loading
                  ? "Loading…"
                  : `${filtered.length.toLocaleString()} ${countLabel}${
                      typing && trimmedQuery ? ` matching “${trimmedQuery}”` : ""
                    }`}
              </span>
            </div>

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              className="ss-list"
              style={{ maxHeight: pos.maxHeight - 40 }}
            >
              {loading && (
                <li className="ss-empty">
                  <span className="ss-spinner" /> Loading data…
                </li>
              )}

              {!loading && rows.length === 0 && <li className="ss-empty">{emptyText}</li>}

              {!loading &&
                rows.map((o, i) =>
                  o.__custom ? (
                    <li
                      key="__custom"
                      data-idx={i}
                      role="option"
                      aria-selected={active === i}
                      className={`ss-option ss-custom ${active === i ? "is-active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o)}
                    >
                      <FaPlus className="ss-custom-icon" />
                      <span className="ss-label">
                        Use “<strong>{o.value}</strong>”
                      </span>
                    </li>
                  ) : (
                    <li
                      key={`${o.value}-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={o.value === value}
                      className={`ss-option ${active === i ? "is-active" : ""} ${
                        o.value === value ? "is-selected" : ""
                      }`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o)}
                    >
                      {o.flag && <span className="ss-flag">{o.flag}</span>}
                      <span className="ss-label">
                        <Highlight text={o.label} query={typing ? trimmedQuery : ""} />
                      </span>
                      {o.badge && <span className="ss-badge">{o.badge}</span>}
                      {o.hint && <span className="ss-hint">{o.hint}</span>}
                      {o.value === value && <span className="ss-check">✓</span>}
                    </li>
                  )
                )}

              {!loading && filtered.length > MAX_RENDER && (
                <li className="ss-more">
                  Showing first {MAX_RENDER} — keep typing to narrow down
                </li>
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={wrapRef}
      className={`ss-control ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${
        invalid ? "is-invalid" : ""
      }`}
      onMouseDown={(e) => {
        if (disabled) return;
        if (e.target !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
          open ? close() : openList();
        }
      }}
      title={disabled ? disabledText : undefined}
    >
      <span className="ss-lead">
        {selected?.flag && !typing ? (
          <span className="ss-flag">{selected.flag}</span>
        ) : (
          icon
        )}
      </span>

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={disabled && disabledText ? disabledText : placeholder}
        value={displayValue}
        onFocus={() => !open && openList()}
        onClick={() => !open && openList()}
        onChange={(e) => {
          setTyping(true);
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {loading && <span className="ss-spinner" />}

      {showClear && (
        <button
          type="button"
          className="ss-clear"
          aria-label="Clear"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuery("");
            setTyping(false);
            onChange("", null);
            inputRef.current?.focus();
          }}
        >
          <FaTimes />
        </button>
      )}

      <FaChevronDown className="ss-caret" />
      {popup}
    </div>
  );
}

export default SearchableSelect;
