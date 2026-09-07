import type { KeyboardEvent } from "react";
export function Tabs({
  id,
  labels,
  selected,
  onSelect,
  label,
}: {
  id: string;
  labels: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % labels.length
        : event.key === "ArrowLeft"
          ? (index + labels.length - 1) % labels.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? labels.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    onSelect(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {labels.map((text, i) => (
        <button
          key={text}
          type="button"
          role="tab"
          id={`${id}-tab-${i}`}
          aria-selected={selected === i}
          aria-controls={`${id}-panel`}
          tabIndex={selected === i ? 0 : -1}
          onClick={() => onSelect(i)}
          onKeyDown={(event) => navigate(event, i)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
