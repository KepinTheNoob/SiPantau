"use client";

import { useId, useMemo, useRef, useState } from "react";

export type AgencyOption = {
  readonly slug: string;
  readonly name: string;
  readonly region: string;
};

function normalize(text: string): string {
  return text.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Pilihan instansi yang bisa dicari (pola combobox WAI-ARIA).
 * Nilai terpilih dikirim lewat input tersembunyi `name` sebagai slug instansi.
 */
export function AgencyCombobox({
  agencies,
  name,
  defaultSlug,
  label,
}: {
  readonly agencies: readonly AgencyOption[];
  readonly name: string;
  readonly defaultSlug: string;
  readonly label: string;
}) {
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const initial =
    agencies.find((agency) => agency.slug === defaultSlug) ?? null;

  const [selected, setSelected] = useState<AgencyOption | null>(initial);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());

    // Saat teks masih sama dengan instansi terpilih, tampilkan semua pilihan.
    if (needle === "" || (selected !== null && query === selected.name)) {
      return agencies;
    }

    return agencies.filter((agency) =>
      normalize(`${agency.name} ${agency.region}`).includes(needle)
    );
  }, [agencies, query, selected]);

  // Indeks 0 adalah pilihan "Semua instansi"; instansi mulai dari indeks 1.
  const optionCount = matches.length + 1;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  function open() {
    setIsOpen(true);

    const selectedIndex =
      selected === null
        ? 0
        : matches.findIndex((agency) => agency.slug === selected.slug) + 1;

    setActiveIndex(Math.max(0, selectedIndex));
  }

  function choose(index: number) {
    const agency = index === 0 ? null : (matches[index - 1] ?? null);

    setSelected(agency);
    setQuery(agency?.name ?? "");
    setIsOpen(false);
  }

  // Panah berhenti di ujung daftar (tidak berputar), supaya panah bawah dari hasil
  // terakhir tidak melompat ke "Semua instansi" dan menghapus filter tanpa sengaja.
  function moveActive(nextIndex: number) {
    const clamped = Math.min(Math.max(nextIndex, 0), optionCount - 1);

    setActiveIndex(clamped);
    document
      .getElementById(optionId(clamped))
      ?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        if (isOpen) {
          moveActive(activeIndex + 1);
        } else {
          open();
        }

        break;
      case "ArrowUp":
        event.preventDefault();

        if (isOpen) {
          moveActive(activeIndex - 1);
        } else {
          open();
        }

        break;
      case "Enter":
        if (isOpen) {
          event.preventDefault();
          choose(activeIndex);
        }

        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setQuery(selected?.name ?? "");
        }

        break;
      default:
        break;
    }
  }

  return (
    <div className="relative w-full sm:w-80">
      <label
        htmlFor={`${baseId}-input`}
        className="mb-1 block font-semibold text-slate-700"
      >
        {label}
      </label>
      <input type="hidden" name={name} value={selected?.slug ?? ""} />
      <div className="relative">
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
          placeholder="Cari nama dinas atau wilayah"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(event.target.value.trim() === "" ? 0 : 1);
          }}
          onFocus={(event) => {
            event.target.select();
            open();
          }}
          onClick={open}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setIsOpen(false);
            setQuery(selected?.name ?? "");
          }}
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-base text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue sm:text-sm"
        />
        {selected !== null && (
          <button
            type="button"
            aria-label="Hapus pilihan instansi"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              choose(0);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-lg text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {[null, ...matches].map((agency, index) => {
            const isActive = index === activeIndex;

            const isSelected =
              agency === null
                ? selected === null
                : selected?.slug === agency.slug;

            return (
              <li
                key={agency?.slug ?? "semua"}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 ${
                  isActive ? "bg-brand-blue-light" : ""
                } ${isSelected ? "font-semibold text-brand-blue" : "text-slate-800"}`}
              >
                {agency === null ? (
                  "Semua instansi"
                ) : (
                  <>
                    <span>{agency.name}</span>
                    <span className="text-xs font-normal text-slate-600">
                      {agency.region}
                    </span>
                  </>
                )}
              </li>
            );
          })}
          {matches.length === 0 && (
            <li
              role="presentation"
              className="px-3 py-3 text-sm text-slate-600"
            >
              Instansi tidak ditemukan untuk &quot;{query}&quot;.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
