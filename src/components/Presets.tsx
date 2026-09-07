import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { PRESETS } from "../domain/cron/presets";
export function Presets({
  onSelect,
  onClose,
}: {
  onSelect: (expression: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = PRESETS.filter((p) =>
    p.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    search.current?.focus();
    return () => {
      element?.close();
      queueMicrotask(() => previous?.focus());
    };
  }, []);
  useEffect(() => {
    document
      .getElementById(`preset-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const choose = (index: number) => {
    if (results[index]) {
      onSelect(results[index][2]);
      onClose();
    }
  };
  return (
    <dialog
      ref={dialog}
      className="preset-dialog"
      aria-labelledby="presets-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="presets-title">Start with a preset</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close presets"
        >
          <X size={20} />
        </button>
      </div>
      <div className="search-box">
        <Search size={18} />
        <input
          ref={search}
          type="search"
          aria-label="Search presets"
          aria-controls="preset-results"
          aria-activedescendant={
            results.length ? `preset-${active}` : undefined
          }
          role="combobox"
          aria-expanded="true"
          autoComplete="off"
          placeholder="Search schedules, categories, or cron…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              dialog.current?.close();
              onClose();
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) =>
                results.length
                  ? (i + (event.key === "ArrowDown" ? 1 : results.length - 1)) %
                    results.length
                  : 0,
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              choose(active);
            }
          }}
        />
      </div>
      <div
        id="preset-results"
        role="listbox"
        aria-label="Matching schedules"
        className="preset-results"
      >
        {results.map(([category, name, expression], i) => (
          <div
            key={expression}
            role="option"
            id={`preset-${i}`}
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
          >
            <span>
              <small>{category}</small>
              <strong>{name}</strong>
            </span>
            <code>{expression}</code>
          </div>
        ))}
      </div>
      {!results.length && (
        <p className="empty-state" role="status">
          No schedules found. Try “daily” or “business”.
        </p>
      )}
      <p className="dialog-help">
        ↑ ↓ to explore · Enter to apply · Esc to close
      </p>
    </dialog>
  );
}
