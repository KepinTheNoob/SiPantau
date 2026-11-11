"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  OTHER_PROJECT_CATEGORIES,
  ROAD_CATEGORIES,
  ROAD_CATEGORY_HINTS,
  isKnownProjectCategory,
} from "@/lib/project-categories";

type CategoryOption = {
  readonly value: string;
  readonly description?: string;
};

const categoryGroups: readonly {
  readonly label: string;
  readonly options: readonly CategoryOption[];
}[] = [
  {
    label: "PantauSekitar · tampil di peta proyek jalan",
    options: ROAD_CATEGORIES.map((category) => ({
      value: category,
      description: ROAD_CATEGORY_HINTS[category],
    })),
  },
  {
    label: "Kategori lain",
    options: OTHER_PROJECT_CATEGORIES.map((category) => ({
      value: category,
    })),
  },
];

/** Pilihan kategori proyek untuk form admin (buat dan ubah proyek). */
export function ProjectCategorySelect({
  defaultValue,
  className,
}: {
  readonly defaultValue?: string;
  readonly className: string;
}) {
  const legacyCategory =
    defaultValue !== undefined &&
    defaultValue !== "" &&
    !isKnownProjectCategory(defaultValue)
      ? defaultValue
      : null;

  const options = useMemo(
    () => [
      ...categoryGroups.flatMap((group) => group.options),
      ...(legacyCategory === null
        ? []
        : [{ value: legacyCategory, description: "Kategori lama" }]),
    ],
    [legacyCategory]
  );

  const [value, setValue] = useState(defaultValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = options.findIndex((option) => option.value === value);
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const chooseOption = (nextValue: string) => {
    setValue(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();

      return;
    }

    if (
      !isOpen ||
      !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();

    const currentIndex = optionRefs.current.findIndex(
      (option) => option === document.activeElement
    );

    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (currentIndex +
              (event.key === "ArrowDown" ? 1 : -1) +
              options.length) %
            options.length;

    optionRefs.current[nextIndex]?.focus();
  };

  const selectedLabel = options.find((option) => option.value === value)?.value;

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <select
        name="category"
        required
        value={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => setValue(event.currentTarget.value)}
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        className="pointer-events-none absolute h-px w-px opacity-0"
      >
        <option value="">Pilih Kategori</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>

      <button
        id="category"
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="project-category-options"
        onClick={() => setIsOpen((open) => !open)}
        className={`${className} flex items-center justify-between gap-3 text-left transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20`}
      >
        <span className={selectedLabel ? "text-slate-900" : "text-slate-500"}>
          {selectedLabel ?? "Pilih Kategori"}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          id="project-category-options"
          role="listbox"
          aria-label="Kategori proyek"
          className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-900/5"
        >
          {categoryGroups.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              {group.options.map((option) => {
                const index = options.findIndex(
                  (item) => item.value === option.value
                );

                const isSelected = value === option.value;

                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => chooseOption(option.value)}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "bg-brand-blue-light text-brand-blue-hover"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        {option.value}
                      </span>
                      {option.description && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="mt-0.5 h-5 w-5 shrink-0"
                      >
                        <path
                          d="m5 10 3.5 3.5L15 7"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {legacyCategory !== null && (
            <div className="border-t border-slate-100 pt-2">
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Kategori lama
              </p>
              <button
                ref={(element) => {
                  optionRefs.current[options.length - 1] = element;
                }}
                type="button"
                role="option"
                aria-selected={value === legacyCategory}
                onClick={() => chooseOption(legacyCategory)}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {legacyCategory}{" "}
                <span className="font-normal text-slate-500">
                  (pilih kategori baru)
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
